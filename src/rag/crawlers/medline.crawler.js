import { crawlTrustedPage, crawlTrustedPages } from "./base.crawler.js";

export const medlineCrawler = {
  source: "medlineplus",
  crawlPage: (url) => crawlTrustedPage(url, "medlineplus"),
  crawlPages: (urls) => crawlTrustedPages(urls, "medlineplus")
};
