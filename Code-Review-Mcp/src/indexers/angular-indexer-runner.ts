import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { indexAngularProject, AngularProjectIndex } from "./angular-indexer.js";

const CACHE_FILENAME = ".code-review-index-angular.json";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function indexAngularProjectCached(rootPath: string, useCache = true): AngularProjectIndex {
  const cacheFile = join(rootPath, CACHE_FILENAME);

  if (useCache && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf-8")) as AngularProjectIndex;
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < CACHE_TTL_MS) return cached;
    } catch {}
  }

  const index = indexAngularProject(rootPath);

  try { writeFileSync(cacheFile, JSON.stringify(index, null, 2)); } catch {}

  return index;
}

export { AngularProjectIndex } from "./angular-indexer.js";
