# Controlled Kaggle Pipeline Architecture

## Stages

1. `search-datasets.js`
   Searches Kaggle API by allowlisted category queries and ranks results by medical relevance.

2. `select-datasets.js`
   Applies category, relevance, size, tabular, and safety filters.

3. `download-datasets.js`
   Downloads approved datasets only.

4. `validate-datasets.js`
   Extracts CSV files and rejects unclear or non-tabular schemas.

5. `transform-datasets.js`
   Normalizes clinical columns into standard lab names and creates structured records.

6. `import-datasets.js`
   Imports only transformed structured data into MySQL tables.

## Normalized Labs

- Hemoglobin
- WBC
- RBC
- Platelets
- Glucose
- Creatinine
- ALT
- AST
- TSH
- HDL
- LDL

## Tables

- `dataset_sources`
- `medical_dataset_sources`
- `medical_conditions`
- `lab_reference_ranges`
- `lab_test_explanations`
- `disease_risk_factors`

## Data Boundary

Raw Kaggle CSV and ZIP files remain under `datasets/kaggle-pipeline/` and are ignored by Git. The database receives only structured source metadata, normalized lab statistics, lab explanations, condition categories, and structured risk-factor JSON.

## Production Notes

- This pipeline does not use the older broad `scripts/kaggle/` MVP importer.
- Generated data artifacts are ignored under `datasets/kaggle-pipeline/`.
- The import stage deletes and replaces rows only for the same controlled `source_key`; it does not truncate global production tables.
- The heart disease dataset is retained for structured cardiovascular risk factors even when no normalized lab column is detected.
