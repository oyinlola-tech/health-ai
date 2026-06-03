import { crawlTrustedPage, crawlTrustedPages } from "./base.crawler.js";

export const nihCrawler = {
  source: "nih",
  crawlPage: (url) => crawlTrustedPage(url, "nih"),
  crawlPages: (urls) => crawlTrustedPages(urls, "nih")
};
