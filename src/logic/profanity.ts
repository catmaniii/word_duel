/**
 * Comprehensive safety filters for youth-friendly applications (U13).
 * Covers Sexual Content, Violence, Drugs, Hate Speech, Gambling, and Slurs.
 */

// 1. Sexual & Explicit (PORN, Anatomy, Acts)
const SEX_WORDS = [
    "PORN", "PORNOGRAPHY", "SEX", "SEXUAL", "BDSM", "FETISH", "EROTIC", "HENTAI",
    "PENIS", "VAGINA", "CLITORIS", "ERECTION", "EJACULATE", "ORGASM", "ANUS", "ANAL",
    "RECTUM", "SPERM", "SEMEN", "TESTICLE", "SCROTUM", "PUBIC", "MASTURBATE", "MASTURBATION",
    "FELLATIO", "CUNNILINGUS", "BLOWJOB", "HANDJOB", "DEEPTHROAT", "THREESOME", "ORGY",
    "DILDO", "VIBRATOR", "CONDOM", "TITTY", "TITS", "NIPPLE", "BREAST", "BOOB", "CLIT",
    "CUM", "COCK", "DICK", "PUSSY", "SLUT", "WHORE", "HOOKER", "STRIPPER", "ESCORT",
    "GAY", "LESBIAN", "QUEER", "HOMO", "TRANS", "TRANSSEXUAL", "SADISM", "MASOCHISM"
];

// 2. Violence & Gore
const VIOLENCE_WORDS = [
    "KILL", "KILLER", "MURDER", "MURDERER", "SUICIDE", "GENOCIDE", "HOMICIDE", "SLAUGHTER",
    "BLOOD", "BLOODY", "GORE", "CORPSE", "DEATH", "DEAD", "STAB", "SHOOT", "BOMB", "TERRORIST",
    "JIHAD", "BEHEAD", "TORTURE", "RAPE", "RAPIST", "MOLEST", "PEDOPHILE", "INCEST", "EXECUTE", "HANGING"
];

// 2b. Weaponry
const WEAPONRY_WORDS = [
    "GUN", "KNIFE", "RIFLE", "PISTOL", "SNIPER", "GRENADE", "FIREARM", "WEAPON"
];

// 3. Drugs & Alcohol
const DRUG_WORDS = [
    "COCAINE", "HEROIN", "METH", "METHAMPHETAMINE", "ECSTASY", "MDMA", "LSD", "ACID",
    "MARIJUANA", "CANNABIS", "WEED", "KUSH", "POT", "JOINT", "BONG", "CRACK", "CRACKHEAD",
    "COKE", "NEEDLE", "SYRINGE", "DRUG", "NARCOTIC", "ALCOHOL", "LIQUOR", "WHISKEY", "VODKA",
    "TOBACCO", "CIGARETTE", "VAPE", "VAPING", "OPIUM", "FENTANYL", "PILL", "STEROID"
];

// 4. Hate Speech & Slurs
const SLUR_WORDS = [
    "NIGGER", "NIGGA", "FAGGOT", "RETARD", "DYKE", "KIKE", "SPIC", "CHINK", "GOOK", "COON",
    "WOG", "REDECK", "NAZI", "HITLER", "SWASTIKA", "WHITEPOWER", "ARYAN"
];

// 5. Gambling
const GAMBLING_WORDS = [
    "CASINO", "GAMBLE", "BETTING", "POKER", "SLOTS", "JACKPOT", "BOOKIE", "LOTTERY"
];

// 6. Common Profanity (Swear words)
const SWEAR_WORDS = [
    "FUCK", "SHIT", "BITCH", "ASS", "ASSHOLE", "ARSE", "ARSEHOLE", "BASTARD", "DAMN",
    "HELL", "PISS", "WANKER", "TOSSER", "BOLLOCKS", "BUGGER", "CRAP"
];

const PROFANE_WORDS = new Set([
    ...SEX_WORDS, ...VIOLENCE_WORDS, ...WEAPONRY_WORDS, ...DRUG_WORDS, ...SLUR_WORDS, ...GAMBLING_WORDS, ...SWEAR_WORDS
]);

/**
 * Normalizes a word by handling leetspeak and symbols.
 */
function normalizeWord(word: string): string {
    let w = word.trim().toUpperCase();

    // Basic leetspeak mapping
    const leetMap: Record<string, string> = {
        '0': 'O',
        '1': 'I',
        '3': 'E',
        '4': 'A',
        '5': 'S',
        '7': 'T',
        '8': 'B'
    };

    let normalized = "";
    for (const char of w) {
        normalized += leetMap[char] || char;
    }

    // Remove symbols/numbers that might be used to obfuscate (e.g. F.U.C.K or SH1T)
    return normalized.replace(/[^A-Z]/g, '');
}

/**
 * Checks if a word is considered profane or offensive.
 */
export function isProfane(word: string): boolean {
    const raw = word.trim().toUpperCase();
    if (!raw) return false;

    // 1. Direct match on raw input
    if (PROFANE_WORDS.has(raw)) return true;

    // 2. Normalize and check again
    const normalized = normalizeWord(raw);
    if (normalized.length > 0 && PROFANE_WORDS.has(normalized)) return true;

    // 3. Substring check for high-risk roots
    const highRiskRoots = [
        "FUCK", "SHIT", "CUNT", "NIGGER", "FAGGOT", "COCK", "PUSSY", "PORN", "PEDO", "RAPE"
    ];

    for (const root of highRiskRoots) {
        if (normalized.includes(root)) return true;
    }

    return false;
}
