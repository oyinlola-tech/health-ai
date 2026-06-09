import { aiDiagnosticsService } from "../services/aiDiagnosticsService.js";
import { sendSuccess } from "../utils/response.js";

export const systemController = {
  async testGemini(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testGeminiSuite());
  },

  async testChatModel(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testChatModel());
  },

  async testReportModel(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testReportModel());
  },

  async testLiveModel(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testLiveModel());
  },

  async testEmbeddingModel(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testEmbeddingModel());
  },

  async testRag(req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testRag(req.query.q));
  },

  async testCache(_req, res) {
    return sendSuccess(res, await aiDiagnosticsService.testCache());
  }
};
