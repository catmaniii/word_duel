import { COMMON_WORDS } from './commonWords';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

/**
 * A helper to make HTTP requests that works on both web and native.
 * On native, it uses CapacitorHttp to bypass CORS.
 */
async function universalFetch(url: string) {
    if (Capacitor.isNativePlatform()) {
        try {
            const response = await CapacitorHttp.get({ url });
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                json: async () => response.data
            };
        } catch (e) {
            console.error('CapacitorHttp error:', e);
            throw e;
        }
    }
    return fetch(url);
}

export interface WordResult {
    isValid: boolean;
    chinese: string;
    errorType?: 'PROPER_NOUN' | 'INVALID';
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
 * Uses a fallback list of common words for words not in the dictionary API.
 * Returns true for isValid if Free Dictionary returns 200 or word is in common words list.
 * Chinese definition is fetched via proxy to avoid CORS.
 */
export async function checkWordDefinition(word: string): Promise<WordResult> {
    const cleanWord = word.trim();
    if (!cleanWord) return { isValid: false, chinese: '', errorType: 'INVALID' };

    // Check common words list first (prepositions, conjunctions, etc.)
    const upperWord = cleanWord.toUpperCase();
    if (COMMON_WORDS.has(upperWord)) {
        const chinese = COMMON_WORDS.get(upperWord) || '';
        return { isValid: true, chinese };
    }

    try {
        // 1. Validate existence with Free Dictionary API
        const freeDictRes = await universalFetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);

        if (freeDictRes.ok) {
            const data = await freeDictRes.json();
            const firstEntry = data[0];

            // Heuristic for Proper Nouns in Free Dictionary
            let isProp = false;

            for (const meaning of firstEntry.meanings) {
                const pos = meaning.partOfSpeech.toLowerCase();
                if (pos.includes('proper noun')) isProp = true;
            }

            if (isProp) return { isValid: false, chinese: '', errorType: 'PROPER_NOUN' };

            // 2. Fetch Chinese definition from Youdao
            let chineseDef = '';
            try {
                const isNative = Capacitor.isNativePlatform();
                const wordLower = cleanWord.toLowerCase();

                // Helper to get correct URL format
                const getUrl = (q: string) => isNative
                    ? `https://dict.youdao.com/suggest?num=1&doctype=json&q=${q}`
                    : `/api/proxy/youdao/suggest?num=1&doctype=json&q=${q}`;

                // Try lowercase first (favors standard dictionary words)
                const resLower = await universalFetch(getUrl(wordLower));
                let data = resLower.ok ? await resLower.json() : null;

                // Fallback to original casing if no entries found
                if (!data?.data?.entries || data.data.entries.length === 0) {
                    const resOrig = await universalFetch(getUrl(cleanWord));
                    if (resOrig.ok) {
                        data = await resOrig.json();
                    }
                }

                if (data?.data?.entries && data.data.entries.length > 0) {
                    chineseDef = data.data.entries[0].explain;
                }
            } catch (e) {
                console.error('Youdao API failed:', e);
            }

            return { isValid: true, chinese: chineseDef };
        }

        // If 404 or other issues, check DataMuse for Proper Noun tag
        // (Free Dictionary often 404s for common names/cities)
        try {
            const dataMuseRes = await universalFetch(`https://api.datamuse.com/words?sp=${cleanWord}&md=p&max=1`);
            if (dataMuseRes.ok) {
                const dmData = await dataMuseRes.json();
                if (dmData.length > 0 && dmData[0].word.toLowerCase() === cleanWord.toLowerCase()) {
                    const tags = dmData[0].tags || [];
                    if (tags.includes('prop')) {
                        return { isValid: false, chinese: '', errorType: 'PROPER_NOUN' };
                    }
                }
            }
        } catch (e) {
            console.error('DataMuse check failed:', e);
        }

        return { isValid: false, chinese: '', errorType: 'INVALID' };

    } catch (error) {
        console.error('Validation error:', error);
        return { isValid: false, chinese: '', errorType: 'INVALID' };
    }
}

/**
 * Fetches 10 random 6-12 letter words using DataMuse API.
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
        // sp=${char}?????* -> Starts with char, followed by at least 5 chars (total 6+), * allows more.
        const fetchForLetter = async (char: string) => {
            // max=50 to get a good pool with metadata
            const response = await universalFetch(`https://api.datamuse.com/words?sp=${char}?????*&max=50&md=f`);
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
                item.word.length >= 6 &&
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
