import { COMMON_WORDS } from './commonWords';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { isProfane } from './profanity';

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
    errorType?: 'PROPER_NOUN' | 'INVALID' | 'NETWORK_ERROR';
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

// Core English 2-letter words and common lexicalized abbreviations.
const CORE_2_LETTER_WORDS = new Set([
    "TO", "IN", "IS", "IT", "AS", "AT", "BE", "BY", "DO", "HE", "IF", "ME", "MY", "NO", "OF", "ON", "OR", "SO", "UP", "US", "WE", "GO", "AM", "AN", "OX", "OH", "HI", "OK",
    "AI", "TV", "ID", "PC", "VR", "AR", "PR", "IQ", "EQ", "DJ", "HR"
]);

// Whitelist for common abbreviations that are accepted as "words" in general usage.
const ABBREVIATION_WHITELIST = new Set([
    "AI", "TV", "ID", "PC", "VR", "AR", "PR", "IQ", "EQ", "DJ", "HR",
    "USA", "FBI", "CIA", "BBC", "CNN", "KGB", "NSA", "DVD", "PDF", "SIM", "USB", "WWW", "RAM", "CPU", "GPU",
    "APP", "URL", "ATM", "GPS", "VPN", "VIP", "GYM", "LAB", "DNA", "UFO", "PIN", "SOS",
    "BBQ", "DIY", "FAQ", "BTW", "LOL", "OMG", "RIP", "CEO", "CTO", "CFO", "COO"
]);

// Keywords in Chinese translations that indicate an entry should be blocked for users under 13.
const ABBR_KEYWORDS = ["缩写", "abbr.", "简称", "代码", "符号", "大写", "常用作", "公司", "机构", "组织"];

/**
 * Validates the word using Free Dictionary API and fetches Chinese definition from Youdao.
 * Uses a fallback list of common words for words not in the dictionary API.
 * Returns true for isValid if Free Dictionary returns 200 or word is in common words list.
 * Chinese definition is fetched via proxy to avoid CORS.
 */
