import { describe, expect, it } from "vitest";
import { ocrService } from "../src/modules/report-processing/ocrService.js";

describe("ocrService", () => {
  it("rejects unsupported file types before extraction", async () => {
    await expect(
      ocrService.extractText({
        filePath: "uploads/reports/report.txt",
        mimeType: "text/plain"
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST"
    });
  });
});
