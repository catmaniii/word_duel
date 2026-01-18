const fs = require('fs');
const path = require('path');

// Mocking canConstruct
function canConstruct(target, source) {
    const s = source.toUpperCase();
    const t = target.toUpperCase();
    const counts = {};
    for (const char of s) {
        counts[char] = (counts[char] || 0) + 1;
    }
    for (const char of t) {
        if (!counts[char]) return false;
        counts[char]--;
    }
    return true;
}

// Reading COMMON_WORDS
const content = fs.readFileSync(path.join(__dirname, '../src/logic/commonWords.ts'), 'utf8');
const wordsMatch = content.match(/\["([A-Z]+)"/g);
const commonWords = wordsMatch ? wordsMatch.map(m => m.slice(2, -1)) : [];

const testPool = [
    // Original list
    "SCHOOL", "FAMILY", "STREET", "PEOPLE", "MOTHER", "FATHER", "SYSTEM", "HEALTH", "WINDOW", "GARDEN",
    "COFFEE", "OFFICE", "PLAYER", "RESULT", "MARKET", "NATION", "POLICY", "PUBLIC", "SERIES", "SPRING",
    "SUMMER", "WINTER", "AUTUMN", "ACTION", "BEAUTY", "BRIDGE", "CHANCE", "CHOICE", "CHURCH", "COLOUR",
    "COURSE", "DANGER", "DEVICE", "DINNER", "DOCTOR", "DREAMS", "DRIVER", "ENERGY", "ENGINE", "EUROPE",
    "EVENTS", "EXPERT", "FACTOR", "FIELDS", "FIGURE", "FINGER", "FUTURE", "GROUND", "GUITAR", "HEIGHT",
    "ISLAND", "JORDAN", "KITCHEN", "LEADER", "LETTER", "LIQUID", "LISTEN", "LIVING", "LONDON", "MEMORY",
    "METHOD", "MINUTE", "MIRROR", "MOBILE", "MODERN", "MOMENT", "MOUNTS", "MUSEUM", "NATURE", "NUMBER",
    "OBJECT", "ORANGE", "PARENT", "PERIOD", "PERSON", "PHONE", "PHOTO", "PICTURE", "PLANET", "POCKET",
    "POISON", "PRISON", "RECORD", "REGION", "REPAIR", "REPEAT", "REPORT", "RETURN", "REVIEW", "REWARD",
    "ROCKET", "SAFETY", "SCREEN", "SEARCH", "SEASON", "SECOND", "SECRET", "SELECT", "SIGNAL", "SILVER",
    "SIMPLE", "SINGLE", "SISTER", "SOCIAL", "SOURCE", "SPIRIT", "SQUARE", "STABLE", "STAGES", "STATUS",
    "STREAM", "STRONG", "STUDIO", "SUBMIT", "TARGET", "THEORY", "THINGS", "TICKET", "TONGUE", "TRAVEL",
    "VALLEY", "VESSEL", "VICTIM", "VISION", "VOLUME", "WEAPON", "WEIGHT", "WRITER", "YELLOW", "ZEBRA",
    // 200+ New words from search
    "ABROAD", "ABSORB", "ABSURD", "ACCENT", "ACCEPT", "ACCESS", "ACCORD", "ACCUSE", "ACROSS", "ACTING",
    "ACTIVE", "ACTORS", "ACTUAL", "ADAPTS", "ADDICT", "ADDING", "ADHERE", "ADJUST", "ADMIRE", "ADMITS",
    "ADOPTS", "ADULTS", "ADVERB", "ADVICE", "ADVISE", "AFFAIR", "AFFECT", "AFFORD", "AFRAID", "AGENCY",
    "AGENDA", "ALMOST", "ALWAYS", "AMOUNT", "ANIMAL", "ANNUAL", "ANSWER", "ANYONE", "APPEAL", "APPEAR",
    "ARRIVE", "ARTIST", "AROUND", "ASSERT", "ASSESS", "ASSIGN", "ASSIST", "ASSUME", "ASPECT", "ASLEEP",
    "ATTACK", "ATTEND", "ATTACH", "AUTHOR", "AVENUE", "BACKED", "BACKER", "BACKUP", "BAKERY", "BALLAD",
    "BALLET", "BAMBOO", "BANANA", "BANDIT", "BANKER", "BANNER", "BARBER", "BARELY", "BARREL", "BARREN",
    "BASKET", "BATTLE", "BECAME", "BECOME", "BEFORE", "BEHALF", "BEHIND", "BELIEF", "BELONG", "BESIDE",
    "BETTER", "BEYOND", "BISHOP", "BORDER", "BORROW", "BOTHER", "BOTTLE", "BOTTOM", "BRANCH", "BRAVER",
    "BREAST", "BREATH", "BRIGHT", "BROKEN", "BUDGET", "BULLET", "BURDEN", "BUTTON", "BUTTER", "CAMERA",
    "CARBON", "CAREER", "CASTLE", "CASUAL", "CAUGHT", "CHANGE", "CHARGER", "CHERRY", "CHOSEN", "CIRCLE",
    "CLIENT", "CLOSET", "CLOSER", "COLUMN", "COMBAT", "COMMON", "COSTLY", "COUPLE", "COUSIN", "CRAYON",
    "CREDIT", "DECADE", "DECIDE", "DEFEND", "DEGREE", "DEMAND", "DEPUTY", "DESERT", "DETAIL", "DETECT",
    "DIFFER", "DOUBLE", "DRAWER", "DRIVEN", "DURING", "EASILY", "EATING", "EDITOR", "EFFECT", "EFFORT",
    "EITHER", "ELEVEN", "EMERGE", "EMPIRE", "EMPLOY", "ENABLE", "ENDING", "ENERGY", "ENGAGE", "ENGINE",
    "ENJOY", "ENOUGH", "ENROLL", "ENSURE", "ENTIRE", "ENTITY", "EQUAL", "EQUITY", "ESCORT", "ESTATE",
    "ETHNIC", "EVOLVE", "EXAM", "EXCEPT", "EXCESS", "EXCITE", "EXCUSE", "EXEMPT", "EXISTS", "EXPAND",
    "EXPECT", "EXPORT", "EXTENT", "FABRIC", "FACIAL", "FACING", "FACTOR", "FAILED", "FAIRLY", "FALLEN",
    "FAMOUS", "FATHER", "FAULTS", "FAVORS", "FEAR", "FELLOW", "FEMALE", "FIBER", "FIELDS", "FIFTHS",
    "FIGHTS", "FIGURE", "FILLED", "FILLER", "FILTER", "FINELY", "FINISH", "FINITE", "FIRMLY", "FISCAL",
    "FITTED", "FLIGHT", "FLOORS", "FLOWER", "FLYING", "FOCUS", "FOLLOW", "FORCED", "FORGET", "FORMAL",
    "FORMAT", "FORMED", "FORMER", "FOSSIL", "FOSTER", "FOUGHT", "FOURTH", "FRAMED", "FREELY", "FRENCH",
    "FRIEND", "FRONTS", "FRUITS", "FUEL", "FULLY", "FUND", "FUNNY", "FUTURE", "GARDEN", "GATHER",
    "GENDER", "GENTLE", "GERMAN", "GHOSTS", "GIVING", "GLOBAL", "GLOVES", "GOLDEN", "GOTTEN", "GOVERN",
    "GRABBD", "GRADES", "GROUPS", "GROWTH", "GUARDS", "GUILTY", "GUITAR", "HABITS", "HANDLE", "HAPPEN",
    "HARDLY", "HEALTH", "HEAVYS", "HEIGHT", "HELPED", "HELPER", "HIDDEN", "HIGHER", "HIGHLY", "HOCKEY",
    "HOLDER", "HOLLOW", "HONEST"
];

console.log("Testing " + testPool.length + " source words against " + commonWords.length + " local words...");

let zeroHintWords = [];
let lowHintWords = [];

testPool.forEach(source => {
    const hits = commonWords.filter(w => w !== source && canConstruct(w, source));
    if (hits.length === 0) {
        zeroHintWords.push(source);
    } else if (hits.length < 2) { // Checking for even tighter coverage
        lowHintWords.push({ word: source, count: hits.length, hints: hits });
    }
});

console.log("\nWords with ZERO local hints: " + zeroHintWords.length);
if (zeroHintWords.length > 0) {
    console.log(zeroHintWords.join(", "));
}

console.log("\nWords with FEWER than 2 local hints: " + lowHintWords.length);
lowHintWords.forEach(h => {
    console.log(h.word + " (" + h.count + "): " + h.hints.join(", "));
});

if (zeroHintWords.length === 0 && lowHintWords.length === 0) {
    console.log("\nAll tested words have healthy local hint coverage (at least 2 per word)!");
}
