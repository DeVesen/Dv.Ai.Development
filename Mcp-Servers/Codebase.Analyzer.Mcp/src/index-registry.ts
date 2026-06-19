// index-registry.ts — Registry of indexed projects with disk persistence (REQ-F02).
// Populated by index_project / index_solution calls; read by index_status.
// Persisted to LOCALAPPDATA\codebase-analyzer\index-registry.json on each write.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import * as os from "os";

export type IndexType = "angular" | "dotnet";

export interface IndexRegistryEntry {
  projectPath: string;
  type: IndexType;
  indexedAt: string;  // ISO-8601
  symbolCount: number;
}

const registry = new Map<string, IndexRegistryEntry>();

function getRegistryFilePath(): string {
  const baseDir = process.env["LOCALAPPDATA"] ?? os.homedir();
  return join(baseDir, "codebase-analyzer", "index-registry.json");
}

function loadFromDisk(): void {
  try {
    const filePath = getRegistryFilePath();
    if (!existsSync(filePath)) return;
    const raw = readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const e of parsed as IndexRegistryEntry[]) {
      if (e?.projectPath) registry.set(e.projectPath, e);
    }
  } catch {
    // Silent — stale or corrupt registry file, start fresh
  }
}

function saveToDisk(): void {
  try {
    const filePath = getRegistryFilePath();
    mkdirSync(dirname(filePath), { recursive: true });
    const entries = Array.from(registry.values());
    writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
  } catch {
    // Silent — disk write failure is non-fatal, in-memory registry still works
  }
}

// Load persisted registry on module initialisation
loadFromDisk();

export function registerIndex(entry: IndexRegistryEntry): void {
  registry.set(entry.projectPath, entry);
  saveToDisk();
}

export function getAllRegistryEntries(): IndexRegistryEntry[] {
  return Array.from(registry.values());
}

export function getRegistryEntry(projectPath: string): IndexRegistryEntry | undefined {
  return registry.get(projectPath);
}
