import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateJson: vi.fn(),
  searchMedicalContext: vi.fn(),
  formatMedicalContext: vi.fn(),
  createInteraction: vi.fn(),
  storeMessage: vi.fn(),
  updateFeedback: vi.fn(),
  listChatMessages: vi.fn(),
  findReportById: vi.fn(),
  updateAnalysis: vi.fn()
}));

vi.mock("../src/ai/gateway/ai.router.js", () => ({
  aiGateway: {
    generateJson: mocks.generateJson
  }
}));

vi.mock("../src/rag/retriever/search.js", () => ({
  searchMedicalContext: mocks.searchMedicalContext,
  formatMedicalContext: mocks.formatMedicalContext
}));

vi.mock("../src/repositories/aiRepository.js", () => ({
  aiRepository: {
    createInteraction: mocks.createInteraction,
    storeMessage: mocks.storeMessage,
    updateFeedback: mocks.updateFeedback,
    listChatMessages: mocks.listChatMessages
  }
}));

vi.mock("../src/repositories/reportRepository.js", () => ({
  reportRepository: {
    findById: mocks.findReportById,
    updateAnalysis: mocks.updateAnalysis
  }
}));

const user = {
  id: "7ee9e7e4-36fc-4ad7-b6ad-f95711e4782d",
  role: "Patient",
  consent_prompt_learning: false
};

function structuredAiResponse(overrides = {}) {
  return {
    report_overview: {
      type: "Blood test",
      summary: "Your result needs review, but there is no emergency signal in the provided text."
    },
    findings: [
      {
        test_name: "Hemoglobin",
        value: "14",
        unit: "g/dL",
        normal_range: "13.5-17.5 g/dL",
        status: "normal",
        explanation: "Hemoglobin is within the listed reference range."
      }
    ],
    risk_assessment: {
      level: "unknown",
      reason: "Only limited report information was provided."
    },
    key_insights: ["Hemoglobin is within the listed reference range."],
    recommendations: ["Discuss the report with a licensed clinician."],
    questions_for_doctor: ["Are these values expected for me?"],
    follow_up_suggestions: ["Keep this result with your medical records."],
    medical_disclaimer:
      "This information is for educational purposes only and is not medical advice. Please consult a qualified healthcare professional for interpretation and diagnosis.",
    ...overrides
  };
}

async function loadService() {
  vi.stubEnv("GEMINI_FLASH_MODEL", "gemini-test-flash");
  vi.stubEnv("GEMINI_PRO_MODEL", "gemini-test-pro");
  const { aiService } = await import("../src/services/aiService.js");
  return aiService;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.searchMedicalContext.mockResolvedValue([]);
  mocks.formatMedicalContext.mockReturnValue("");
  mocks.createInteraction.mockResolvedValue({ id: "interaction-id" });
  mocks.storeMessage.mockResolvedValue({});
  mocks.updateAnalysis.mockImplementation((_id, update) => Promise.resolve({ id: _id, ...update }));
});

describe("aiService structured response handling", () => {
  it("stores only schema-validated JSON while returning the answer for chat compatibility", async () => {
    const aiService = await loadService();
    const payload = structuredAiResponse();
    mocks.generateJson.mockResolvedValue({ text: JSON.stringify(payload), model: "gemini-test-flash", cacheHit: false });

    const result = await aiService.chat({ user, message: "What does this report mean?" });

    expect(result.message).toBe(payload.report_overview.summary);
    expect(result.response).toEqual(payload);
    expect(mocks.createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        response: JSON.stringify(payload),
        model: "gemini-test-flash",
        usedForLearning: false
      })
    );
    expect(mocks.storeMessage).toHaveBeenLastCalledWith({
      userId: user.id,
      role: "assistant",
      content: payload.report_overview.summary,
      aiInteractionId: "interaction-id"
    });
  });

  it("rejects malformed AI JSON before persisting chat messages", async () => {
    const aiService = await loadService();
    mocks.generateJson.mockResolvedValue({ text: "plain text medical advice", model: "gemini-test-flash", cacheHit: false });

    await expect(aiService.chat({ user, message: "Can I ignore this?" })).rejects.toMatchObject({
      code: "BAD_REQUEST"
    });
    expect(mocks.createInteraction).not.toHaveBeenCalled();
    expect(mocks.storeMessage).not.toHaveBeenCalled();
  });

  it("marks report analysis failed when Gemini returns a schema-invalid payload", async () => {
    const aiService = await loadService();
    const report = {
      id: "dcacdd76-97ee-495f-8f8f-79d2056408c1",
      patient_id: user.id,
      title: "Blood Test",
      extracted_text: "Hemoglobin 14 g/dL"
    };
    mocks.findReportById.mockResolvedValue(report);
    mocks.generateJson.mockResolvedValue({
      text: JSON.stringify({ report_overview: { type: "Blood test", summary: "Missing required sections." } }),
      model: "gemini-test-pro",
      cacheHit: false
    });

    await expect(aiService.analyzeReport({ reportId: report.id, user })).rejects.toMatchObject({
      code: "BAD_REQUEST"
    });
    expect(mocks.updateAnalysis).toHaveBeenCalledWith(report.id, { status: "processing" });
    expect(mocks.updateAnalysis).toHaveBeenCalledWith(report.id, { status: "failed" });
  });
});
