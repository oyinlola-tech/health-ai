import { JSDOM } from "jsdom";

function decodeHtmlEntities(value) {
  return new JSDOM(`<!doctype html><body>${value}</body>`).window.document.body.textContent || "";
}

function parseDocument(html) {
  return new JSDOM(String(html || "")).window.document;
}

function removeNonContent(document) {
  document.querySelectorAll("script, style, noscript, svg, nav, header, footer, aside, form").forEach((node) => node.remove());
}

function normalizedText(node) {
  return String(node?.textContent || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html) {
  const document = parseDocument(html);
  return normalizedText(document.querySelector("title"));
}

export function cleanHtmlDocument({ html, url, source }) {
  const document = parseDocument(html);
  const title = extractTitle(html) || url;
  removeNonContent(document);
  const contentRoot = document.querySelector("main") || document.querySelector("article") || document.body;
  const content = decodeHtmlEntities(normalizedText(contentRoot));

  return { source, title, url, content };
}
