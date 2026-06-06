import { readdir, readFile } from "node:fs/promises";
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

const root = path.resolve("public");
const htmlFiles = (await walk(root)).filter((file) => file.endsWith(".html") && !file.includes(`${path.sep}components${path.sep}`));
const jsFiles = (await walk(root)).filter((file) => file.endsWith(".js"));

const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!html.includes("<title>")) failures.push(`${file}: missing title`);
  if (!html.includes("/assets/brand/favicon.svg")) failures.push(`${file}: missing shared favicon`);
  if (!html.includes("/assets/css/app.css")) failures.push(`${file}: missing shared stylesheet`);
}

for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  if (source.trim().length === 0) failures.push(`${file}: empty JavaScript file`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Frontend smoke passed for ${htmlFiles.length} HTML files and ${jsFiles.length} JS files.`);
