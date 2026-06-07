# PubMed Ingestion Report

Generated: 2026-06-07T14:00:31.002Z

## Source

- API: NCBI PubMed E-utilities
- ESearch URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=%22Urology%22%5BTitle%2FAbstract%5D&retstart=0&retmax=110&sort=relevance&retmode=json&tool=MedExplainAI
- Query: "Urology"[Title/Abstract]

## Terms

- Urology

## Imported

- Total PubMed matches available: 31095
- Import cap this run: 10
- PMIDs searched this run: 110
- Existing matching articles skipped: 0
- Articles imported/upserted this run: 10
- Total cached articles in database: 210
- EFetch batches: 1
- Local cache bytes: 103596054

## Table

- `pubmed_articles`

## Constraints

- The full PubMed corpus was not downloaded.
- Initial import is capped at 10,000 articles.
- Cached API responses are kept under `.cache/pubmed`.
- The importer refuses to continue if local cache size exceeds 1 GB.
