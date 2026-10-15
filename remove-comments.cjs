const fs = require("fs");
const path = require("path");
const strip = require("strip-comments");

const root = process.cwd();

const extensions = new Set([".js", ".jsx", ".css"]);

const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage"
]);

let changed = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(fullPath);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    const original = fs.readFileSync(fullPath, "utf8");
    const cleaned = strip(original);

    if (cleaned !== original) {
      fs.writeFileSync(fullPath, cleaned);
      console.log("Cleaned:", path.relative(root, fullPath));
      changed++;
    }
  }
}

walk(root);
console.log(`\nDone! Cleaned ${changed} file(s).`);
