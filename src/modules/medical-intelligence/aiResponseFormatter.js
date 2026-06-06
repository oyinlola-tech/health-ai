import { z } from "zod";
import { errors } from "../../utils/errors.js";
import { safetyGuardrails } from "./safetyGuardrails.js";

const sourceSchema = z
  .object({
    sourceType: z.string().max(120).optional(),
    source: z.string().max(160).optional(),
    title: z.string().max(500),
    url: z.string().url().nullable().optional(),
    similarity: z.number().optional()
  })
  .passthrough();

const labInterpretationSchema = z
  .object({
    testName: z.string().max(200),
    standardName: z.string().max(120).optional(),
    value: z.union([z.number(), z.string(), z.null()]),
    unit: z.string().max(50).nullable().optional(),
    referenceMin: z.number().nullable().optional(),
    referenceMax: z.number().nullable().optional(),
    status: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL_LOW", "CRITICAL_HIGH", "UNKNOWN"]),
    explanation: z.string().max(1400)
  })
  .passthrough();

export const medicalResponseSchema = z
  .object({
    summary: z.string().min(1).max(3000),
    labInterpretation: z.array(labInterpretationSchema).max(100).default([]),
    possibleConditions: z.array(z.string().max(1000)).max(20).default([]),
    recommendedQuestions: z.array(z.string().max(1000)).max(20).default([]),
    safetyDisclaimer: z.string().max(1000).default(safetyGuardrails.disclaimer),
    sources: z.array(sourceSchema).max(20).default([])
  })
  .strict();

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw errors.badRequest("AI response was not valid JSON.");
}

export const aiResponseFormatter = {
  schema: medicalResponseSchema,

  parse(text) {
    let json;
    try {
      json = JSON.parse(extractJson(text));
    } catch (error) {
      if (error?.code) throw error;
      throw errors.badRequest("AI response JSON could not be parsed.");
    }

    const parsed = medicalResponseSchema.safeParse(json);
    if (!parsed.success) throw errors.badRequest("AI response failed medical intelligence schema validation.", parsed.error.flatten());
    return safetyGuardrails.apply(parsed.data);
  },

  format(response) {
    const parsed = medicalResponseSchema.safeParse(safetyGuardrails.apply(response));
    if (!parsed.success) throw errors.badRequest("Medical response failed schema validation.", parsed.error.flatten());
    return parsed.data;
  },

  buildPrompt({ question, labInterpretation = [], context = "", sources = [] }) {
    return [
      "Return strict JSON only. Do not include markdown or text outside JSON.",
      "Use this exact schema: summary, labInterpretation, possibleConditions, recommendedQuestions, safetyDisclaimer, sources.",
      "Do not diagnose. Do not prescribe medication. Do not claim certainty. Use cautious educational wording.",
      `Safety disclaimer: ${safetyGuardrails.disclaimer}`,
      "",
      "Deterministic lab classifications are already computed. Do not override their status.",
      JSON.stringify({ labInterpretation }, null, 2),
      "",
      "Trusted source context:",
      context || "No retrieved context was available. Be conservative and do not invent citations.",
      "",
      "Available sources:",
      JSON.stringify(
        sources.map((source) => ({ sourceType: source.sourceType, title: source.title, url: source.url })),
        null,
        2
      ),
      "",
      "User question:",
      String(question || "").slice(0, 4000)
    ].join("\n");
  }
};
