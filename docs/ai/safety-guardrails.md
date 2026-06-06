# Safety Guardrails

Medical intelligence responses must be educational, cautious, and grounded.

## Prohibited

- Direct diagnosis.
- Certainty language.
- Prescription instructions.
- Dose instructions.
- Claims that replace a clinician.
- Unsupported medical claims without source grounding.

## Required

- Plain-language explanation.
- Questions to ask a clinician.
- Safety disclaimer.
- Source citations when retrieved context exists.
- Conservative wording when evidence is limited.

## Implemented Module

`src/modules/medical-intelligence/safetyGuardrails.js`

The guardrail layer softens unsafe certainty phrases and ensures a disclaimer is present.

