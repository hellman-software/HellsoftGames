import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licensingOf } from '../src/lib/licensing.mjs';

const license = { spdxId: 'MIT', name: 'MIT License', osiApproved: true, url: 'https://github.com/me/game/blob/main/LICENSE' };

test('public OSI-approved code is open source and links to its license', () => {
  assert.deepEqual(licensingOf({ isPrivate: false, license }), {
    status: 'Open source', licenseLabel: 'MIT', licenseUrl: license.url,
  });
});

test('a private repository stays closed source and never exposes its license link', () => {
  assert.deepEqual(licensingOf({ isPrivate: true, license }), {
    status: 'Closed source', licenseLabel: 'MIT', licenseUrl: null,
  });
});

test('public source without a license is not labelled open source', () => {
  assert.deepEqual(licensingOf({ isPrivate: false, license: null }), {
    status: 'Source available', licenseLabel: 'No license detected', licenseUrl: null,
  });
});

test('non-OSI and custom licenses stay source available', () => {
  assert.equal(licensingOf({ isPrivate: false, license: { ...license, osiApproved: false } }).status, 'Source available');
  assert.deepEqual(licensingOf({ isPrivate: false, license: { ...license, spdxId: null, name: 'Other license', osiApproved: false } }), {
    status: 'Source available', licenseLabel: 'Other license', licenseUrl: license.url,
  });
});

test('missing and older snapshots are explicitly unknown', () => {
  assert.deepEqual(licensingOf(undefined), {
    status: 'Source status unknown', licenseLabel: 'License unknown', licenseUrl: null,
  });
  assert.equal(licensingOf({ isPrivate: false }).licenseLabel, 'License unknown');
});
