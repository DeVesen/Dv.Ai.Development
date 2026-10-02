export function capArrays<T extends object>(
    obj: T,
    topN: number,
    arrayKeys: (keyof T)[]
): T {
    const result: Record<string, unknown> = { ...obj } as Record<string, unknown>;
    for (const key of arrayKeys) {
        const arr = result[key as string];
        if (Array.isArray(arr) && arr.length > topN) {
            result[key as string] = arr.slice(0, topN);
            result[`${String(key)}Truncated`] = true;
            result[`${String(key)}Count`] = arr.length;
        }
    }
    return result as T;
}

export function sortAntiPatternsBySeverity<T extends { severity: string }>(items: T[]): T[] {
    const rank = (sev: string) => sev === "critical" ? 0 : sev === "warning" ? 1 : 2;
    return [...items].sort((a, b) => rank(a.severity) - rank(b.severity));
}

export function sortCoverageGapsByMissingFirst<T extends { testFileExists: boolean }>(items: T[]): T[] {
    return [...items].sort((a, b) => Number(a.testFileExists) - Number(b.testFileExists));
}
