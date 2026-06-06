# Coupon System

MedExplain AI coupons are backend-enforced promotional discounts for subscription checkout.

## Backend Flow

- Admins manage coupons through `/api/admin/coupons`.
- Patients preview a coupon through `/api/subscriptions/coupons/validate`.
- Checkout always reloads the plan and coupon server-side before calculating the final amount.
- One account can redeem a coupon only once.
- Coupon creation and validation are rate limited.

## Validation Rules

- Code must exist and match the secure `MED-XXXXXX` format.
- Coupon must be active.
- Expiry date must be in the future when set.
- `max_uses` must not be exceeded.
- The current user must not have redeemed the same coupon before.

## Discount Rules

- `percentage`: percentage of the plan price, capped at the plan price.
- `fixed`: fixed Naira amount, capped at the plan price.
- Final amount is never below zero.

## Admin Controls

- Create coupon codes.
- Allow generated secure codes.
- Set percentage or fixed Naira discounts.
- Set expiry dates and usage limits.
- Disable coupons.
- View usage counts.

## Tables

- `coupons`
- `coupon_redemptions`

