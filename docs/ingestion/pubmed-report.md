# PubMed Ingestion Report

Generated: 2026-06-07T13:39:40.629Z

## Source

- API: NCBI PubMed E-utilities
- ESearch URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=%22Diabetes%22%5BTitle%2FAbstract%5D+OR+%22Hypertension%22%5BTitle%2FAbstract%5D+OR+%22Anemia%22%5BTitle%2FAbstract%5D+OR+%22Kidney+disease%22%5BTitle%2FAbstract%5D+OR+%22Liver+disease%22%5BTitle%2FAbstract%5D+OR+%22Cholesterol%22%5BTitle%2FAbstract%5D+OR+%22CBC+tests%22%5BTitle%2FAbstract%5D+OR+%22Blood+tests%22%5BTitle%2FAbstract%5D&retstart=0&retmax=300&sort=relevance&retmode=json&tool=MedExplainAI
- Query: "Diabetes"[Title/Abstract] OR "Hypertension"[Title/Abstract] OR "Anemia"[Title/Abstract] OR "Kidney disease"[Title/Abstract] OR "Liver disease"[Title/Abstract] OR "Cholesterol"[Title/Abstract] OR "CBC tests"[Title/Abstract] OR "Blood tests"[Title/Abstract]

## Terms

- Diabetes
- Hypertension
- Anemia
- Kidney disease
- Liver disease
- Cholesterol
- CBC tests
- Blood tests

## Imported

- Total PubMed matches available: 1834911
- Initial import cap: 200
- PMIDs searched this run: 300
- Existing matching articles skipped: 0
- Articles imported/upserted this run: 200
- Total cached articles in database: 200
- EFetch batches: 3
- Local cache bytes: 106123576

## Table

- `pubmed_articles`

## Constraints

- The full PubMed corpus was not downloaded.
- Initial import is capped at 10,000 articles.
- Cached API responses are kept under `.cache/pubmed`.
- The importer refuses to continue if local cache size exceeds 1 GB.
