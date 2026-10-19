/** Shared presentation for synced licensing, including older or missing snapshots. */
export function licensingOf(sync) {
  const license = sync?.license;
  const publicRepo = sync?.isPrivate === false;
  const status = !sync
    ? 'Source status unknown'
    : sync.isPrivate
      ? 'Closed source'
      : license?.osiApproved
        ? 'Open source'
        : 'Source available';
  const licenseLabel = license
    ? license.spdxId ?? license.name
    : sync && license === null
      ? 'No license detected'
      : 'License unknown';
  return { status, licenseLabel, licenseUrl: publicRepo ? license?.url ?? null : null };
}
