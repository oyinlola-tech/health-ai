# Naira Migration

MedExplain AI now treats Nigerian Naira as the system currency.

## Rules

- Subscription prices are configured in Naira.
- Frontend displays Naira with `Intl.NumberFormat("en-NG")`.
- Backend payment calculations use numeric Naira values.
- OPay checkout requests use `NGN`.
- No foreign-exchange conversion is performed.

## Current Prices

- Free trial: ₦0 for 14 days.
- Basic: ₦5,000 monthly.
- Premium: ₦12,000 monthly.

## Configuration

- `BASIC_MONTHLY_PRICE_NAIRA`
- `PREMIUM_MONTHLY_PRICE_NAIRA`
- `OPAY_CURRENCY=NGN`

The legacy app-facing foreign currency and conversion settings have been removed from the codebase.

