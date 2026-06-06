# Free Trial System

New patient registrations automatically receive a 14-day trial.

## Registration

When `authService.registerPatient` creates a patient account, it also creates a `user_trials` row in the same transaction.

## Trial Rules

- Default duration: 14 days.
- Config: `FREE_TRIAL_DAYS`.
- Access mode: `FREE_TRIAL_FULL_ACCESS`.
- Active trials are considered by `entitlementService.status`.
- Expired trials are lazily marked `expired` and the user falls back to the free plan.

## Table

`user_trials`

- `user_id`
- `start_date`
- `end_date`
- `status`

