import { cleanHtmlDocument } from "../pipeline/clean.js";
import { fetchTrustedHtml } from "../pipeline/fetch.js";

export async function crawlTrustedPage(url, source) {
  const html = await fetchTrustedHtml(url, { source });
  return cleanHtmlDocument({ html, url, source });
}

export async function crawlTrustedPages(urls, source) {
  return Promise.all(urls.map((url) => crawlTrustedPage(url, source)));
}
