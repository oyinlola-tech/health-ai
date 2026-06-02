import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { aiRepository } from "../repositories/aiRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { errors } from "../utils/errors.js";

function getModel() {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for AI operations.");
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
}

function consentAllowsLearning(user) {
  return Boolean(user.consent_prompt_learning);
}

export const aiService = {
  async analyzeReport({ reportId, user }) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw errors.notFound("Report not found.");
    if (user.role === "Patient" && report.patient_id !== user.id) throw errors.forbidden("You can only analyze your own reports.");

    await reportRepository.updateAnalysis(report.id, { status: "processing" });
    const prompt = [
      "You are MedExplain AI, an educational assistant for medical report explanations.",
      "Explain findings in clear patient-friendly language.",
      "Do not diagnose. Encourage review with a licensed clinician.",
      `Report title: ${report.title}`,
      `Known extracted text: ${report.extracted_text || "No extracted text available yet. Use the uploaded file metadata only."}`
    ].join("\n");

    try {
      const model = getModel();
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      await aiRepository.createInteraction({
        userId: user.id,
        reportId: report.id,
        type: "report_analysis",
        prompt,
        response,
        model: env.GEMINI_MODEL,
        usedForLearning: consentAllowsLearning(user)
      });
      return reportRepository.updateAnalysis(report.id, { status: "analyzed", summary: response });
    } catch (error) {
      await reportRepository.updateAnalysis(report.id, { status: "failed" });
      throw error;
    }
  },

  async chat({ user, message, reportId }) {
    if (reportId) {
      const report = await reportRepository.findById(reportId);
      if (!report) throw errors.notFound("Report not found.");
      if (user.role === "Patient" && report.patient_id !== user.id) throw errors.forbidden("You can only chat about your own reports.");
    }

    const prompt = [
      "You are MedExplain AI. Provide educational, non-diagnostic medical explanations.",
      "Use concise language and recommend consulting a clinician for decisions.",
      `Patient question: ${message}`
    ].join("\n");
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const interaction = await aiRepository.createInteraction({
      userId: user.id,
      reportId,
      type: "chat",
      prompt,
      response,
      model: env.GEMINI_MODEL,
      usedForLearning: consentAllowsLearning(user)
    });
    await aiRepository.storeMessage({ userId: user.id, role: "user", content: message });
    await aiRepository.storeMessage({ userId: user.id, role: "assistant", content: response, aiInteractionId: interaction.id });
    return { interaction, message: response };
  },

  async history(user) {
    return aiRepository.listChatMessages(user.id);
  },

  async feedback({ user, interactionId, rating, comment }) {
    const updated = await aiRepository.updateFeedback({ id: interactionId, userId: user.id, rating, comment });
    if (!updated) throw errors.notFound("AI interaction not found.");
    return updated;
  }
};
