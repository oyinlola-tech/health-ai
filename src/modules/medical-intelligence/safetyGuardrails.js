const disclaimer =
  "This explanation is for general education only and is not a diagnosis or a substitute for care from a qualified healthcare professional.";

const unsafePatterns = [
  /\byou have\b/i,
  /\byou definitely\b/i,
  /\bdiagnosed with\b/i,
  /\btake\s+\d+/i,
  /\bstart taking\b/i,
  /\bstop taking\b/i,
  /\bprescribe\b/i,
  /\bdosage\b/i,
  /\bmg twice daily\b/i,
  /\bignore your doctor\b/i
];

const diagnosisPatterns = [/\bdiagnosis\b/i, /\bdisease confirmed\b/i, /\bclearly indicates\b/i, /\bproves that\b/i];

function softenText(value) {
  return String(value || "")
    .replace(/\byou have\b/gi, "this may be associated with")
    .replace(/\byou definitely\b/gi, "this may")
    .replace(/\bdiagnosed with\b/gi, "showing a pattern that a clinician may evaluate for")
    .replace(/\bclearly indicates\b/gi, "may suggest")
    .replace(/\bproves that\b/gi, "may suggest");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export const safetyGuardrails = {
  disclaimer,

  inspectText(text) {
    const value = String(text || "");
    return {
      safe: !unsafePatterns.some((pattern) => pattern.test(value)) && !diagnosisPatterns.some((pattern) => pattern.test(value)),
      flags: [
        ...unsafePatterns.filter((pattern) => pattern.test(value)).map(() => "unsafe_medical_instruction_or_certainty"),
        ...diagnosisPatterns.filter((pattern) => pattern.test(value)).map(() => "diagnosis_or_certainty_language")
      ]
    };
  },

  apply(response) {
    const safeResponse = {
      summary: softenText(response?.summary || ""),
      labInterpretation: ensureArray(response?.labInterpretation).map((item) => ({
        ...item,
        explanation: softenText(item.explanation || "")
      })),
      possibleConditions: ensureArray(response?.possibleConditions).map((item) => softenText(item)),
      recommendedQuestions: ensureArray(response?.recommendedQuestions),
      safetyDisclaimer: response?.safetyDisclaimer || disclaimer,
      sources: ensureArray(response?.sources)
    };

    if (!safeResponse.summary.toLowerCase().includes("not a diagnosis")) {
      safeResponse.summary = `${safeResponse.summary} This is not a diagnosis.`.trim();
    }
    if (!safeResponse.recommendedQuestions.length) {
      safeResponse.recommendedQuestions = [
        "Which of these results should I prioritize discussing?",
        "Do any results need repeat testing or follow-up?",
        "How do these values fit with my symptoms and medical history?"
      ];
    }
    return safeResponse;
  },

  assertPromptAllowed(prompt) {
    const inspection = this.inspectText(prompt);
    if (!inspection.safe) {
      return {
        allowed: false,
        flags: inspection.flags,
        safePrompt: softenText(prompt)
      };
    }
    return { allowed: true, flags: [], safePrompt: prompt };
  }
};
