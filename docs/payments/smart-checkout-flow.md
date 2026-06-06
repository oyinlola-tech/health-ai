# Smart Checkout Flow

Checkout is server-authoritative. The frontend may show a quote, but the backend recalculates every amount before activation.

## Flow

1. Patient selects a paid plan.
2. Optional coupon is sent to the backend.
3. Backend loads the active plan price.
4. Backend validates the coupon.
5. Backend calculates final Naira amount.
6. If final amount is greater than zero, OPay checkout starts.
7. If final amount is zero, OPay is skipped.

## Zero-Naira Activation

When final amount is `0`:

- A verified internal payment record is created.
- Coupon redemption is recorded when applicable.
- Subscription is activated immediately.
- Entitlements are updated immediately.
- Billing event records why checkout was skipped.
- No payment details are requested.

## Fraud Controls

- Frontend totals are ignored.
- Coupons are revalidated during checkout.
- Coupon attempts are rate limited.
- OPay verification still checks amount, currency, reference, and provider transaction uniqueness for paid checkouts.

