export const trustedMedicalSources = {
  medlineplus: {
    host: "medlineplus.gov",
    origin: "https://medlineplus.gov"
  },
  nih: {
    host: "www.nih.gov",
    origin: "https://www.nih.gov"
  },
  cdc: {
    host: "www.cdc.gov",
    origin: "https://www.cdc.gov"
  },
  who: {
    host: "www.who.int",
    origin: "https://www.who.int"
  }
};

export function sourceForUrl(url) {
  const parsed = new URL(url);
  return Object.entries(trustedMedicalSources).find(([, source]) => parsed.hostname === source.host)?.[0] || null;
}

export function assertTrustedUrl(url, expectedSource) {
  const source = sourceForUrl(url);
  if (!source || (expectedSource && source !== expectedSource)) {
    throw new Error(`Untrusted medical source URL: ${url}`);
  }
  return source;
}
