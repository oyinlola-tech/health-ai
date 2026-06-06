import path from "node:path";
import { allowedCategories, maxDatasetBytes, readJson, reportsRoot, searchRoot, writeJson } from "./common.js";

const approvedRefs = new Set([
  "vizeno/complete-blood-count-cbc-dataset",
  "uciml/pima-indians-diabetes-database",
  "mansoordaku/ckdisease",
  "uciml/indian-liver-patient-records",
  "johnsmith88/heart-disease-dataset",
  "emmanuelfwerr/thyroid-disease-data"
]);

function metadataText(candidate) {
  const metadata = candidate.metadata || {};
  return [candidate.ref, candidate.title, candidate.subtitle, candidate.description, metadata.title, metadata.subtitle, metadata.description, metadata.datasetName].filter(Boolean).join(" ").toLowerCase();
}

function rejectionReasons(candidate, rules) {
  const text = metadataText(candidate);
  const reasons = [];
  const totalBytes = Number(candidate.metadata?.totalBytes || candidate.totalBytes || 0);
  if (!candidate.ref) reasons.push("missing Kaggle ref");
  if (totalBytes > maxDatasetBytes) reasons.push("dataset exceeds 1GB preferred size");
  if (candidate.metadata?.metadataError) reasons.push("metadata unavailable");
  if (!rules.positive.some((term) => text.includes(term.toLowerCase()))) reasons.push("insufficient medical/category relevance");
  if (rules.negative.some((term) => text.includes(term.toLowerCase()))) reasons.push("safety keyword matched");
  if (/image|jpg|jpeg|png|dicom|xray|mri|ct scan/.test(text)) reasons.push("image or scan dataset signal");
  if (/survey|questionnaire|insurance|fitness tracker|twitter|reddit/.test(text)) reasons.push("non-clinical survey/social dataset signal");
  return reasons;
}

function chooseCandidate(category, candidates) {
  const rules = allowedCategories[category];
  const evaluated = candidates.map((candidate) => {
    const reasons = rejectionReasons(candidate, rules);
    const approvedByRef = approvedRefs.has(candidate.ref);
    return {
      ...candidate,
      approved: reasons.length === 0 && (candidate.score > 0 || approvedByRef),
      approvedByRef,
      rejectionReasons: reasons
    };
  });
  return evaluated.find((candidate) => candidate.approvedByRef && candidate.approved) || evaluated.find((candidate) => candidate.approved) || evaluated[0];
}

async function main() {
  const searchReport = await readJson(path.join(searchRoot, "search-results.json"));
  if (!searchReport?.categories?.length) throw new Error("Run npm run kaggle:pipeline:search before selecting datasets.");

  const selected = [];
  const rejected = [];
  for (const categoryReport of searchReport.categories) {
    if (!allowedCategories[categoryReport.category]) {
      rejected.push(...categoryReport.candidates.map((candidate) => ({ ...candidate, rejectionReasons: ["category not allowed"] })));
      continue;
    }
    const chosen = chooseCandidate(categoryReport.category, categoryReport.candidates || []);
    for (const candidate of categoryReport.candidates || []) {
      if (candidate.ref !== chosen?.ref) rejected.push({ ref: candidate.ref, category: categoryReport.category, score: candidate.score, rejectionReasons: ["not highest approved candidate"] });
    }
    if (!chosen?.approved) {
      rejected.push({ ref: chosen?.ref, category: categoryReport.category, score: chosen?.score, rejectionReasons: chosen?.rejectionReasons || ["no approved candidate"] });
      continue;
    }
    selected.push({
      category: categoryReport.category,
      categoryLabel: categoryReport.label,
      ref: chosen.ref,
      title: chosen.metadata?.title || chosen.title || chosen.ref,
      author: chosen.metadata?.ownerName || chosen.metadata?.creatorName || chosen.ownerName || chosen.ownerRef || null,
      url: chosen.metadata?.url || `https://www.kaggle.com/datasets/${chosen.ref}`,
      license: chosen.metadata?.licenseName || chosen.metadata?.license || null,
      totalBytes: Number(chosen.metadata?.totalBytes || chosen.totalBytes || 0),
      purpose: categoryReport.label,
      score: chosen.score,
      requiredLabs: allowedCategories[categoryReport.category].requiredLabs
    });
  }

  const report = { generatedAt: new Date().toISOString(), allowedCategories: Object.keys(allowedCategories), selected, rejected };
  await writeJson(path.join(searchRoot, "selection-report.json"), report);
  await writeJson(path.join(reportsRoot, "selection-report.json"), report);
  console.log(`Controlled Kaggle selection approved ${selected.length} datasets.`);
}

main().catch((error) => {
  console.error(`Controlled Kaggle selection failed: ${error.message}`);
  process.exit(1);
});
