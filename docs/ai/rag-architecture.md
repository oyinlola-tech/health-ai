# Medical RAG Architecture

MedExplain AI retrieves trusted medical context before calling Gemini.

## Sources

- MedlinePlus topics from `medlineplus_topics`
- MedlinePlus definitions from `medical_terms`
- PubMed abstracts from `pubmed_articles` when present
- Kaggle-derived lab explanations from `lab_test_explanations`
- Lab reference range records from `lab_reference_ranges`

## Components

- `medicalKnowledgeBase.js`: unified source search interface.
- `ragEngine.js`: retrieves and ranks context with embedding similarity when available, plus MySQL-safe lexical fallback.
- `embeddingService.js`: caches Gemini embeddings in `medical_embeddings`.

## Database Note

The repository is MySQL/AMPPS-only, so embeddings are stored as JSON in MySQL. Similarity is computed in application code when vectors exist. If a dedicated vector database is introduced later, `embeddingService` and `ragEngine` are the replacement boundary.

## Grounding Rule

Gemini should receive retrieved source context before generating patient-facing explanations. If no trusted context is available, the response must be conservative and must not invent citations.

