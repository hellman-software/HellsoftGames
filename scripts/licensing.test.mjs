import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licensingOf } from '../src/lib/licensing.mjs';

const license = { spdxId: 'MIT', name: 'MIT License', osiApproved: true, url: 'https://github.com/me/game/blob/main/LICENSE' };

test('public OSI-approved code exposes its license', () => {
  assert.deepEqual(licensingOf({ isPrivate: false, license }), {
    licenseLabel: 'MIT', licenseUrl: license.url,
  });
});

test('private repositories expose no source or license details, even if licensed', () => {
  assert.equal(licensingOf({ isPrivate: true, license }), null);
  assert.equal(licensingOf({ isPrivate: true, license: null }), null);
});

test('public repositories without a license expose no source or license details', () => {
  assert.equal(licensingOf({ isPrivate: false, license: null }), null);
});

test('non-OSI and custom licenses expose no source or license details', () => {
  assert.equal(licensingOf({ isPrivate: false, license: { ...license, osiApproved: false } }), null);
  assert.equal(licensingOf({ isPrivate: false, license: { ...license, spdxId: null, osiApproved: false } }), null);
});

test('missing and older snapshots expose no source or license details', () => {
  assert.equal(licensingOf(undefined), null);
  assert.equal(licensingOf({ isPrivate: false }), null);
});

test('open-source games still show their license if the license-file URL is unavailable', () => {
  assert.deepEqual(licensingOf({ isPrivate: false, license: { ...license, url: null } }), {
    licenseLabel: 'MIT', licenseUrl: null,
  });
});
