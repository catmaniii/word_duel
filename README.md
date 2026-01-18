# ⚔️ WORD DUEL

**WORD DUEL** is a fast-paced, two-player word construction game. Battle against a friend (Player 1 Red vs Player 2 Blue) to see who can build the most words from a single source word!

## 🕹️ How to Play

1.  **Start the Game**: One player enters a 6-12 letter word, or picks one from the random presets.
2.  **Construct Words**: Players take turns building new English words using *only* the letters available in the main source word.
3.  **Score Points**: Each valid word earns you points based on its length (1 letter = 1 point).
4.  **Win the Duel**: The player with the highest score at the end wins!

### 📜 Pro Rules
- **No Repeats**: You can't use the same word twice.
- **Strict Vocabulary**: Proper nouns (names/places) are not allowed.
- **Magic Reveal**: Stuck on the source word? Click/Hold the source word to reveal its Chinese definition for inspiration!

## 🚀 Deployment

The project is built with React + Vite + TypeScript. You can deploy it to Vercel with one click:

1. Push to GitHub.
2. Connect to Vercel.
3. Done! (Includes built-in API proxy for dictionary services).

## 💰 Monetization & Ads

Word Duel uses **Google AdMob** (Android) and **Google AdSense** (Web) for monetization.

### 📱 Android (AdMob)
- **App-ads.txt**: Hosted at `https://word-duel-five.vercel.app/app-ads.txt`
- **Toggling Ads**: Modify the following constant in `src/logic/adService.ts`:

```typescript
// src/logic/adService.ts
const USE_TEST_ADS = true; // Set to 'false' for Production
```

- **Test Mode (`true`)**: Uses Google's official test IDs. Safe for development.
- **Production Mode (`false`)**: Uses the real Ad Unit ID configured in the file.

### 🌐 Web (AdSense)
- **Auto-Switching**: The web version automatically uses a **2s countdown** on `localhost` for fast testing and a **15s countdown** on production domains to ensure ad visibility.
- **Ad Placement**: Banners appear inside the Hint Modal for a non-intrusive experience.

---

Developed with ❤️ by Antigravity.
