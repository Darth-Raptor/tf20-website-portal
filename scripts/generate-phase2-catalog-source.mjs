import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

import {
  loadPhase2ReviewCsvs,
  validatePhase2ReviewCsvs,
} from "../prisma/phase2-review-csv-loader.mjs";
import {
  buildCatalogSource,
  formatCatalogSourceModule,
} from "../prisma/phase2-catalog-source-builder.mjs";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "prisma", "catalog-source.mjs");

const reviewSource = loadPhase2ReviewCsvs({ projectRoot });
validatePhase2ReviewCsvs(reviewSource);

const catalogSource = buildCatalogSource(reviewSource);
const fileContents = await prettier.format(formatCatalogSourceModule(catalogSource), {
  parser: "babel",
  filepath: outputPath,
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
});

fs.writeFileSync(outputPath, fileContents, "utf8");
console.log(
  `Generated ${path.relative(projectRoot, outputPath)} from approved Phase 2 review CSVs.`,
);
