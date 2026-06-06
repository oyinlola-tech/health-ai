# Dataset Selection Report

Generated from the controlled Kaggle pipeline on 2026-06-06.

## Selection Rules

- Category must be one of the strict allowlist categories.
- Dataset must be medically relevant.
- Dataset must be tabular CSV.
- Dataset must be small to medium sized, with a hard rejection above 1GB per dataset in this pipeline.
- Dataset text must not indicate images, scans, surveys, social data, insurance data, or unrelated fitness tracking.
- Metadata must be available from Kaggle before download.

## Approved Datasets

| Category | Kaggle dataset | Rows imported | Normalized labs | License |
| --- | --- | ---: | --- | --- |
| Blood tests | `vizeno/complete-blood-count-cbc-dataset` | 94 | hemoglobin, platelets, WBC, RBC | MIT |
| Diabetes | `ziya07/diabetes-clinical-dataset100k-rows` | 99,986 | glucose | CC0: Public Domain |
| Kidney disease | `mansoordaku/ckdisease` | 400 | creatinine, WBC, RBC | Unknown |
| Liver function | `uciml/indian-liver-patient-records` | 570 | ALT, AST | CC0: Public Domain |
| Heart disease | `johnsmith88/heart-disease-dataset` | 302 | none detected; structured risk factors only | Unknown |
| Thyroid | `emmanuelfwerr/thyroid-disease-data` | 9,172 | TSH | CC0: Public Domain |

## Execution Summary

- Search completed for 6 allowed categories.
- Selection approved 6 datasets.
- Download completed for 6 datasets.
- Validation accepted 6 datasets.
- Transform completed for 6 datasets.
- Import completed for 6 datasets.
- Raw ZIP total: 1,815,119 bytes.
- Database target: MySQL/AMPPS, per repository policy.

## Generated Artifacts

- `datasets/kaggle-pipeline/search/selection-report.json`
- `datasets/kaggle-pipeline/reports/validation-report.json`
- `datasets/kaggle-pipeline/reports/transform-report.json`
- `datasets/kaggle-pipeline/reports/import-report.json`

These files are intentionally ignored by Git because they are generated runtime artifacts.
