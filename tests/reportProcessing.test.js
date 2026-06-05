import { describe, expect, it, vi } from "vitest";
import { classifyLabResult, detectAbnormalResults } from "../src/modules/report-processing/abnormalResultDetector.js";
import { extractMedicalEntities } from "../src/modules/report-processing/entityExtractionService.js";
import { parseLabValues } from "../src/modules/report-processing/labValueParser.js";

describe("medical lab parsing and abnormal detection", () => {
  it("extracts lab values, units, and reference ranges from real report text", () => {
    const text = [
      "Hemoglobin: 10.2 g/dL Reference 13 - 17",
      "Glucose 180 mg/dL range 70-110",
      "Patient name: Example"
    ].join("\n");

    const labs = parseLabValues(text);

    expect(labs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ testName: "Hemoglobin", value: 10.2, unit: "g/dL", referenceMin: 13, referenceMax: 17 }),
        expect.objectContaining({ testName: "Glucose", value: 180, unit: "mg/dL", referenceMin: 70, referenceMax: 110 })
      ])
    );
  });

  it("classifies normal, abnormal, and critical values", () => {
    expect(classifyLabResult({ value: 14, referenceMin: 13, referenceMax: 17 })).toBe("NORMAL");
    expect(classifyLabResult({ value: 10.2, referenceMin: 13, referenceMax: 17 })).toBe("LOW");
    expect(classifyLabResult({ value: 180, referenceMin: 70, referenceMax: 110 })).toBe("CRITICAL_HIGH");
  });

  it("extracts medical entities from extracted report content", () => {
    const labs = detectAbnormalResults(parseLabValues("Hemoglobin: 10.2 g/dL Reference 13 - 17"));
    const entities = extractMedicalEntities("Patient reports fatigue. Possible anemia noted. Hemoglobin low.", labs);

    expect(entities.conditions).toContain("anemia");
    expect(entities.symptoms).toContain("fatigue");
    expect(entities.biomarkers).toContain("Hemoglobin");
    expect(entities.units).toContain("g/dL");
  });
});

vi.mock("../src/modules/report-processing/ocrService.js", () => ({
  ocrService: {
    extractText: vi.fn().mockResolvedValue({
      text: "Hemoglobin: 10.2 g/dL Reference 13 - 17\nGlucose: 90 mg/dL Reference 70 - 110",
      ocrConfidence: 88,
      pageCount: 1,
      method: "test-ocr"
    })
  }
}));

describe("report processing pipeline", () => {
  it("processes extracted content into entities, lab results, flags, and confidence", async () => {
    const { processReportFile } = await import("../src/modules/report-processing/reportProcessor.js");

    const result = await processReportFile({ filePath: "uploads/reports/sample.pdf", mimeType: "application/pdf" });

    expect(result.extractedText).toContain("Hemoglobin");
    expect(result.labResults).toEqual(expect.arrayContaining([expect.objectContaining({ testName: "Hemoglobin", flag: "LOW" })]));
    expect(result.medicalEntities.testNames).toContain("Hemoglobin");
    expect(result.analysisConfidence).toBeGreaterThan(50);
  });

  it("persists extraction failures without throwing raw errors to callers", async () => {
    const { reportAnalysisPipeline } = await import("../src/modules/report-processing/reportAnalysisPipeline.js");
    const { ocrService } = await import("../src/modules/report-processing/ocrService.js");
    ocrService.extractText.mockRejectedValueOnce(new Error("OCR engine crashed with an internal stack"));
    const repo = {
      markExtractionStarted: vi.fn().mockResolvedValue({}),
      saveExtractionResult: vi.fn(),
      saveExtractionFailure: vi.fn().mockResolvedValue({ id: "report-id", extraction_status: "failed" })
    };

    const result = await reportAnalysisPipeline.extractAndPersist({
      report: { id: "report-id", file_path: "uploads/reports/unsupported.txt", mime_type: "text/plain" },
      reportRepository: repo
    });

    expect(result.extraction_status).toBe("failed");
    expect(repo.saveExtractionFailure).toHaveBeenCalledWith("report-id", "Report content could not be extracted reliably.");
  });
});
