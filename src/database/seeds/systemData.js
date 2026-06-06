import { env } from "../../config/env.js";
import { pricingPlans } from "../../modules/payments/pricing.config.js";
import { createId } from "../../utils/uuid.js";

const plans = pricingPlans;

const policies = [
  {
    slug: "terms",
    title: "Terms of Service",
    version: "2026-06-05",
    body: [
      "MedExplain AI provides secure medical report explanations, trusted-source AI support, verified doctor marketplace workflows, real-time consultations, and OPay-backed subscription payments.",
      "MedExplain AI does not provide diagnosis, prescriptions, emergency instructions, or a replacement for licensed medical care. AI explanations are informational and must be reviewed with qualified healthcare professionals.",
      "Users are responsible for submitting accurate account information, uploading only reports they are authorized to use, protecting account access, and using consultation and AI tools lawfully.",
      "Payments are processed through OPay. Premium access is activated only after server-side verification. Refunds may be limited by provider status, subscription consumption, fraud review, and applicable law.",
      "Doctor verification reduces risk but cannot guarantee all future conduct, clinical outcomes, availability, or individual suitability. Users must make their own care decisions with licensed professionals.",
      "Abuse, scraping, unauthorized access, impersonation, payment manipulation, prompt-injection attempts, harassment, and attempts to bypass access controls may lead to suspension or termination.",
      "Accounts may be restricted or terminated when required for safety, legal compliance, non-payment, fraud prevention, privacy protection, or platform abuse response."
    ].join("\n\n")
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    version: "2026-06-05",
    body: [
      "MedExplain AI collects account profile data, medical reports, extracted report text, AI chat history, consultation records, payment records, consent records, and security/audit logs needed to operate the platform.",
      "Data is stored in a MySQL database and secure backend-controlled file storage under the configured uploads directory. Medical reports are not served from the public web directory.",
      "AI processing is performed through backend services only. Gemini API calls are mediated by the server, guarded by consent checks, rate limits, budget controls, prompt-injection filters, and trusted-source RAG context.",
      "MedExplain AI does not sell medical data, publish reports publicly, or share patient data with unauthorized third parties. Doctors receive access only through authorized consultation/report workflows and consent controls.",
      "Payment records are stored for billing, audit, fraud prevention, and subscription integrity. OPay verification is performed server-side and frontend payment status is never trusted by itself.",
      "Security practices include role-based access control, input validation, SQL parameterization, secure upload validation, rate limiting, audit logging, consent enforcement, and production-safe error handling.",
      "Data retention follows operational, legal, payment, audit, and safety requirements. Users can revoke operational consents, which immediately blocks affected processing paths going forward."
    ].join("\n\n")
  },
  {
    slug: "data-policy",
    title: "Data Usage Transparency Policy",
    version: "2026-06-05",
    body: [
      "MedExplain AI collects data to operate user accounts, explain medical reports, support doctor consultations, process subscriptions, prevent abuse, and maintain auditability.",
      "Uploaded reports are used to extract medical text, identify lab values, and produce educational AI explanations when the user has granted medical data processing and AI analysis consent.",
      "Doctors can access patient reports and consultation messages only when appointment/report relationships and doctor sharing consent permit access.",
      "Admins use system logs, payment records, AI usage metrics, recruitment records, and audit trails to operate the platform, investigate abuse, verify doctors, and maintain service reliability.",
      "MedExplain AI does not sell data, expose medical reports publicly, use uploaded reports for unauthorized marketing, or allow AI systems to directly access the database.",
      "Consent records are timestamped and include request metadata so users and operators can understand when permissions were granted or revoked."
    ].join("\n\n")
  }
];

export async function seedSystemData(connection) {
  for (const plan of plans) {
    await connection.execute(
      `insert into subscription_plans (
         id, code, name, description, interval_unit, \`interval\`, price_cents, currency, features,
         report_analysis_limit, ai_chat_limit, doctor_consultations_enabled, health_trends_enabled,
         priority_processing_enabled, advanced_ai_enabled, active
       )
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
       on duplicate key update
         name = values(name),
         description = values(description),
         price_cents = values(price_cents),
         currency = values(currency),
         features = values(features),
         report_analysis_limit = values(report_analysis_limit),
         ai_chat_limit = values(ai_chat_limit),
         doctor_consultations_enabled = values(doctor_consultations_enabled),
         health_trends_enabled = values(health_trends_enabled),
         priority_processing_enabled = values(priority_processing_enabled),
         advanced_ai_enabled = values(advanced_ai_enabled),
         active = true`,
      [
        createId(),
        plan.code,
        plan.name,
        `${plan.name} MedExplain AI access`,
        plan.interval,
        plan.interval,
        plan.priceNaira,
        env.OPAY_CURRENCY,
        JSON.stringify(plan.features),
        plan.reportAnalysisLimit,
        plan.aiChatLimit,
        plan.doctorConsultationsEnabled,
        plan.healthTrendsEnabled,
        plan.priorityProcessingEnabled,
        plan.advancedAiEnabled
      ]
    );

    await connection.execute(
      `insert into pricing_plans (
         id, code, tier, name, description, price_naira, currency, interval_unit,
         report_analysis_limit, ai_chat_limit, doctor_consultations_enabled,
         premium_rag_enabled, priority_processing_enabled, entitlements, active
       )
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
       on duplicate key update
         tier = values(tier),
         name = values(name),
         description = values(description),
         price_naira = values(price_naira),
         currency = values(currency),
         interval_unit = values(interval_unit),
         report_analysis_limit = values(report_analysis_limit),
         ai_chat_limit = values(ai_chat_limit),
         doctor_consultations_enabled = values(doctor_consultations_enabled),
         premium_rag_enabled = values(premium_rag_enabled),
         priority_processing_enabled = values(priority_processing_enabled),
         entitlements = values(entitlements),
         active = true,
         updated_at = now()`,
      [
        createId(),
        plan.code,
        plan.tier,
        plan.name,
        `${plan.name} MedExplain AI access`,
        plan.priceNaira,
        plan.currency,
        plan.interval,
        plan.reportAnalysisLimit,
        plan.aiChatLimit,
        plan.doctorConsultationsEnabled,
        plan.advancedAiEnabled,
        plan.priorityProcessingEnabled,
        JSON.stringify(plan.features)
      ]
    );
  }

  for (const policy of policies) {
    await connection.execute(
      `insert into legal_policies (id, policy_key, slug, title, body, version)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update
         title = values(title),
         body = values(body),
         version = values(version),
         effective_at = now()`,
      [createId(), policy.slug, policy.slug, policy.title, policy.body, policy.version]
    );
  }
}
