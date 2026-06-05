import { processReportFile } from "./reportProcessor.js";

function extractionErrorMessage(error) {
  if (error?.code === "CONFIGURATION_ERROR") return error.message;
  return "Report content could not be extracted reliably.";
}

export const reportAnalysisPipeline = {
  async extractAndPersist({ report, reportRepository }) {
    await reportRepository.markExtractionStarted(report.id);
    try {
      const result = await processReportFile({
        filePath: report.file_path,
        mimeType: report.mime_type
      });

      if (!result.extractedText) {
        throw new Error("Report content could not be extracted reliably.");
      }

      return reportRepository.saveExtractionResult(report.id, result);
    } catch (error) {
      return reportRepository.saveExtractionFailure(report.id, extractionErrorMessage(error));
    }
  }
};