export async function checkWordDefinition(word: string): Promise<WordResult> {
    const cleanWord = word.trim();
    if (!cleanWord) return { isValid: false, chinese: '', errorType: 'INVALID' };

    const upperWord = cleanWord.toUpperCase();

    // 1. Minimum Length Multi-check: 
    // - Only 'A' and 'I' allowed for single letters
    if (upperWord.length === 1 && upperWord !== 'A' && upperWord !== 'I') {
        return { isValid: false, chinese: '', errorType: 'INVALID' };
    }

    // - Strict whitelist for 2-letter words (Intercepts "NI", "LI", etc.)
    if (upperWord.length === 2 && !CORE_2_LETTER_WORDS.has(upperWord)) {
        return { isValid: false, chinese: '', errorType: 'INVALID' };
    }

    // 2. Profanity Filter
    if (isProfane(upperWord)) {
        return { isValid: false, chinese: '涉嫌色情、低俗或敏感词汇', errorType: 'INVALID' };
    }

    // Check common words list (includes some prepositions, conjunctions, etc.)
    if (COMMON_WORDS.has(upperWord)) {
        const chinese = COMMON_WORDS.get(upperWord) || '';

        // If it's a known abbreviation in our local list (heuristic)
        // BYPASS check if word is in whitelist
        if (!ABBREVIATION_WHITELIST.has(upperWord) && ABBR_KEYWORDS.some(k => chinese.includes(k))) {
            return { isValid: false, chinese: '', errorType: 'INVALID' };
        }

        return { isValid: true, chinese };
    }

    try {
        // 1. Validate existence with Free Dictionary API - normalize to lowercase
        const freeDictRes = await universalFetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord.toLowerCase()}`);

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

            // 3. Abbreviation Check (Free Dictionary meanings often contain "abbreviation")
            const isAbbr = firstEntry.meanings.some((m: any) =>
                m.partOfSpeech.toLowerCase().includes('abbreviation') ||
                m.definitions.some((d: any) => d.definition.toLowerCase().includes('short for'))
            );
            if (isAbbr) return { isValid: false, chinese: '', errorType: 'INVALID' };

            // 4. Fetch Chinese definition from Youdao
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

                    // Youdao side abbreviation check
                    // BYPASS check if word is in whitelist
                    if (!ABBREVIATION_WHITELIST.has(upperWord) && ABBR_KEYWORDS.some(k => chineseDef.includes(k))) {
                        return { isValid: false, chinese: chineseDef, errorType: 'INVALID' };
                    }
                }
            } catch (e) {
                console.error('Youdao API failed:', e);
            }

            // 3. Name Exclusion Check: If translation identifies it as a person's name
            // BUT allow if it also has other common meanings (v., adj., adv., prep., conj., pron.)
            const nameKeywords = ["人名", "姓氏", "男子名", "女子名"];
            const hasNameKeyword = nameKeywords.some(k => chineseDef.includes(k));
            const hasOtherPOS = ["v.", "adj.", "adv.", "prep.", "conj.", "pron."].some(k => chineseDef.includes(k));

            if (hasNameKeyword && !hasOtherPOS) {
                return { isValid: false, chinese: chineseDef, errorType: 'PROPER_NOUN' };
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
        // If fetch throws, it's almost certainly a network issue
        return { isValid: false, chinese: '', errorType: 'NETWORK_ERROR' };
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
            .filter((item: any) =>
                item.word.length >= 6 &&
                item.word.length <= 12 &&
                /^[A-Z]+$/.test(item.word) &&
                !isProfane(item.word)
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

/**
 * Finds a valid English word that can be constructed from sourceWord but hasn't been used yet.
 * Improved algorithm:
 * 1. Exhaustive check in local COMMON_WORDS (High quality, 100% hits if in list).
 * 2. Parallel API queries for ALL unique possible starting letters.
 * 3. Pre-shuffles and validates to ensure high success rate.
 */
export async function findValidHint(sourceWord: string, usedWords: Set<string>): Promise<string | null> {
    try {
        const s = sourceWord.toUpperCase();
        const uniqueChars = Array.from(new Set(s.split(''))).sort(() => 0.5 - Math.random());

        // --- Step 1: Exhaustive Local Search (FAST & RELIABLE) ---
        const localCandidates: { word: string, freq: number }[] = [];
        for (const [word] of COMMON_WORDS.entries()) {
            const uword = word.toUpperCase();
            const isAllowedSingle = uword === 'A' || uword === 'I';
            if ((uword.length >= 2 || isAllowedSingle) && uword.length <= 12 && uword !== s && !usedWords.has(uword) && canConstruct(uword, s) && !isProfane(uword)) {
                localCandidates.push({ word: uword, freq: 5000 });
            }
        }

        // If we found enough local common words, just use them (instant & high quality)
        if (localCandidates.length >= 3) {
            const shuffled = localCandidates.sort(() => 0.5 - Math.random());
            // Still sort by frequency just in case we have many, but they all have 5000 here
            return shuffled[0].word;
        }

        // --- Step 2: Comprehensive API Search (Fallback) ---
        // Only if local common words are exhausted
        const fetchForLetter = async (char: string) => {
            const response = await universalFetch(`https://api.datamuse.com/words?sp=${char}*&max=200&md=f`);
            if (!response.ok) return [];
            return await response.json();
        };

        const results = await Promise.all(uniqueChars.map(c => fetchForLetter(c)));
        const allApiResults = results.flat();

        // Screen API results
        const seen = new Set<string>();
        const validApiCandidates: { word: string, freq: number }[] = [];

        // Randomize API candidates to vary results
        const randomApi = allApiResults.sort(() => 0.5 - Math.random());

        for (const item of randomApi) {
            const word = item.word.toUpperCase();
            if (seen.has(word)) continue;
            const isAllowedSingle = word === 'A' || word === 'I';
            if ((word.length < 2 && !isAllowedSingle) || word.length > 12) continue;
            if (word === s) continue;
            if (usedWords.has(word)) continue;
            if (COMMON_WORDS.has(word)) continue; // Already handled in Step 1
            if (!/^[A-Z]+$/.test(word)) continue;
            if (isProfane(word)) continue;

            if (canConstruct(word, s)) {
                const validation = await checkWordDefinition(word);
                if (validation.isValid) {
                    seen.add(word);
                    const freq = parseFloat(item.tags?.find((t: string) => t.startsWith('f:'))?.split(':')[1] || '0');
                    validApiCandidates.push({ word, freq });
                    if (validApiCandidates.length >= 5) break;
                }
            }
        }

        // Combine findings
        const finalPool = [...localCandidates, ...validApiCandidates];
        if (finalPool.length === 0) return null;

        finalPool.sort((a, b) => b.freq - a.freq);
        return finalPool[0].word;

    } catch (e) {
        console.error("Failed to find hint", e);
        return null;
    }
}
