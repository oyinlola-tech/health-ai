import { env } from "../../config/env.js";
import { createId } from "../../utils/uuid.js";

const plans = [
  {
    code: "FREE",
    name: "Free",
    interval: "month",
    price: 0,
    reports: env.FREE_REPORT_ANALYSIS_LIMIT,
    chats: env.FREE_AI_CHAT_LIMIT,
    doctor: false,
    trends: false,
    priority: false,
    advanced: false
  },
  {
    code: "PREMIUM_MONTHLY",
    name: "Premium Monthly",
    interval: "month",
    price: env.PREMIUM_MONTHLY_PRICE_CENTS,
    reports: null,
    chats: null,
    doctor: true,
    trends: true,
    priority: true,
    advanced: true
  },
  {
    code: "PREMIUM_ANNUAL",
    name: "Premium Annual",
    interval: "year",
    price: env.PREMIUM_ANNUAL_PRICE_CENTS,
    reports: null,
    chats: null,
    doctor: true,
    trends: true,
    priority: true,
    advanced: true
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
        plan.price,
        env.OPAY_CURRENCY,
        JSON.stringify({ premium: plan.code !== "FREE" }),
        plan.reports,
        plan.chats,
        plan.doctor,
        plan.trends,
        plan.priority,
        plan.advanced
      ]
    );
  }
}
