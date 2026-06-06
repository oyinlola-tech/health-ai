# Kaggle Ingestion Plan

The controlled Kaggle pipeline only allows datasets for lab interpretation, disease explanation, RAG knowledge support, and structured risk detection.

## Allowed Categories

- Blood test datasets: CBC, lipid profile, glucose.
- Diabetes datasets.
- Kidney disease datasets.
- Liver function datasets.
- Heart disease datasets.
- Thyroid datasets.

Everything else is rejected before download.

## Pipeline Commands

- `npm run kaggle:pipeline:search`
- `npm run kaggle:pipeline:select`
- `npm run kaggle:pipeline:download`
- `npm run kaggle:pipeline:validate`
- `npm run kaggle:pipeline:transform`
- `npm run kaggle:pipeline:import`
- `npm run kaggle:pipeline`

## Database Target

This repository is configured for MySQL/AMPPS only, so the controlled importer targets MySQL even though some external planning language refers to PostgreSQL.

## Safety Rules

- Search happens before selection.
- Download happens only after selection approval.
- Raw CSV files are never inserted into the database.
- Transformed structured JSON is used as the import source.
- Existing production data is not overwritten globally; imports are scoped by `source_key`.
- Source metadata is stored in `dataset_sources` and `medical_dataset_sources`.

## Current Execution

The controlled pipeline was executed successfully for all six allowed categories. The run imported structured records for blood tests, diabetes, kidney disease, liver function, heart disease, and thyroid datasets. Raw ZIP downloads totaled about 1.8 MB, well below the 5GB limit.
