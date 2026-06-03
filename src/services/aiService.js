import { z } from "zod";
import { aiGateway } from "../ai/gateway/ai.router.js";
import { aiRepository } from "../repositories/aiRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { formatMedicalContext, searchMedicalContext } from "../rag/retriever/search.js";
import { errors } from "../utils/errors.js";

const medicalDisclaimer =
  "This information is for educational purposes only and is not medical advice. Please consult a qualified healthcare professional for interpretation and diagnosis.";

const findingSchema = z
  .object({
    test_name: z.string().max(200),
    value: z.string().max(100),
    unit: z.string().max(50),
    normal_range: z.string().max(120),
    status: z.enum(["normal", "low", "high", "unknown"]),
    explanation: z.string().max(1200)
  })
  .strict();

const medicalAiResponseSchema = z
  .object({
    report_overview: z
      .object({
        type: z.string().max(160),
        summary: z.string().min(1).max(3000)
      })
      .strict(),
    findings: z.array(findingSchema).max(50),
    risk_assessment: z
      .object({
        level: z.enum(["low", "medium", "high", "unknown"]),
        reason: z.string().max(1200)
      })
      .strict(),
    key_insights: z.array(z.string().max(1000)).max(15).optional(),
    recommendations: z.array(z.string().max(1000)).max(10).optional(),
    questions_for_doctor: z.array(z.string().max(1000)).max(10).optional(),
    follow_up_suggestions: z.array(z.string().max(1000)).max(10).optional(),
    medical_disclaimer: z.literal(medicalDisclaimer),
    citations: z.array(citationSchema).max(10).optional(),
    needsClinicianReview: z.boolean().optional()
  })
  .strict();

function consentAllowsLearning(user) {
  return Boolean(user.consent_prompt_learning);
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  throw errors.badRequest("AI response was not valid JSON.");
}

function parseStructuredMedicalResponse(text) {
  try {
    return medicalAiResponseSchema.parse(JSON.parse(extractJson(text)));
  } catch (error) {
    if (error instanceof SyntaxError) throw errors.badRequest("AI response JSON could not be parsed.");
    if (error instanceof z.ZodError) throw errors.badRequest("AI response failed schema validation.", error.flatten());
    throw error;
  }
}

function stringifyStructuredResponse(response) {
  return JSON.stringify(response);
}

function responseSummary(response) {
  return response.report_overview.summary;
}

function medicalReportPromptContract() {
  return [
    "You are a medical report interpretation assistant.",
    "",
    "You are NOT a doctor.",
    "You are NOT allowed to diagnose diseases.",
    "You are NOT allowed to prescribe treatment.",
    "You are NOT allowed to give emergency instructions.",
    "",
    "Your ONLY role is to:",
    "- Explain medical test results in simple language",
    "- Identify abnormal values",
    "- Compare values with normal ranges",
    "- Provide educational context",
    "- Suggest general wellness advice",
    "- Encourage consulting a licensed healthcare professional when needed",
    "",
    "You MUST be cautious, neutral, and medically safe at all times.",
    "",
    "INPUT",
    "You will receive structured or semi-structured medical test data from a patient report.",
    "It may include blood test results, urine test results, imaging summaries, lab values with units, and reference ranges.",
    "",
    "CRITICAL SAFETY RULES",
    "You must NEVER diagnose a disease.",
    "You must NEVER say \"you have\" any condition.",
    "You must NEVER prescribe medication.",
    "You must NEVER suggest drug names or dosages.",
    "You must NEVER give emergency medical instructions.",
    "You must NEVER replace a healthcare professional.",
    "If a value is dangerous or abnormal, state it is outside normal range and advise consulting a healthcare professional without alarming the user.",
    "",
    "INTERPRETATION GUIDELINES",
    "For each test, compare value with normal range.",
    "If no range is provided, use general medical knowledge cautiously and mark uncertain values as unknown when appropriate.",
    "Use simple language with no jargon unless explained.",
    "For abnormal values, do NOT say disease names. Say things like: This value is higher than the typical reference range.",
    "For normal values, reassure briefly and do not overemphasize.",
    "",
    "EXPLANATION STYLE",
    "Simple, human-friendly language.",
    "Short sentences.",
    "No fear-based wording.",
    "No diagnosis language.",
    "",
    "OUTPUT FORMAT (STRICT JSON ONLY)",
    "Return ONLY valid JSON.",
    "No explanations outside JSON.",
    "No markdown.",
    "No extra text.",
    "Use this schema exactly:",
    "{",
    '  "report_overview": {',
    '    "type": "",',
    '    "summary": ""',
    "  },",
    '  "findings": [',
    "    {",
    '      "test_name": "",',
    '      "value": "",',
    '      "unit": "",',
    '      "normal_range": "",',
    '      "status": "normal | low | high | unknown",',
    '      "explanation": ""',
    "    }",
    "  ],",
    '  "risk_assessment": {',
    '    "level": "low | medium | high | unknown",',
    '    "reason": ""',
    "  },",
    '  "key_insights": [',
    '    ""',
    "  ],",
    '  "recommendations": [',
    '    ""',
    "  ],",
    '  "questions_for_doctor": [',
    '    ""',
    "  ],",
    '  "follow_up_suggestions": [',
    '    ""',
    "  ],",
    '  "medical_disclaimer": "' + medicalDisclaimer + '",',
    '  "citations": [{"source":"MedlinePlus|NIH|PubMed|Internal report","title":"source title","url":"https://example.org"}],',
    '  "needsClinicianReview": true',
    "}",,
    "",
    "GOOD: The glucose level is higher than the typical reference range, which means the body is processing sugar less efficiently than expected.",
    "BAD: You have diabetes.",
    "",
    "FINAL INSTRUCTION",
    "Return ONLY the JSON object following the schema exactly.",
    "No markdown.",
    "No commentary.",
    "No extra text."
  ].join("\n");
}

