# Subscription Model

MedExplain AI supports three production plan tiers.

| Tier | Code | Price | Access |
| --- | --- | ---: | --- |
| Free | `FREE` | NGN 0/month | 3 AI report analyses/month, basic RAG responses |
| Basic | `BASIC_MONTHLY` | NGN 5,000/month | 20 AI analyses/month, basic chat, health trends |
| Premium | `PREMIUM_MONTHLY` | NGN 12,000/month | Unlimited AI analyses, premium RAG insights, doctor consultation access, priority processing |

Operational subscription state lives in:

- `subscription_plans`
- `subscriptions`
- `entitlements`
- `usage_tracking`

The auditable pricing catalog lives in:

- `pricing_plans`

Current user access is derived from active subscription period, trial status, coupon-backed access, and monthly usage counters. Expired subscriptions are ignored by entitlement checks.

Paid OPay subscriptions become active only after the signed webhook updates the local payment, subscription, and entitlement records. The browser success page can read status, but it cannot verify or activate a payment.
