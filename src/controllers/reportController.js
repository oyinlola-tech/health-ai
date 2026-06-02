import { reportService } from "../services/reportService.js";
import { aiService } from "../services/aiService.js";
import { sendSuccess } from "../utils/response.js";

export const reportController = {
  async create(req, res) {
    const report = await reportService.createReport({
      user: req.user,
      file: req.file,
      title: req.body.title
    });
    return sendSuccess(res, { report }, {}, 201);
  },

  async list(req, res) {
    return sendSuccess(res, { reports: await reportService.listReports(req.user) });
  },

  async detail(req, res) {
    return sendSuccess(res, { report: await reportService.getReportForUser(req.params.id, req.user) });
  },

  async analyze(req, res) {
    return sendSuccess(res, { report: await aiService.analyzeReport({ reportId: req.params.id, user: req.user }) });
  },

  async remove(req, res) {
    return sendSuccess(res, await reportService.deleteReport(req.params.id, req.user));
  }
};
