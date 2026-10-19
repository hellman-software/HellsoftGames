/** Only public repositories with an OSI-approved license expose source details. */
export function licensingOf(sync) {
  const license = sync?.license;
  if (sync?.isPrivate !== false || !license?.osiApproved) return null;
  return { licenseLabel: license.spdxId ?? license.name, licenseUrl: license.url ?? null };
}
