import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full;
    })
  );
  return files.flat();
}

const publicRoot = path.resolve("public");
const renameMap = new Map([
  ["public/profile/overwiew.html", "public/profile/overview.html"],
  ["public/profile/prefrence.html", "public/profile/preference.html"],
  ["public/report/detailled-report.html", "public/report/detailed-report.html"]
]);

for (const [from, to] of renameMap) {
  try {
    await rename(path.resolve(from), path.resolve(to));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const htmlFiles = (await walk(publicRoot)).filter((file) => file.endsWith(".html"));
const jsFiles = (await walk(publicRoot)).filter((file) => file.endsWith(".js"));
const brandReplacements = [
  [/HealthAI/g, "MedExplain AI"],
  [/ClarityHealth/g, "MedExplain AI"],
  [/Aegis Health/g, "MedExplain AI"],
  [/detailled-report\.html/g, "detailed-report.html"],
  [/overwiew\.html/g, "overview.html"],
  [/prefrence\.html/g, "preference.html"]
];

const sharedHead = [
  '<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">',
  '<link rel="manifest" href="/assets/brand/site.webmanifest">',
  '<link rel="stylesheet" href="/assets/css/app.css">'
].join("\n");

const sharedScript = '<script type="module" src="/assets/js/page.js"></script>';

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  for (const [pattern, replacement] of brandReplacements) {
    html = html.replace(pattern, replacement);
  }
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^>]+>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^>]+>/g, (match) => match.split(/\s*<link /)[0]);
  if (!html.includes("/assets/brand/favicon.svg")) {
    html = html.replace("</head>", `${sharedHead}\n</head>`);
  }
  if (!html.includes("/assets/js/page.js")) {
    html = html.replace("</body>", `${sharedScript}\n</body>`);
  }
  await writeFile(file, html);
}

for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  if (source.trim().length > 0) continue;

  const moduleName = path.basename(file);
  const replacement =
    moduleName === "api.js"
      ? 'export { apiRequest } from "../../assets/js/http.js";\n'
      : 'export { bootPage } from "../../assets/js/page.js";\n';
  await writeFile(file, replacement);
}
