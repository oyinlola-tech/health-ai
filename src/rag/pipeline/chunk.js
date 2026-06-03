function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentencesFrom(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function chunkText(text, { minWords = 300, maxWords = 800 } = {}) {
  const sentences = sentencesFrom(text);
  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = wordCount(sentence);
    if (currentWords >= minWords && currentWords + sentenceWords > maxWords) {
      chunks.push(current.join(" "));
      current = [];
      currentWords = 0;
    }
    current.push(sentence);
    currentWords += sentenceWords;
  }

  if (current.length) chunks.push(current.join(" "));
  return chunks.filter((chunk) => wordCount(chunk) > 0);
}
