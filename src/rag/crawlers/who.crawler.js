import { crawlTrustedPage, crawlTrustedPages } from "./base.crawler.js";

export const whoCrawler = {
  source: "who",
  crawlPage: (url) => crawlTrustedPage(url, "who"),
  crawlPages: (urls) => crawlTrustedPages(urls, "who")
};
