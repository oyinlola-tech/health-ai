# Pricing Structure

All MedExplain AI subscription prices are stored and displayed in Nigerian Naira.

## Central Config

Pricing rules are defined in:

`src/modules/payments/pricing.config.js`

The config drives seed data for:

- `subscription_plans`
- `pricing_plans`

## Current Prices

- Free: ₦0/month
- Basic: ₦5,000/month
- Premium: ₦12,000/month

## Frontend Rule

Frontend pages display prices and usage returned by the backend. They do not hardcode checkout totals, compute authoritative discounts, or activate subscriptions.
