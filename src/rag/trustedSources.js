const trustedSourceHosts = new Set([
  "nih.gov",
  "www.nih.gov",
  "medlineplus.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "who.int",
  "www.who.int"
]);

const trustedSourceNames = ["nih", "medlineplus", "pubmed", "world health organization", "who"];

export function isTrustedMedicalSource({ source = "", url = "" } = {}) {
  const normalizedSource = String(source).toLowerCase();
  if (trustedSourceNames.some((name) => normalizedSource.includes(name))) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return trustedSourceHosts.has(host) || [...trustedSourceHosts].some((trustedHost) => host.endsWith(`.${trustedHost}`));
  } catch {
    return false;
  }
}

export function filterTrustedMedicalSources(chunks = []) {
  return chunks.filter((chunk) => isTrustedMedicalSource(chunk));
}

