import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateJson: vi.fn(),
  searchMedicalContext: vi.fn(),
  formatMedicalContext: vi.fn(),
  createInteraction: vi.fn(),
  storeMessage: vi.fn(),
  listThreadMessages: vi.fn(),
  updateFeedback: vi.fn(),
  listChatMessages: vi.fn(),
  findReportById: vi.fn(),
  updateAnalysis: vi.fn(),
  createNotification: vi.fn(),
  assertCanUse: vi.fn(),
  recordUsage: vi.fn()
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
    listThreadMessages: mocks.listThreadMessages,
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

vi.mock("../src/repositories/notificationRepository.js", () => ({
  notificationRepository: {
    create: mocks.createNotification
  }
}));

vi.mock("../src/services/entitlementService.js", () => ({
  features: {
    REPORT_ANALYSIS: "REPORT_ANALYSIS",
    AI_CHAT: "AI_CHAT"
  },
  entitlementService: {
    assertCanUse: mocks.assertCanUse,
    recordUsage: mocks.recordUsage
  }
}));

const user = {
  id: "7ee9e7e4-36fc-4ad7-b6ad-f95711e4782d",
  role: "Patient",
  consent_prompt_learning: false
};

function structuredAiResponse(overrides = {}) {
  return {
    summary: "Your result needs review, but there is no emergency signal in the provided text.",
    keyFindings: ["Hemoglobin is within the listed reference range."],
    abnormalResults: [
      {
        testName: "Hemoglobin",
        value: 14,
        unit: "g/dL",
        referenceMin: 13.5,
        referenceMax: 17.5,
        flag: "NORMAL",
        explanation: "Hemoglobin is within the listed reference range."
      }
    ],
    possibleExplanations: ["This can be consistent with a typical result when viewed with the listed reference range."],
    recommendedQuestions: ["Are these values expected for me?"],
    urgencyLevel: "LOW",
    seekMedicalAttention: false,
    sourcesUsed: [],
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
  mocks.listThreadMessages.mockResolvedValue([]);
  mocks.updateAnalysis.mockImplementation((_id, update) => Promise.resolve({ id: _id, ...update }));
  mocks.assertCanUse.mockResolvedValue({ allowed: true });
  mocks.recordUsage.mockResolvedValue({});
});

describe("aiService structured response handling", () => {
  it("stores only schema-validated JSON while returning the answer for chat compatibility", async () => {
    const aiService = await loadService();
    const payload = structuredAiResponse();
    mocks.generateJson.mockResolvedValue({ text: JSON.stringify(payload), model: "gemini-test-flash", cacheHit: false });

    const result = await aiService.chat({ user, message: "What does this report mean?" });

    expect(result.message).toContain(payload.summary);
    expect(result.message).toContain("A few questions that would help me guide you better");
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
      content: expect.stringContaining(payload.summary),
      aiInteractionId: "interaction-id",
      metadata: expect.objectContaining({
        threadId: expect.any(String),
        reportId: null
      })
    });
  });

  it("keeps follow-up messages in the provided chat thread", async () => {
    const aiService = await loadService();
    const payload = structuredAiResponse({ summary: "Tell me when the headache started, how severe it is, and whether you have fever, vision changes, weakness, or vomiting. This information is for educational purposes only and is not medical advice. Please consult a qualified healthcare professional for interpretation and diagnosis." });
    const threadId = "dcacdd76-97ee-495f-8f8f-79d2056408c1";
    mocks.listThreadMessages.mockResolvedValue([{ role: "user", content: "I have a headache" }]);
    mocks.generateJson.mockResolvedValue({ text: JSON.stringify(payload), model: "gemini-test-flash", cacheHit: false });

    const result = await aiService.chat({ user, message: "It is getting worse", threadId });

    expect(result.threadId).toBe(threadId);
    expect(mocks.listThreadMessages).toHaveBeenCalledWith(user.id, threadId, 12);
    expect(mocks.generateJson).toHaveBeenCalledWith(expect.objectContaining({
      cacheContext: expect.objectContaining({ threadId })
    }));
    expect(mocks.storeMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: "user",
      metadata: expect.objectContaining({ threadId })
    }));
  });

  it("accepts structured AI response objects without calling trim on them", async () => {
    const aiService = await loadService();
    const payload = structuredAiResponse();
    mocks.generateJson.mockResolvedValue({ text: payload, model: "gemini-test-flash", cacheHit: false });

    const result = await aiService.chat({ user, message: "Can you explain these symptoms?" });

    expect(result.message).toContain(payload.summary);
    expect(result.response).toEqual(payload);
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
      extracted_text: "Hemoglobin 14 g/dL",
      extraction_status: "completed",
      analysis_confidence: 82,
      medical_entities_json: { testNames: ["Hemoglobin"] },
      lab_results_json: [{ testName: "Hemoglobin", value: 14, unit: "g/dL", referenceMin: 13, referenceMax: 17, flag: "NORMAL" }]
    };
    mocks.findReportById.mockResolvedValue(report);
    mocks.generateJson.mockResolvedValue({
      text: JSON.stringify({ summary: "Missing required sections." }),
      model: "gemini-test-pro",
      cacheHit: false
    });

    await expect(aiService.analyzeReport({ reportId: report.id, user })).rejects.toMatchObject({
      code: "BAD_REQUEST"
    });
    expect(mocks.updateAnalysis).toHaveBeenCalledWith(report.id, { status: "processing" });
    expect(mocks.updateAnalysis).toHaveBeenCalledWith(report.id, { status: "failed" });
  });

  it("does not call Gemini when extracted report content is unavailable", async () => {
    const aiService = await loadService();
    const report = {
      id: "dcacdd76-97ee-495f-8f8f-79d2056408c1",
      patient_id: user.id,
      title: "Blood Test",
      extracted_text: "",
      extraction_status: "failed"
    };
    mocks.findReportById.mockResolvedValue(report);

    await expect(aiService.analyzeReport({ reportId: report.id, user })).rejects.toMatchObject({
      message: "Report content could not be extracted reliably."
    });
    expect(mocks.generateJson).not.toHaveBeenCalled();
  });
});
