# Lab Engine Design

Lab interpretation is deterministic and does not require AI for classification.

## Flow

1. Normalize the lab name.
2. Prefer report-provided reference ranges.
3. Fall back to `lab_reference_ranges`.
4. Fall back to conservative built-in general ranges for common labs.
5. Classify locally as:
   - `LOW`
   - `NORMAL`
   - `HIGH`
   - `CRITICAL_LOW`
   - `CRITICAL_HIGH`
   - `UNKNOWN`
6. Generate simple explanatory text.

## AI Boundary

AI may explain an already-classified result, but it must not override deterministic status.

## Implemented Module

`src/modules/medical-intelligence/labInterpretationEngine.js`

