import { crawlTrustedPage, crawlTrustedPages } from "./base.crawler.js";

export const cdcCrawler = {
  source: "cdc",
  crawlPage: (url) => crawlTrustedPage(url, "cdc"),
  crawlPages: (urls) => crawlTrustedPages(urls, "cdc")
};
