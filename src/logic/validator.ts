export interface WordResult {
    isValid: boolean;
    chinese: string;
}

/**
 * Checks if the target word can be constructed from the source word.
 * It ensures that every letter in target exists in source and
 * the count of each letter in target does not exceed that in source.
 * Case insensitive.
 */
export function canConstruct(target: string, source: string): boolean {
    const t = target.toUpperCase();
    const s = source.toUpperCase();

    const sourceCounts: Record<string, number> = {};
    for (const char of s) {
        sourceCounts[char] = (sourceCounts[char] || 0) + 1;
    }

    const targetCounts: Record<string, number> = {};
    for (const char of t) {
        if (!sourceCounts[char]) return false; // Contains letter not in source
        targetCounts[char] = (targetCounts[char] || 0) + 1;

        if (targetCounts[char] > sourceCounts[char]) {
            return false; // Exceeds frequency
        }
    }

    return true;
}

/**
 * Validates the word using Free Dictionary API and fetches Chinese definition from Youdao.
 * Returns true for isValid if Free Dictionary returns 200.
 * Chinese definition is fetched via proxy to avoid CORS.
 */
export async function checkWordDefinition(word: string): Promise<WordResult> {
    const cleanWord = word.trim();
    if (!cleanWord) return { isValid: false, chinese: '' };

    try {
        // 1. Validate existence with Free Dictionary API
        const freeDictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);

        if (freeDictRes.status === 404) {
            return { isValid: false, chinese: '' };
        }

        if (!freeDictRes.ok) {
            // Fallback or error handling for other statuses
            console.warn('Free Dictionary API Error:', freeDictRes.statusText);
            // If API is down, we might want to fail safe or fail hard. 
            // For this game, let's assume if it's not 404, it might be valid but we failed to check?
            // Let's treat non-200/404 as invalid for safety or valid if we trust user?
            // Requirement: "If found... valid. Otherwise invalid." -> So strictly check 200.
            return { isValid: false, chinese: '' };
        }

        // 2. Fetch Chinese definition from Youdao via Proxy
        // Youdao Suggest API: https://dict.youdao.com/suggest?num=1&doctype=json&q=WORD
        // Proxied to: /api/proxy/youdao/suggest...
        let chineseDef = '';
        try {
            const youdaoRes = await fetch(`/api/proxy/youdao/suggest?num=1&doctype=json&q=${cleanWord}`);
            if (youdaoRes.ok) {
                const data = await youdaoRes.json();
                // data.data.entries[0].explain usually holds the definition
                if (data.data && data.data.entries && data.data.entries.length > 0) {
                    chineseDef = data.data.entries[0].explain;
                }
            }
        } catch (e) {
            console.error('Youdao API failed:', e);
            // Main validation passed, so checking failed only affects Chinese display.
            // We still return true for isValid.
        }

        return { isValid: true, chinese: chineseDef };

    } catch (error) {
        console.error('Validation error:', error);
        return { isValid: false, chinese: '' };
    }
}

/**
 * Fetches 10 random 8+ letter words using DataMuse API.
 * Strategies for better results:
 * 1. Randomize starting letter to avoid "Always starting with A".
 * 2. Fetch from two different letters to mix it up.
 * 3. Use 'md=f' (frequency metadata) to prefer common words (higher usage count).
 */
export async function fetchNewPresets(): Promise<string[]> {
    try {
        // Removed Q, X, Z, Y etc to avoid weird words, focused on common starting letters
        const alphabet = "BCDEFGHIJKLMNOPRSTUVW";

        // Pick two distinct random starting letters
        const char1 = alphabet[Math.floor(Math.random() * alphabet.length)];
        let char2 = alphabet[Math.floor(Math.random() * alphabet.length)];
        while (char2 === char1) char2 = alphabet[Math.floor(Math.random() * alphabet.length)];

        // Helper to fetch words starting with a specific char
        // sp=${char}???????* -> Starts with char, followed by at least 7 chars (total 8+), * allows more.
        const fetchForLetter = async (char: string) => {
            // max=50 to get a good pool with metadata
            const response = await fetch(`https://api.datamuse.com/words?sp=${char}???????*&max=50&md=f`);
            if (!response.ok) return [];
            return await response.json();
        };

        const [data1, data2] = await Promise.all([
            fetchForLetter(char1),
            fetchForLetter(char2)
        ]);

        const allItems = [...(data1 || []), ...(data2 || [])];

        // Process results
        const candidates = allItems
            .map((item: any) => {
                const word = item.word ? item.word.toUpperCase() : '';
                // Parse frequency from tags e.g. ["f:12.34"]
                let freq = 0;
                if (item.tags) {
                    const fTag = item.tags.find((t: string) => t.startsWith('f:'));
                    if (fTag) freq = parseFloat(fTag.split(':')[1]);
                }
                return { word, freq };
            })
            .filter(item =>
                item.word.length >= 8 &&
                item.word.length <= 12 &&
                /^[A-Z]+$/.test(item.word) // valid letters only
            );

        // Sort by frequency descending (Common words first)
        candidates.sort((a, b) => b.freq - a.freq);

        // Take top 40 common words from the results to ensure quality
        // Then shuffle them to ensure variety (not just the same top 10 always)
        const topCandidates = candidates.slice(0, 40);

        const shuffled = topCandidates.sort(() => 0.5 - Math.random());

        return shuffled.slice(0, 10).map(i => i.word);

    } catch (e) {
        console.error("Failed to fetch presets", e);
        return [];
    }
}
