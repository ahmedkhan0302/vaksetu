/**
 * Placeholder logic mimicking your upcoming Python FastAPI backend.
 * Wait for backend deployment to replace this function body with an actual HTTP fetch request.
 */
export async function fetchGlossesFromText(englishText: string): Promise<string[]> {
    // Basic defensive checks
    if (!englishText || typeof englishText !== 'string') return [];

    try {
        const url = process.env.NEXT_PUBLIC_GLOSS_API_URL || 'http://localhost:8000/convert-text-to-gloss';
        
        const response = await fetch(url, {
            method: 'POST', // Assuming standard JSON Body mapping for the FastAPI endpoint
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: englishText })
        });
        
        if (!response.ok) {
            throw new Error(`Gloss API HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // The endpoint strictly returns { "glosses": ["hello", "friend"] }
        if (data.glosses && Array.isArray(data.glosses)) {
            // Guarantee .mp4 local mapping case parity natively
            return data.glosses.map((word: string) => word.toUpperCase());
        }
        
        return [];
    } catch (err) {
        console.warn("FastAPI gloss mapping failed or endpoint is inactive, falling back to local manual heuristic parser:", err);
        // Fallback robust logic safely defaults back to naive word splitting
        const washedText = englishText.replace(/[^\w\s]|_/g, "").trim().toUpperCase();
        return washedText.split(/\s+/).filter(w => w.length > 0);
    }
}
