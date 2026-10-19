#!/usr/bin/env node
/**
 * Refresh the `sync:` block of every game in src/data/games.yaml from GitHub
 * using the `gh` CLI (must be authenticated with access to the private repos).
 *
 * Only the `sync:` map is ever written; every hand-written field, comment and
 * key order is preserved by editing the YAML document in place.
 *
 *   node scripts/sync-games.mjs            # update the file
 *   node scripts/sync-games.mjs --dry-run  # print what would change
 *   node scripts/sync-games.mjs --only fimbulvetr
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import spdxLicenses from 'spdx-license-list';

export const DATA_FILE = new URL('../src/data/games.yaml', import.meta.url);

export class GhError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Call `gh api <path>` and parse JSON. Throws GhError with HTTP status when known. */
export function ghApi(path, { exec = execFileSync } = {}) {
  try {
    const out = exec('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (err) {
    const stderr = String(err.stderr ?? err.message ?? '');
    const m = stderr.match(/HTTP (\d{3})/);
    throw new GhError(stderr.trim() || 'gh api failed', m ? Number(m[1]) : undefined);
  }
}

function notFound(err) {
  return err instanceof GhError && err.status === 404;
}

/** Pick the best "version" for a repo: release > tag > package.json version > null. */
export function pickRelease({ release, tags, pkgVersion }) {
  if (release?.tag_name) {
    return {
      tag: release.tag_name,
      name: release.name && release.name !== release.tag_name ? release.name : null,
      publishedAt: release.published_at ?? null,
      source: 'release',
    };
  }
  if (tags?.[0]?.name) {
    return { tag: tags[0].name, name: null, publishedAt: null, source: 'tag' };
  }
  if (pkgVersion && pkgVersion !== '0.0.0') {
    return { tag: pkgVersion.startsWith('v') ? pkgVersion : `v${pkgVersion}`, name: null, publishedAt: null, source: 'package' };
  }
  return null;
}

/** Keep visibility separate from licensing: public source is not necessarily open source. */
export function pickLicense(license, url = null) {
  if (!license) return null;
  const spdxId = license.spdx_id && license.spdx_id !== 'NOASSERTION' ? license.spdx_id : null;
  return {
    spdxId,
    name: spdxId ? license.name : 'Other license',
    url,
    osiApproved: spdxId ? spdxLicenses[spdxId]?.osiApproved === true : false,
  };
}

/** Fetch everything the sync block needs for one repo. */
export function fetchRepoState(owner, name, api = ghApi) {
  const repo = api(`repos/${owner}/${name}`);

  let license = null;
  if (repo.license) {
    try {
      const file = api(`repos/${owner}/${name}/license`);
      license = pickLicense(file.license, file.html_url ?? null);
    } catch (err) {
      if (!notFound(err)) throw err;
      license = pickLicense(repo.license);
    }
  }

  let release = null;
  try {
    release = api(`repos/${owner}/${name}/releases/latest`);
  } catch (err) {
    if (!notFound(err)) throw err;
  }

  let tags = null;
  if (!release) {
    tags = api(`repos/${owner}/${name}/tags?per_page=1`);
  }

  let pkgVersion = null;
  if (!release && !(tags?.length > 0)) {
    try {
      const pkg = api(`repos/${owner}/${name}/contents/package.json`);
      const json = JSON.parse(Buffer.from(pkg.content ?? '', 'base64').toString('utf8'));
      pkgVersion = typeof json.version === 'string' ? json.version : null;
    } catch (err) {
      if (!notFound(err) && !(err instanceof SyntaxError)) throw err;
    }
  }

  return {
    isPrivate: Boolean(repo.private),
    license,
    description: repo.description ?? null,
    pushedAt: repo.pushed_at ?? null,
    release: pickRelease({ release, tags, pkgVersion }),
    syncedAt: new Date().toISOString().slice(0, 10),
  };
}

/** Replace the `sync` map of the game with the given id. Returns the previous value. */
export function mergeSync(doc, id, sync) {
  const items = doc.contents?.items ?? [];
  const item = items.find((node) => node.get('id') === id);
  if (!item) throw new Error(`No game with id "${id}"`);
  const previous = item.has('sync') ? item.get('sync', true).toJSON() : null;
  const ordered = {
    isPrivate: sync.isPrivate,
    license: sync.license,
    description: sync.description,
    pushedAt: sync.pushedAt,
    release: sync.release
      ? { tag: sync.release.tag, name: sync.release.name, publishedAt: sync.release.publishedAt, source: sync.release.source }
      : null,
    syncedAt: sync.syncedAt,
  };
  item.set('sync', doc.createNode(ordered));
  return previous;
}

export function serialize(doc) {
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false });
}

function sameExceptSyncedAt(a, b) {
  if (!a || !b) return false;
  const strip = (o) => JSON.stringify({ ...o, syncedAt: undefined });
  return strip(a) === strip(b);
}

export function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

  const text = readFileSync(DATA_FILE, 'utf8');
  const doc = YAML.parseDocument(text);
  const items = doc.contents?.items ?? [];
  let failed = false;
  let changed = 0;

  const targets = items.filter((node) => !only || node.get('id') === only);
  if (only && targets.length === 0) {
    console.error(`No game with id "${only}" in games.yaml`);
    return 1;
  }

  for (const node of targets) {
    const id = node.get('id');
    const repo = node.get('repo');
    const owner = repo?.get('owner');
    const name = repo?.get('name');
    if (!owner || !name) {
      console.warn(`! ${id}: missing repo.owner/repo.name, skipped`);
      continue;
    }
    try {
      const next = fetchRepoState(owner, name);
      const previous = node.has('sync') ? node.get('sync', true).toJSON() : null;
      if (sameExceptSyncedAt(previous, next)) {
        console.log(`= ${id}: unchanged`);
        continue;
      }
      changed++;
      if (dryRun) {
        console.log(`~ ${id}: would update\n  before: ${JSON.stringify(previous)}\n  after:  ${JSON.stringify(next)}`);
      } else {
        mergeSync(doc, id, next);
        console.log(`~ ${id}: updated (${next.release?.tag ?? 'no version'}, pushed ${next.pushedAt ?? '?'})`);
      }
    } catch (err) {
      failed = true;
      console.warn(`! ${id}: ${err.message.split('\n')[0]} (kept existing sync block)`);
    }
  }

  if (!dryRun && changed > 0) {
    writeFileSync(DATA_FILE, serialize(doc));
    console.log(`Wrote ${changed} update(s) to games.yaml`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main();
}
