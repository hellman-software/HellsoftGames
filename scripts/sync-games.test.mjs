import { test } from 'node:test';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { GhError, mergeSync, pickRelease, serialize, fetchRepoState, pickLicense } from './sync-games.mjs';

const SAMPLE = `# header comment stays
- id: alpha
  title: Alpha # trailing comment
  order: 10
  description: |
    Two lines
    of text.
  repo: {owner: me, name: alpha}
  tech: [a, b]
  sync:
    isPrivate: true
    description: old
    pushedAt: 2020-01-01T00:00:00Z
    release: null
    syncedAt: 2020-01-02

- id: beta
  title: Beta
  repo: {owner: me, name: beta}
`;

const NEW_SYNC = {
  isPrivate: false,
  license: { spdxId: 'MIT', name: 'MIT License', url: 'https://github.com/me/alpha/blob/main/LICENSE', osiApproved: true },
  description: 'new',
  pushedAt: '2026-10-11T10:00:00Z',
  release: { tag: 'v1.2.0', name: null, publishedAt: '2026-10-10T00:00:00Z', source: 'release' },
  syncedAt: '2026-10-11',
};

function nonSyncLines(text) {
  const out = [];
  let inSync = false;
  for (const line of text.split('\n')) {
    if (/^  sync:/.test(line)) {
      inSync = true;
      continue;
    }
    if (inSync && /^    /.test(line)) continue;
    inSync = false;
    out.push(line);
  }
  return out;
}

test('mergeSync only touches the sync block', () => {
  const doc = YAML.parseDocument(SAMPLE);
  const previous = mergeSync(doc, 'alpha', NEW_SYNC);
  assert.equal(previous.description, 'old');
  const out = serialize(doc);
  assert.deepEqual(nonSyncLines(out), nonSyncLines(SAMPLE));
  const parsed = YAML.parse(out);
  assert.deepEqual(parsed[0].sync, NEW_SYNC);
  assert.equal(parsed[1].sync, undefined);
  assert.match(out, /# header comment stays/);
  assert.match(out, /# trailing comment/);
});

test('mergeSync adds a sync block to a game without one', () => {
  const doc = YAML.parseDocument(SAMPLE);
  const previous = mergeSync(doc, 'beta', NEW_SYNC);
  assert.equal(previous, null);
  assert.deepEqual(YAML.parse(serialize(doc))[1].sync, NEW_SYNC);
});

test('mergeSync rejects unknown ids', () => {
  const doc = YAML.parseDocument(SAMPLE);
  assert.throws(() => mergeSync(doc, 'nope', NEW_SYNC), /No game with id/);
});

test('pickRelease prefers release, then tag, then package version', () => {
  assert.deepEqual(
    pickRelease({ release: { tag_name: 'v2', name: 'Big one', published_at: '2026-01-01T00:00:00Z' }, tags: [{ name: 'v1' }], pkgVersion: '0.1.0' }),
    { tag: 'v2', name: 'Big one', publishedAt: '2026-01-01T00:00:00Z', source: 'release' },
  );
  assert.deepEqual(pickRelease({ release: null, tags: [{ name: 'v1' }], pkgVersion: '0.1.0' }), {
    tag: 'v1',
    name: null,
    publishedAt: null,
    source: 'tag',
  });
  assert.deepEqual(pickRelease({ release: null, tags: [], pkgVersion: '0.1.0' }), {
    tag: 'v0.1.0',
    name: null,
    publishedAt: null,
    source: 'package',
  });
  assert.equal(pickRelease({ release: null, tags: [], pkgVersion: null }), null);
});

test('fetchRepoState falls through 404s and keeps going', () => {
  const api = (path) => {
    if (path === 'repos/me/x') return { private: true, description: null, pushed_at: '2026-10-01T00:00:00Z' };
    if (path.endsWith('/releases/latest')) throw new GhError('gh: Not Found (HTTP 404)', 404);
    if (path.endsWith('/tags?per_page=1')) return [];
    if (path.endsWith('/contents/package.json')) return { content: Buffer.from('{"version":"0.3.0"}').toString('base64') };
    throw new Error('unexpected ' + path);
  };
  const state = fetchRepoState('me', 'x', api);
  assert.equal(state.isPrivate, true);
  assert.equal(state.pushedAt, '2026-10-01T00:00:00Z');
  assert.deepEqual(state.release, { tag: 'v0.3.0', name: null, publishedAt: null, source: 'package' });
  assert.match(state.syncedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test('fetchRepoState propagates non-404 errors', () => {
  const api = (path) => {
    if (path === 'repos/me/x') return { private: false, description: 'd', pushed_at: null };
    throw new GhError('gh: Unauthorized (HTTP 401)', 401);
  };
  assert.throws(() => fetchRepoState('me', 'x', api), /401/);
});

const MIT = { spdx_id: 'MIT', name: 'MIT License' };
const LICENSE_URL = 'https://github.com/me/x/blob/main/LICENSE';

test('pickLicense distinguishes OSI-approved, non-OSI and unrecognised licenses', () => {
  assert.equal(pickLicense(null), null);
  assert.deepEqual(pickLicense(MIT, LICENSE_URL), {
    spdxId: 'MIT', name: 'MIT License', url: LICENSE_URL, osiApproved: true,
  });
  assert.equal(pickLicense({ spdx_id: 'CC-BY-NC-4.0', name: 'Noncommercial' }).osiApproved, false);
  assert.deepEqual(pickLicense({ spdx_id: 'NOASSERTION', name: 'Other' }, LICENSE_URL), {
    spdxId: null, name: 'Other license', url: LICENSE_URL, osiApproved: false,
  });
  assert.equal(pickLicense({ spdx_id: 'Unknown-ID', name: 'Unknown' }).osiApproved, false);
});

function licensedApi(path) {
  if (path === 'repos/me/x') return { private: false, license: MIT };
  if (path.endsWith('/license')) return { license: MIT, html_url: LICENSE_URL };
  if (path.endsWith('/releases/latest')) return { tag_name: 'v1' };
  throw new Error('unexpected ' + path);
}

test('fetchRepoState syncs license identity, approval and the actual license-file URL', () => {
  const state = fetchRepoState('me', 'x', licensedApi);
  assert.deepEqual(state.license, pickLicense(MIT, LICENSE_URL));
});

test('fetchRepoState retains detected license when the license file returns 404', () => {
  const state = fetchRepoState('me', 'x', (path) => {
    if (path.endsWith('/license')) throw new GhError('Not Found', 404);
    return licensedApi(path);
  });
  assert.deepEqual(state.license, pickLicense(MIT));
});

test('fetchRepoState propagates license errors so stale data is preserved', () => {
  assert.throws(() => fetchRepoState('me', 'x', (path) => {
    if (path.endsWith('/license')) throw new GhError('Forbidden', 403);
    return licensedApi(path);
  }), /Forbidden/);
});

test('sync clears a removed license instead of keeping stale license metadata', () => {
  const state = fetchRepoState('me', 'x', (path) => {
    if (path === 'repos/me/x') return { private: false, license: null };
    return licensedApi(path);
  });
  assert.equal(state.license, null);
  const doc = YAML.parseDocument(SAMPLE);
  mergeSync(doc, 'alpha', NEW_SYNC);
  mergeSync(doc, 'alpha', state);
  assert.equal(YAML.parse(serialize(doc))[0].sync.license, null);
});
