#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, "..");
const apiPkgPath = join(apiDir, "package.json");

// Read API's package.json
const apiPkg = JSON.parse(readFileSync(apiPkgPath, "utf-8"));

// Revert to workspace:* if it was changed to file:./shared
if (apiPkg.dependencies["@klayim/shared"] === "file:./shared") {
  apiPkg.dependencies["@klayim/shared"] = "workspace:*";
  writeFileSync(apiPkgPath, JSON.stringify(apiPkg, null, 2) + "\n");
  console.log("Reverted @klayim/shared to workspace:*");
} else {
  console.log("@klayim/shared already using workspace:*");
}
