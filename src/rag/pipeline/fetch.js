import { assertTrustedUrl } from "../sources.js";

export async function fetchTrustedHtml(url, { source, timeoutMs = 15000 } = {}) {
  assertTrustedUrl(url, source);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MedExplainAI-RAG-Crawler/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) throw new Error(`Unsupported content type for ${url}: ${contentType}`);

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}
