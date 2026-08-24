import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capArrays, sortAntiPatternsBySeverity, sortCoverageGapsByMissingFirst } from "./report-cap.js";

describe("capArrays", () => {
    it("Cap_ArrayLaengerAlsTopN_WirdGekuerztMitMarkern", () => {
        const input = { files: [1, 2, 3, 4, 5] };
        const result = capArrays(input, 2, ["files"]);
        assert.deepEqual(result.files, [1, 2]);
        assert.equal((result as any).filesTruncated, true);
        assert.equal((result as any).filesCount, 5);
    });

    it("Cap_ArrayKuerzerAlsTopN_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [1, 2] };
        const result = capArrays(input, 10, ["files"]);
        assert.deepEqual(result.files, [1, 2]);
        assert.equal("filesTruncated" in result, false);
        assert.equal("filesCount" in result, false);
    });

    it("Cap_ArrayGenauTopNLang_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [1, 2, 3] };
        const result = capArrays(input, 3, ["files"]);
        assert.deepEqual(result.files, [1, 2, 3]);
        assert.equal("filesTruncated" in result, false);
    });

    it("Cap_LeeresArray_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [] as number[] };
        const result = capArrays(input, 5, ["files"]);
        assert.deepEqual(result.files, []);
        assert.equal("filesTruncated" in result, false);
    });

    it("Cap_MehrereKeysNurEinerUeberschreitetTopN_NurDieserBekommtMarker", () => {
        const input = { files: [1, 2, 3, 4], hotspots: [1, 2] };
        const result = capArrays(input, 3, ["files", "hotspots"]);
        assert.equal((result as any).filesTruncated, true);
        assert.equal((result as any).filesCount, 4);
        assert.equal("hotspotsTruncated" in result, false);
        assert.deepEqual(result.hotspots, [1, 2]);
    });

    it("Cap_KeyFehltImObjekt_WirftNichtGibtObjektUnveraendertZurueck", () => {
        const input = { files: [1, 2, 3] } as { files: number[]; missingKey?: unknown[] };
        const result = capArrays(input, 1, ["missingKey"]);
        assert.deepEqual(result.files, [1, 2, 3]);
        assert.equal("missingKeyTruncated" in result, false);
    });

    it("Cap_OriginalObjektBleibtUnveraendert_ShallowCopyNichtMutiert", () => {
        const input = { files: [1, 2, 3, 4] };
        capArrays(input, 2, ["files"]);
        assert.deepEqual(input.files, [1, 2, 3, 4]);
    });
});

describe("sortAntiPatternsBySeverity", () => {
    it("Sort_CriticalWarningSuggestionGemischt_CriticalZuerst", () => {
        const input = [
            { severity: "suggestion", id: 1 },
            { severity: "critical", id: 2 },
            { severity: "warning", id: 3 },
        ];
        const result = sortAntiPatternsBySeverity(input);
        assert.deepEqual(result.map((r) => r.id), [2, 3, 1]);
    });

    it("Sort_LeeresArray_GibtLeeresArrayZurueck", () => {
        assert.deepEqual(sortAntiPatternsBySeverity([]), []);
    });

    it("Sort_OriginalArrayBleibtUnveraendert_KeineInPlaceMutation", () => {
        const input = [{ severity: "suggestion", id: 1 }, { severity: "critical", id: 2 }];
        sortAntiPatternsBySeverity(input);
        assert.equal(input[0].severity, "suggestion");
        assert.equal(input[1].severity, "critical");
    });
});

describe("sortCoverageGapsByMissingFirst", () => {
    it("Sort_TestFileExistsGemischt_FalseZuerst", () => {
        const input = [
            { testFileExists: true, id: 1 },
            { testFileExists: false, id: 2 },
            { testFileExists: true, id: 3 },
        ];
        const result = sortCoverageGapsByMissingFirst(input);
        assert.deepEqual(result.map((r) => r.id), [2, 1, 3]);
    });

    it("Sort_LeeresArray_GibtLeeresArrayZurueck", () => {
        assert.deepEqual(sortCoverageGapsByMissingFirst([]), []);
    });

    it("Sort_OriginalArrayBleibtUnveraendert_KeineInPlaceMutation", () => {
        const input = [{ testFileExists: true, id: 1 }, { testFileExists: false, id: 2 }];
        sortCoverageGapsByMissingFirst(input);
        assert.equal(input[0].testFileExists, true);
        assert.equal(input[1].testFileExists, false);
    });
});
