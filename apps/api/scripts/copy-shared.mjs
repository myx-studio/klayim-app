#!/usr/bin/env node

import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, "..");
const sharedDir = join(apiDir, "shared");
const sharedPkgDir = join(apiDir, "..", "..", "packages", "shared");

// Clean and create shared directory
rmSync(sharedDir, { recursive: true, force: true });
mkdirSync(sharedDir, { recursive: true });

// Copy dist contents
cpSync(join(sharedPkgDir, "dist"), sharedDir, { recursive: true });

// Read and modify package.json
const pkg = JSON.parse(readFileSync(join(sharedPkgDir, "package.json"), "utf-8"));

// Update paths to remove ./dist/ prefix
pkg.main = "./index.js";
pkg.types = "./index.d.ts";

Object.keys(pkg.exports).forEach((key) => {
  const exp = pkg.exports[key];
  if (exp.types) exp.types = exp.types.replace("./dist/", "./");
  if (exp.import) exp.import = exp.import.replace("./dist/", "./");
  if (exp.default) exp.default = exp.default.replace("./dist/", "./");
});

// Write modified package.json for shared
writeFileSync(join(sharedDir, "package.json"), JSON.stringify(pkg, null, 2));

// Update API's package.json to use local shared folder
const apiPkgPath = join(apiDir, "package.json");
const apiPkg = JSON.parse(readFileSync(apiPkgPath, "utf-8"));
apiPkg.dependencies["@klayim/shared"] = "file:./shared";
writeFileSync(apiPkgPath, JSON.stringify(apiPkg, null, 2));

console.log("Shared package copied and API package.json updated!");
