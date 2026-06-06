import path from "node:path";
import { allowedCategories, datasetMetadata, ensurePipelineDirs, kaggleCredentials, reportsRoot, searchDatasets, searchRoot, writeJson } from "./common.js";

function datasetText(dataset) {
  return [dataset.ref, dataset.title, dataset.subtitle, dataset.description, dataset.tags?.join(" ")].filter(Boolean).join(" ").toLowerCase();
}

function rankResult(dataset, categoryRules, query) {
  const text = datasetText(dataset);
  let score = 0;
  for (const term of categoryRules.positive) {
    if (text.includes(term.toLowerCase())) score += 8;
  }
  for (const term of categoryRules.negative) {
    if (text.includes(term.toLowerCase())) score -= 15;
  }
  for (const term of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    if (text.includes(term)) score += 1;
  }
  if (/clinical|medical|csv|laboratory|disease|test/.test(text)) score += 4;
  if (Number(dataset.totalBytes || 0) > 0 && Number(dataset.totalBytes || 0) < 1024 * 1024 * 1024) score += 6;
  if (/image|jpg|png|xray|scan|mri|ct/.test(text)) score -= 25;
  return score;
}

async function main() {
  await ensurePipelineDirs();
  const credentials = await kaggleCredentials();
  const categories = [];

  for (const [category, rules] of Object.entries(allowedCategories)) {
    const byRef = new Map();
    for (const query of rules.queries) {
      const results = await searchDatasets(query, credentials);
      for (const result of results) {
        const ref = result.ref || `${result.ownerRef}/${result.datasetSlug}`;
        if (!ref || byRef.has(ref)) continue;
        byRef.set(ref, { ...result, ref, query, category, score: rankResult(result, rules, query) });
      }
    }
    for (const ref of rules.curatedRefs || []) {
      if (!byRef.has(ref)) byRef.set(ref, { ref, title: ref, query: "curated-seed-after-search", category, score: 50, curatedSeed: true });
    }
    const ranked = [...byRef.values()].sort((left, right) => right.score - left.score).slice(0, 10);
    const withMetadata = [];
    for (const candidate of ranked.slice(0, 5)) {
      const metadata = await datasetMetadata(candidate.ref, credentials).catch((error) => ({ metadataError: error.message }));
      withMetadata.push({ ...candidate, metadata });
    }
    categories.push({ category, label: rules.label, queries: rules.queries, candidates: withMetadata });
  }

  const report = { generatedAt: new Date().toISOString(), categories };
  await writeJson(path.join(searchRoot, "search-results.json"), report);
  await writeJson(path.join(reportsRoot, "search-results.json"), report);
  console.log(`Controlled Kaggle search completed for ${categories.length} categories.`);
}

main().catch((error) => {
  console.error(`Controlled Kaggle search failed: ${error.message}`);
  process.exit(1);
});
