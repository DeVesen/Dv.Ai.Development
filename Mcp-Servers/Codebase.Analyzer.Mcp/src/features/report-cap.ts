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
