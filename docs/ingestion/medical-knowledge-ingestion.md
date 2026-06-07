# Medical Knowledge Ingestion

MedExplain AI searches local MySQL tables populated from trusted sources.

## Refresh MedlinePlus

MedlinePlus topics and definitions come from official MedlinePlus XML files.

```bash
npm run ingest:medlineplus
```

This updates:

- `medlineplus_topics`
- `medical_terms`

If a term is not found after this import, MedlinePlus may not publish that exact topic title.

## Import PubMed Topics

PubMed articles are imported by search terms. Configure the terms in `.env`:

```bash
PUBMED_QUERY_TERMS=Urology,Prostate cancer,Kidney stones,Urinary tract infection
PUBMED_IMPORT_LIMIT=1000
NCBI_EMAIL=your-email@example.com
```

Then run:

```bash
npm run ingest:pubmed
```

This updates:

- `pubmed_articles`

## Notes

- Use comma-separated medical terms in `PUBMED_QUERY_TERMS`.
- Keep `PUBMED_IMPORT_LIMIT` modest during development.
- Add `NCBI_API_KEY` if you have one, but it is not required for small imports.
- Imported content is cached under `.cache/pubmed` and summarized in `docs/ingestion/pubmed-report.md`.