async function buildGroundedPrompt({ baseInput, taskInput }) {
  const chunks = await searchMedicalContext(baseInput);
  const context = formatMedicalContext(chunks);
  const grounding = context
    ? [
        "TRUSTED MEDICAL CONTEXT",
        "Use the context below to ground educational explanations. Do not invent citations or claims outside this context when it is relevant.",
        context
      ].join("\n")
    : "TRUSTED MEDICAL CONTEXT\nNo indexed trusted-source context was available for this request. Be conservative and avoid unsupported claims.";

  return {
    prompt: [medicalReportPromptContract(), grounding, taskInput].join("\n\n"),
    contextChunks: chunks
  };
}

export const aiService = {
  async analyzeReport({ reportId, user }) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw errors.notFound("Report not found.");
    if (user.role === "Patient" && report.patient_id !== user.id) throw errors.forbidden("You can only analyze your own reports.");

    await reportRepository.updateAnalysis(report.id, { status: "processing" });
    const taskInput = [
      `Report title: ${report.title}`,
      `Known extracted text: ${report.extracted_text || "No extracted text available yet. Use the uploaded file metadata only."}`
    ].join("\n");
    const { prompt, contextChunks } = await buildGroundedPrompt({
      baseInput: `${report.title}\n${report.extracted_text || ""}`,
      taskInput
    });

    try {
      const result = await aiGateway.generateJson({
        user,
        endpoint: "reports.analyze",
        taskType: "medical_report",
        prompt,
        cacheContext: { reportId: report.id, updatedAt: report.updated_at, contextUrls: contextChunks.map((chunk) => chunk.url) },
        metadata: { reportId: report.id, contextCount: contextChunks.length }
      });
      const response = parseStructuredMedicalResponse(result.text);
      await aiRepository.createInteraction({
        userId: user.id,
        reportId: report.id,
        type: "report_analysis",
        prompt,
        response: stringifyStructuredResponse(response),
        model: result.model,
        usedForLearning: consentAllowsLearning(user)
      });
      return reportRepository.updateAnalysis(report.id, { status: "analyzed", summary: responseSummary(response) });
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

    const { prompt, contextChunks } = await buildGroundedPrompt({
      baseInput: message,
      taskInput: `Patient question: ${message}`
    });
    const result = await aiGateway.generateJson({
      user,
      endpoint: "ai.chat",
      taskType: "simple_chat",
      prompt,
      cacheContext: { reportId, contextUrls: contextChunks.map((chunk) => chunk.url) },
      metadata: { reportId, contextCount: contextChunks.length }
    });
    const response = parseStructuredMedicalResponse(result.text);
    const interaction = await aiRepository.createInteraction({
      userId: user.id,
      reportId,
      type: "chat",
      prompt,
      response: stringifyStructuredResponse(response),
      model: result.model,
      usedForLearning: consentAllowsLearning(user)
    });
    await aiRepository.storeMessage({ userId: user.id, role: "user", content: message });
    await aiRepository.storeMessage({ userId: user.id, role: "assistant", content: responseSummary(response), aiInteractionId: interaction.id });
    return { interaction, message: responseSummary(response), response };
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
