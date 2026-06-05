import { reportRepository } from "../repositories/reportRepository.js";
import { reportAnalysisPipeline } from "../modules/report-processing/reportAnalysisPipeline.js";
import { errors } from "../utils/errors.js";

export const reportService = {
  async createReport({ user, file, title }) {
    if (!file) throw errors.badRequest("A report file is required.");
    const reportTitle = title || file.originalname.replace(/\.[^.]+$/, "");
    const report = await reportRepository.create({
      patientId: user.role === "Patient" ? user.id : user.id,
      uploadedBy: user.id,
      title: reportTitle,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size
    });

    return reportAnalysisPipeline.extractAndPersist({ report, reportRepository });
  },

  async listReports(user) {
    return reportRepository.listForUser(user);
  },

  async getReportForUser(id, user) {
    const report = await reportRepository.findById(id);
    if (!report) throw errors.notFound("Report not found.");
    if (user.role !== "Admin" && user.role !== "Doctor" && report.patient_id !== user.id) {
      throw errors.forbidden("You can only access your own reports.");
    }
    return report;
  },

  async deleteReport(id, user) {
    const report = await this.getReportForUser(id, user);
    await reportRepository.softDelete(report.id);
    return { deleted: true };
  }
};
