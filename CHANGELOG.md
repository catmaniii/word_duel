# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Sound Effects System**: Implemented cute sound effects for all interactive elements (Click, Success, Error, Start, etc.).
- **Fallback Word Validation**: Added `COMMON_WORDS` system to handle common words (e.g., "FOR", "THE") and added detailed dictionary-style definitions.
- **Word Length Limit**: Enforced 6-12 letter constraint on source words across the entire app.
- **Auto-Scroll Discovery**: History list now automatically scrolls to the bottom when new words are added.
- **Dynamic Initial Presets**: Start screen now fetches random words instantly upon loading.
- **Game Screen Branding**: Added a stylized "WORD DUEL" title to the game top bar.
- **Magic Reveal**: Clicked/tapped the Source Word to toggle its Chinese definition with a smooth animation.
- **Strict Word Validation**: Added detection and blocking of proper nouns (names/places) with specific error messages.
- **Smart Input Focus**: 
  - PC: Input box auto-refocuses after submission for continuous typing.
  - PC: If a word is invalid, the input box automatically gains focus and selects the bad text for quick overwriting.
  - Mobile: Input box no longer auto-focuses on entry to prevent keyboard from covering UI.

### Changed
- **Compact UI Overhaul**: 
  - Reduced overall margins/paddings and tightened history bubbles (tighter line height/gaps).
  - Redesigned source word display with 3D text shadow instead of a bulky box.
- **UI Reorganization**: 
  - Main game layout reordered for better flow.
  - Reorganized top bar into a balanced three-column layout (Quit, Title, Log).
  - Fixed preset word container height to 150px.
- **Horizontal Scrolling**: Added support for long words and error messages in constrained areas.
- **Dictionary Formatting**: Standardized local word definitions to professional dictionary style.

### Fixed
- **Sound Latency**: Optimized audio context initialization and attack time (20ms → 5ms) for instant feedback.
- **Preset UI Stability**: Preset buttons now remain visible (but disabled) during refresh to prevent content flickering.

---

## [1.0.0] - 2026-01-17

### Added
- Initial release of WORD DUEL game
- Two-player word construction game with Red vs Blue theme
- Integration with Free Dictionary API for word validation
- Chinese translation support via Youdao Dictionary
- Responsive design for desktop and mobile
- Dynamic background colors based on current player
- Letter pool with usage tracking
- Game history with bubble-style chat interface
- Preset word suggestions with refresh capability
