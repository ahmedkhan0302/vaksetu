/**
 * Placeholder logic mimicking your upcoming Python FastAPI backend.
 * Wait for backend deployment to replace this function body with an actual HTTP fetch request.
 */
export async function fetchGlossesFromText(englishText: string): Promise<string[]> {
    // Basic defensive checks
    if (!englishText || typeof englishText !== 'string') return [];

    // Simulate backend network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock NLP parser: strip punctuation, split by space, uppercase everything
    const washedText = englishText.replace(/[^\w\s]|_/g, "").trim().toUpperCase();
    const rawWords = washedText.split(/\s+/).filter(w => w.length > 0);

    // Later: You can map stop words here natively, or rely on FastAPI for AI alignment
    return rawWords;
}
