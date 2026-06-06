# Kaggle Datasets Report

Generated: 2026-06-06T10:14:14.655Z

## Database

- Target: MySQL/AMPPS
- PostgreSQL was not used because this repository is configured for MySQL/AMPPS only.

## Imported Datasets

- vizeno/complete-blood-count-cbc-dataset (cbc): imported, rows=94, labs=hemoglobin, platelets, wbc, rbc
- pinuto/laboratory-test-results-anonymized-dataset (blood_tests): imported, rows=27, labs=none
- uciml/pima-indians-diabetes-database (diabetes): imported, rows=768, labs=glucose
- uciml/indian-liver-patient-records (liver_disease): imported, rows=570, labs=alt, ast
- mansoordaku/ckdisease (kidney_disease): imported, rows=400, labs=creatinine, wbc, rbc
- emmanuelfwerr/thyroid-disease-data (thyroid): imported, rows=9172, labs=tsh
- johnsmith88/heart-disease-dataset (heart_disease): imported, rows=302, labs=none
- fedesoriano/heart-failure-prediction (cholesterol): imported, rows=918, labs=none
- prosperchuks/health-dataset (hypertension): imported, rows=131013, labs=glucose
- itachi9604/disease-symptom-description-dataset (symptoms): imported, rows=519, labs=none

## Table Mappings

- `medical_dataset_sources`: one row per Kaggle dataset source
- `medical_conditions`: one condition/category row per source
- `disease_risk_factors`: cleaned CSV rows as normalized factor JSON
- `lab_reference_ranges`: observed min/max/mean for normalized lab columns
- `lab_test_explanations`: explanations for recognized lab tests
- `medical_symptoms`: symptom columns from symptom datasets

## Quality

- vizeno/complete-blood-count-cbc-dataset: duplicates removed=323, empty columns removed=0
- pinuto/laboratory-test-results-anonymized-dataset: duplicates removed=0, empty columns removed=0
- uciml/pima-indians-diabetes-database: duplicates removed=0, empty columns removed=0
- uciml/indian-liver-patient-records: duplicates removed=13, empty columns removed=0
- mansoordaku/ckdisease: duplicates removed=0, empty columns removed=0
- emmanuelfwerr/thyroid-disease-data: duplicates removed=0, empty columns removed=0
- johnsmith88/heart-disease-dataset: duplicates removed=723, empty columns removed=0
- fedesoriano/heart-failure-prediction: duplicates removed=0, empty columns removed=0
- prosperchuks/health-dataset: duplicates removed=6672, empty columns removed=0
- itachi9604/disease-symptom-description-dataset: duplicates removed=4616, empty columns removed=0
