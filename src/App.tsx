import { useState, useEffect, useRef } from 'react'
import { canConstruct, checkWordDefinition, fetchNewPresets, findValidHint } from './logic/validator'
import { playSound, initAudio } from './logic/sound'
import { LetterPool } from './components/LetterPool'
import { HistoryList } from './components/HistoryList'
import { InputArea } from './components/InputArea'
import { PlayerStatus } from './components/PlayerStatus'
import { SidebarList } from './components/SidebarList'
import { AdSenseUnit } from './components/AdSenseUnit'
import { AdService } from './logic/adService'
import { Capacitor } from '@capacitor/core'

interface HistoryItem {
  word: string;
  player: number;
  chinese?: string;
}

const PRESETS = [
  "PROGRAMMING", "ARCHITECTURE", "JAVASCRIPT", "DEVELOPER",
  "ANTIGRAVITY", "DICTIONARY", "REVOLUTION",
  "PERSPECTIVE", "INTELLIGENCE"
];

function App() {
  // Init Audio Context on first click
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Game Setup State
  const [presets, setPresets] = useState<string[]>(PRESETS);
  const [isRefreshingPresets, setIsRefreshingPresets] = useState(false);

  // Fetch initial random presets on mount
  useEffect(() => {
    const loadInitialPresets = async () => {
      const newWords = await fetchNewPresets();
      if (newWords.length > 0) {
        setPresets(newWords);
      }
      // If fetch fails, keep the hardcoded PRESETS as fallback
    };
    loadInitialPresets();
  }, []);

  const handleRefreshPresets = async () => {
    playSound('click');
    setIsRefreshingPresets(true);
    const newWords = await fetchNewPresets();
    if (newWords.length > 0) {
      setPresets(newWords);
      playSound('refresh');
    }
    setIsRefreshingPresets(false);
  };

  const [sourceWord, setSourceWord] = useState('');
  const [sourceWordDef, setSourceWordDef] = useState('');
  const [showSourceDef, setShowSourceDef] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [setupInput, setSetupInput] = useState('');

  // Game Loop State
  const [playerCount, setPlayerCount] = useState(2);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [loser, setLoser] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Set<number>>(new Set());
  const [winner, setWinner] = useState<number | null>(null);
  const [showRoastModal, setShowRoastModal] = useState(false);

  // Input State
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showMobileLog, setShowMobileLog] = useState(false);

  // Hint / Ad States
  const [showAdModal, setShowAdModal] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [isHintBlinking, setIsHintBlinking] = useState(false);
  const [isSearchingHint, setIsSearchingHint] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Auto-scroll history to bottom
  const historyEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Styles for dynamic background
  useEffect(() => {
    if (isGameStarted && !isGameOver) {
      document.documentElement.style.setProperty('--player-accent', `var(--p${currentPlayer}-color)`);
      document.documentElement.style.setProperty('--player-bg', `var(--p${currentPlayer}-bg)`);
    } else if (isGameOver) {
      document.documentElement.style.setProperty('--player-accent', '#ff4444');
      document.documentElement.style.setProperty('--player-bg', '#000000');
    } else {
      document.documentElement.style.setProperty('--player-accent', '#646cff');
      document.documentElement.style.setProperty('--player-bg', '#f0f0f0');
    }
  }, [isGameStarted, isGameOver, currentPlayer]);

  // Initialize AdMob on mount
  useEffect(() => {
    AdService.initialize();
  }, []);

  const [setupError, setSetupError] = useState('');
  const [isSetupLoading, setIsSetupLoading] = useState(false);

  const runStartGame = async (word: string) => {
    playSound('click');
    const trimmedWord = word.trim().toUpperCase();
    if (trimmedWord.length < 6) {
      setSetupError("Word must be at least 6 letters long!");
      playSound('error');
      return;
    }
    if (trimmedWord.length > 12) {
      setSetupError("Word must be at most 12 letters long!");
      playSound('error');
      return;
    }

    setIsSetupLoading(true);
    setSetupError('');

    try {
      // Validate if it's a real word
      const result = await checkWordDefinition(trimmedWord);
      if (!result.isValid) {
        if (result.errorType === 'PROPER_NOUN') {
          setSetupError(`"${trimmedWord}" is a proper noun (name/place) and not allowed.`);
        } else if (result.errorType === 'NETWORK_ERROR') {
          setSetupError("网络不通畅，请检查网络连接！");
        } else {
          setSetupError(`"${trimmedWord}" is not a valid English word.`);
        }
        setIsSetupLoading(false);
        playSound('error');
        return;
      }

      // Success - Start Game
      playSound('start');
      setSourceWord(trimmedWord);
      setSourceWordDef(result.chinese || '');
      setShowSourceDef(false);
      setIsGameStarted(true);
      setHistory([]);
      setUsedWords(new Set());
      setCurrentPlayer(1);
      setInputValue('');
      setStatusMsg('');
      setShowMobileLog(false);
      setIsGameOver(false);
      setLoser(0);
    } catch (e) {
      setSetupError("Failed to validate word. Please try again.");
      playSound('error');
    } finally {
      setIsSetupLoading(false);
    }
  };

  const handleSubmitGuess = async () => {
    const word = inputValue.trim().toUpperCase();
    if (!word) return;

    setStatusMsg('');

    // 1. Check Uniqueness
    if (usedWords.has(word)) {
      setStatusMsg(`"${word}" has already been used!`);
      playSound('error');
      return;
    }

    // 1b. Check if word is same as source word
    if (word === sourceWord.toUpperCase()) {
      setStatusMsg(`Cannot use the source word "${word}" itself!`);
      playSound('error');
      return;
    }

    // 2. Check Construction
    if (!canConstruct(word, sourceWord)) {
      setStatusMsg(`Cannot construct "${word}" from source letters!`);
      playSound('error');
      return;
    }

    setIsLoading(true);

    // 3. API Validation
    const result = await checkWordDefinition(word);

    setIsLoading(false);

    if (result.isValid) {
      // Success!
      playSound('success');
      setHistory(prev => [...prev, { word, player: currentPlayer, chinese: result.chinese }]);
      setUsedWords(prev => new Set(prev).add(word));
      setInputValue('');
      handleNextTurn();
    } else {
      // Invalid word
      if (result.errorType === 'PROPER_NOUN') {
        setStatusMsg(`"${word}" is a proper noun and not allowed!`);
      } else if (result.errorType === 'NETWORK_ERROR') {
        setStatusMsg("网络不通畅，请检查网络连接！");
      } else {
        setStatusMsg(`"${word}" is not a valid English word!`);
      }
      playSound('error');
    }
  };

  const ROASTS = [
    "You couldn't find a word in a bowl of alphabet soup.",
    "A dictionary would be a great birthday gift for you.",
    "Is 'FAILURE' the only word in your internal dictionary?",
    "I've seen better vocabulary in a toddler's first book.",
    "Even autocorrect is embarrassed for you right now.",
    "Your vocabulary is like 1% battery – struggling to stay alive.",
    "Are you building words or just throwing random letters at the wall?",
    "You're the human version of a tragic typo.",
    "A spelling bee would be your ultimate nightmare.",
    "I've seen grocery lists with more linguistic depth.",
    "If words were money, you'd be deeply in debt.",
    "Did you lose your vocabulary in the laundry?",
    "Your brain is a 404 error: 'Word Not Found'.",
    "Somewhere, a Scrabble board is laughing at you.",
    "Is your neural network currently experiencing a spelling timeout?",
    "You're the reason they put 'Read carefully' on shampoo bottles.",
    "Watching you play is like watching someone try to spell 'CAT' with numbers.",
    "You would literally lose a word-off to a parrot.",
    "Is your vocabulary limited to 'Surrender' and 'Help'?",
    "Your brain cells are in a group chat, and 'Intelligence' just left.",
    "I've seen more depth in a shallow puddle than in your lexicon.",
    "Maybe stick to picture books for a while?",
    "Your mind is a vast desert of missing syllables.",
    "Did you skip English class, or just the parts with actual words?",
    "You struggle with 3-letter words, don't you? It's okay to admit it.",
    "Your 'Word Power' is currently in the negatives.",
    "Even a goldfish has a more extensive vocabulary than this.",
    "You couldn't find a synonym if your life depended on it.",
    "Is your head just a fancy case for a brain that's stuck on 'Loading'?",
    "If you were a book, you'd be a coloring book.",
    "You're the human equivalent of a blank page.",
    "Your word construction skills are like a house of cards... flat.",
    "Did your brain's 'Logic & Spelling' subscription expire?",
    "You're like a dictionary with only the blank pages left.",
    "If ignorance is bliss, you must be the happiest player alive.",
    "I thought you were a Duelist, but you're more like a 'Dullest'.",
    "Even the white flag is judging your lack of vocabulary.",
    "Go back to preschool and start with the vowels.",
    "Your brain is currently in 'Airplane Mode'. Reconnect and try again.",
    "I've seen smarter word choices from a bowl of cereal.",
  ];

  const handleNextTurn = () => {
    let next = (currentPlayer % playerCount) + 1;
    let attempts = 0;
    while (eliminatedPlayers.has(next) && attempts < playerCount) {
      next = (next % playerCount) + 1;
      attempts++;
    }
    setCurrentPlayer(next);
  };

  const handleSurrender = () => {
    playSound('click');
    setShowSurrenderConfirm(true);
  };

  const confirmSurrender = () => {
    playSound('shame');
    setLoser(currentPlayer);
    const newEliminated = new Set(eliminatedPlayers);
    newEliminated.add(currentPlayer);
    setEliminatedPlayers(newEliminated);
    setShowSurrenderConfirm(false);

    // Check if only one player remains
    const activeCount = playerCount - newEliminated.size;
    if (activeCount === 1) {
      // Find the winner
      for (let i = 1; i <= playerCount; i++) {
        if (!newEliminated.has(i)) {
          setWinner(i);
          break;
        }
      }
    }
    setShowRoastModal(true);
  };

  const closeRoastAndContinue = () => {
    setShowRoastModal(false);
    if (winner) {
      setIsGameOver(true);
      playSound('victory');
    } else {
      handleNextTurn();
    }
  };

  const handleRestart = () => {
    setIsGameStarted(false);
    setIsGameOver(false);
    setCurrentPlayer(1);
    setHistory([]);
    setUsedWords(new Set());
    setEliminatedPlayers(new Set());
    setWinner(null);
    setLoser(0);
    setInputValue('');
    setStatusMsg('');
    setShowSourceDef(false);
    setSourceWord('');
    setShowRoastModal(false);
  };

  const handleRequestHint = async () => {
    if (showAdModal || isAdPlaying) return;
    setShowAdModal(true);
  };

  const startWatchingAd = async () => {
    if (Capacitor.isNativePlatform()) {
      setIsAdPlaying(true);
      const result = await AdService.showRewardedAd();
      if (result === true) {
        finalizeHint();
      } else {
        // result could be false or potentially an error object if we refactored
        setStatusMsg("Ad failed. Check your internet or AdMob settings.");
        setIsAdPlaying(false);
        setShowAdModal(false);
      }
    } else {
      // Logic for web environments: Show AdSense ad for 5 seconds
      setIsAdPlaying(true);
      let count = 5;
      setAdCountdown(count);

      const interval = setInterval(() => {
        count -= 1;
        setAdCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          finalizeHint();
        }
      }, 1000);
    }
  };

  const finalizeHint = async () => {
    setIsSearchingHint(true);
    setIsLoading(true);
    try {
      const hint = await findValidHint(sourceWord, usedWords);
      if (hint) {
        setInputValue(hint);
        setStatusMsg(`Hint: "${hint}" revealed!`);
        playSound('success');

        // Trigger blinking effect
        setIsHintBlinking(true);
        setTimeout(() => setIsHintBlinking(false), 1500); // Stop after 1.5s
      } else {
        setStatusMsg("No simple hints found for this word!");
        playSound('error');
      }
    } catch (e) {
      console.error("Hint failed:", e);
      setStatusMsg("Failed to get hint. Try again later.");
    } finally {
      setIsLoading(false);
      setIsSearchingHint(false);
      setIsAdPlaying(false);
      setShowAdModal(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: 'env(safe-area-inset-top) 0 0 0', // Safe area for mobile status bar/notches
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>

      {!isGameStarted ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '1rem',
          background: 'linear-gradient(135deg, #FFF0F0 0%, #F0F8FF 100%)' // Red-Blue mix
        }}>

          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center',
            padding: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            {/* Logo / Title Area */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{
                margin: 0,
                fontSize: 'clamp(2rem, 12vw, 3.5rem)',
                fontWeight: '900',
                background: 'linear-gradient(90deg, var(--p1-color) 0%, var(--p2-color) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block', // Ensure gradient applies correctly
                letterSpacing: '-2px',
                lineHeight: '1.1',
                userSelect: 'none',
                whiteSpace: 'nowrap'
              }}>
                WORD DUEL
              </h1>
              <p style={{ color: '#888', marginTop: '0.5rem', fontWeight: 500 }}>
                Red vs Blue • Word Construction
              </p>
            </div>

            {/* Quick Instructions */}
            <div style={{
              marginBottom: '1.5rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#666',
              background: 'rgba(255,255,255,0.4)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px border var(--glass-border)'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#444' }}>How to play:</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                <li>Pick or enter a <b>6-12 letter word</b> to start.</li>
                <li>Take turns to build new words from its letters.</li>
                <li>Last player standing wins! Give up and you're out.</li>
              </ul>
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>Number of Players:</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => { playSound('click'); setPlayerCount(n); }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: playerCount === n ? 'var(--p1-color)' : '#eee',
                      background: playerCount === n ? 'var(--p1-bg)' : 'white',
                      color: playerCount === n ? 'var(--p1-color)' : '#999',
                      fontWeight: 'bold',
                      flex: 1,
                      minWidth: '40px'
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                value={setupInput}
                onChange={(e) => {
                  setSetupInput(e.target.value);
                  setSetupError('');
                }}
                placeholder="Enter a 6-12 letter word..."
                disabled={isSetupLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #eee',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {setupError && (
                <div style={{
                  color: '#e53935',
                  fontSize: '0.9em',
                  marginBottom: '10px',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap'
                }}>
                  {setupError}
                </div>
              )}

              <button
                onClick={() => runStartGame(setupInput)}
                disabled={!setupInput || isSetupLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, var(--p1-color) 0%, var(--p2-color) 100%)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  opacity: isSetupLoading ? 0.7 : 1,
                  cursor: isSetupLoading ? 'wait' : 'pointer',
                  transform: 'scale(1)',
                  transition: 'transform 0.1s'
                }}
              >
                {isSetupLoading ? 'Validating...' : 'START GAME'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.2rem', gap: '8px' }}>
                <p style={{ color: '#999', fontSize: '0.9em', margin: 0 }}>
                  Or choose a random preset:
                </p>
                <button
                  onClick={handleRefreshPresets}
                  disabled={isRefreshingPresets || isSetupLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.8em',
                    background: 'transparent',
                    border: '1px solid #ccc',
                    color: '#666',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Refresh words"
                >
                  <span style={{
                    display: 'inline-block',
                    height: '14px',
                    width: '14px',
                    animation: isRefreshingPresets ? 'spin 1s linear infinite' : 'none'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', verticalAlign: 'middle', display: 'block' }}>
                      <path d="M23 4v6h-6" />
                      <path d="M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </span>
                </button>
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                height: '150px',
                minHeight: '150px',
                overflowY: 'auto'
              }}>
                {presets.map(p => (
                  <button
                    key={p}
                    disabled={isSetupLoading || isRefreshingPresets}
                    onClick={() => runStartGame(p)}
                    style={{
                      fontSize: '0.8em',
                      padding: '6px 12px',
                      background: '#f5f5f5',
                      color: '#555',
                      opacity: (isSetupLoading || isRefreshingPresets) ? 0.6 : 1,
                      cursor: (isSetupLoading || isRefreshingPresets) ? 'not-allowed' : 'pointer'
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* AdSense Unit on Setup Screen */}
            {!Capacitor.isNativePlatform() && (
              <div style={{ marginTop: '1.5rem', minHeight: '100px' }}>
                <AdSenseUnit slot="9240397827" format="horizontal" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* MOBILE SIDEBAR OVERLAY */}
          {showMobileLog && (
            <div className="mobile-sidebar-overlay" onClick={() => setShowMobileLog(false)}>
              <div className="mobile-sidebar-content" onClick={e => e.stopPropagation()}>
                <SidebarList history={history} />
                <button
                  onClick={() => setShowMobileLog(false)}
                  style={{ marginTop: '1rem', width: '100%', background: '#ffdddd', color: 'red' }}>
                  Close Log
                </button>
              </div>
            </div>
          )}

          {/* 1. TOP BAR: Global First Line */}
          <div style={{
            padding: '0.5rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            width: '100%',
            height: '50px', // Fixed height for consistency
            boxSizing: 'border-box',
            background: '#ffffff',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Left Side: Quit */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setShowQuitConfirm(true);
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85em',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  color: '#666',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                Quit
              </button>
            </div>

            {/* Center: Title */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: '900',
                background: 'linear-gradient(90deg, var(--p1-color) 0%, var(--p2-color) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block', // Ensure gradient applies correctly
                letterSpacing: '-1px',
                lineHeight: '1',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
              }}>
                WORD DUEL
              </h2>
            </div>

            {/* Right Side: Log */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="mobile-log-btn"
                onClick={() => setShowMobileLog(true)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85em',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  color: '#333',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                Log
              </button>
            </div>
          </div>

          {/* Main Layout Area: Sidebar + Main Content */}
          <div style={{
            display: 'flex',
            flex: 1,
            gap: '1.25rem',
            overflow: 'hidden',
            padding: '2rem 1rem 1rem 1rem' // Further increased top padding (2rem)
          }}>
            {/* SIDEBAR: Compact List */}
            <div className="desktop-sidebar">
              <SidebarList history={history} />
              {!Capacitor.isNativePlatform() && (
                <div style={{ marginTop: '1rem', minHeight: '250px' }}>
                  <AdSenseUnit slot="9240397827" format="vertical" />
                </div>
              )}
            </div>

            {/* MAIN COLUMN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* 2. PLAYER INDICATORS */}
              <div style={{ flexShrink: 0, padding: '0 1rem', marginBottom: '0.5rem' }}>
                <PlayerStatus playerCount={playerCount} currentPlayer={currentPlayer} eliminatedPlayers={eliminatedPlayers} />
              </div>

              {/* 3. DIALOG BOX (History) */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 1rem',
                margin: '0.25rem 0'
              }}>
                <HistoryList history={history} />
                <div ref={historyEndRef} />
              </div>

              {/* 4. SOURCE WORD - Floating Definition Reveal */}
              <div style={{ textAlign: 'center', padding: '0.1rem', flexShrink: 0, position: 'relative' }}>
                <div
                  onMouseEnter={() => setShowSourceDef(true)}
                  onMouseLeave={() => setShowSourceDef(false)}
                  onPointerDown={() => setShowSourceDef(true)}
                  onPointerUp={() => setShowSourceDef(false)}
                  onPointerCancel={() => setShowSourceDef(false)}
                  style={{
                    fontSize: 'clamp(1.8rem, 8vw, 2.6rem)',
                    fontWeight: '950',
                    letterSpacing: '0.3rem',
                    color: '#1a1a1a',
                    textShadow: '2px 2px 0px #fff, 4px 4px 0px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    margin: '0 auto',
                    cursor: 'help', // "Help" cursor indicates info on hover
                    userSelect: 'none',
                    transition: 'transform 0.2s'
                  }}
                >
                  {sourceWord}
                </div>

                {/* Floating Tooltip-style Definition */}
                {showSourceDef && sourceWordDef && (
                  <div style={{
                    position: 'absolute',
                    bottom: '110%', // Position above the word
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    width: 'max-content',
                    maxWidth: '280px',
                    fontSize: '0.85rem',
                    color: '#fff',
                    background: 'rgba(50,50,50,0.95)', // Darker theme for tooltip feel
                    padding: '6px 14px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    animation: 'fadeInDown 0.2s ease-out',
                    wordBreak: 'break-word',
                    pointerEvents: 'none' // Don't block mouse
                  }}>
                    {sourceWordDef}
                    {/* Tiny arrow */}
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      marginLeft: '-5px',
                      borderWidth: '5px',
                      borderStyle: 'solid',
                      borderColor: 'rgba(50,50,50,0.95) transparent transparent transparent'
                    }} />
                  </div>
                )}
              </div>

              {/* 5. LETTER POOL */}
              <div style={{ padding: '0 0.5rem', flexShrink: 0 }}>
                <LetterPool
                  sourceWord={sourceWord}
                  currentInput={inputValue}
                  onLetterClick={(char) => setInputValue(prev => prev + char)}
                  onBackspace={() => setInputValue(prev => prev.slice(0, -1))}
                  onClear={() => setInputValue('')}
                />
              </div>

              {/* 6. INPUT AREA (and status) */}
              <div className="glass-panel" style={{
                padding: '0.5rem',
                flexShrink: 0,
                margin: '0.2rem',
                marginTop: 0,
                background: 'rgba(255,255,255,0.6)'
              }}>
                {statusMsg && (
                  <div style={{
                    color: '#d32f2f',
                    textAlign: 'center',
                    marginBottom: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}>
                    {statusMsg}
                  </div>
                )}
                <InputArea
                  sourceWord={sourceWord}
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmitGuess}
                  isLoading={isLoading}
                  onRequestHint={handleRequestHint}
                  onSurrender={handleSurrender}
                  isHintBlinking={isHintBlinking}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AD MODAL OVERLAY */}
      {showAdModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '400px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            background: 'white',
            border: '6px solid var(--player-accent)',
            borderRadius: '24px'
          }}>
            {!isAdPlaying ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
                <h2 style={{ marginBottom: '1rem' }}>Magic Hint</h2>
                <p style={{ color: '#666', marginBottom: '2rem' }}>
                  Watch an Ad video to reveal a valid word for this duel!
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setShowAdModal(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'none', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={startWatchingAd}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'var(--player-accent)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                    Watch Ad
                  </button>
                </div>
              </>
            ) : isSearchingHint ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
                <h3 style={{ marginBottom: '0.5rem' }}>Magical Oracle Thinking...</h3>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Searching the ancient scrolls for a valid word...
                </p>
                <div style={{ marginTop: '1rem', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-accent-player1)' }}>
                  This might take a second for rare combinations
                </div>
              </>
            ) : (
              <>
                {!Capacitor.isNativePlatform() && (
                  <AdSenseUnit
                    style={{ marginBottom: '1.5rem', minHeight: '100px', background: '#f9f9f9' }}
                    slot="9240397827"
                    format="rectangle"
                  />
                )}
                <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
                <h3 style={{ marginBottom: '0.5rem' }}>Ad Playing... ({adCountdown}s)</h3>
                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '1rem' }}>
                  {!Capacitor.isNativePlatform() ? (
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
                      <span style={{ color: '#ff9800', fontWeight: 'bold' }}>⚠️ Development Mode (2s Fast-Track)</span>
                    ) : (
                      "(Ad loading from Google AdSense)"
                    )
                  ) : (
                    "(This is a simulated ad for development)"
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {showSurrenderConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '350px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            background: 'white',
            border: '6px solid var(--player-accent)',
            borderRadius: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '3rem' }}>🏳️</span>
              <img src="/Troll-Face-warning.png" alt="Warning!" style={{ height: '70px', width: 'auto' }} />
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Give Up?</h2>
            <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.4' }}>
              Are you sure? If you surrender now, <b style={{ color: 'var(--player-accent)' }}>you will be roasted mercilessly!</b>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                onClick={confirmSurrender}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}>
                Go ahead. I don't care.
              </button>
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  background: 'white',
                  color: '#666',
                  cursor: 'pointer'
                }}>
                No, wait! I can do this!
              </button>

              <div style={{
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#999',
                fontSize: '0.85rem'
              }}>
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
                OR
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
              </div>

              <button
                onClick={() => {
                  setShowSurrenderConfirm(false);
                  setShowAdModal(true);
                  startWatchingAd();
                }}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--player-accent)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                <span>💡</span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                  <span>Give me a Hint</span>
                  <span style={{ fontSize: '0.8em', opacity: 0.9 }}> (Watch Ad)</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QUIT CONFIRMATION MODAL */}
      {showQuitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1600,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '350px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            background: 'white',
            border: '6px solid var(--player-accent)',
            borderRadius: '24px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚪</div>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Quit Game?</h2>
            <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.4' }}>
              Are you sure you want to end this duel and return to the main menu? Your progress will be lost.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  handleRestart();
                }}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}>
                QUIT DUEL
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  background: 'white',
                  color: '#666',
                  cursor: 'pointer'
                }}>
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}
      {showRoastModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="shame-modal glass-panel" style={{
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            border: `6px solid var(--p${loser}-color)`,
            borderRadius: '24px',
            animation: 'none'
          }}>
            <h1 style={{
              fontSize: '2.4rem',
              fontWeight: '950',
              margin: '0 0 1.5rem 0',
              color: `var(--p${loser}-color)`,
              lineHeight: '1.1'
            }}>
              PLAYER {loser}<br />
              SUCKS AT WORDS!
            </h1>
            <p style={{
              fontSize: '1.35rem',
              fontWeight: '800',
              fontStyle: 'italic',
              marginBottom: '1rem',
              color: '#444',
              lineHeight: '1.4',
              maxWidth: '320px',
              padding: '0 10px'
            }}>
              "{ROASTS[Math.floor(Date.now() / 1000) % ROASTS.length]}"
            </p>
            <img src="/Troll-Face-laugh.png" alt="Troll Laugh" style={{
              height: '130px',
              width: 'auto',
              marginBottom: '2rem',
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))'
            }} />
            <button
              onClick={closeRoastAndContinue}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '1.3rem',
                fontWeight: '900',
                background: winner ? 'linear-gradient(90deg, var(--p1-color) 0%, var(--p2-color) 100%)' : `var(--p${loser}-color)`,
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s'
              }}>
              {winner ? 'SEE WHO WON' : 'CONTINUE BATTLE'}
            </button>
          </div>
        </div>
      )}

      {isGameOver && winner && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(15px)'
        }}>
          <div className="victory-modal glass-panel" style={{
            maxWidth: '450px',
            width: '95%',
            textAlign: 'center',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            border: `8px solid var(--p${winner}-color)`,
            borderRadius: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'fadeInScale 0.5s ease-out'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🏆</div>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '950',
              margin: '0 0 0.5rem 0',
              color: '#333',
              lineHeight: '1'
            }}>
              VICTORY!
            </h1>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              marginBottom: '2rem',
              color: `var(--p${winner}-color)`
            }}>
              PLAYER {winner} IS THE GOAT
            </h2>
            <p style={{ color: '#666', marginBottom: '2.5rem', fontSize: '1.2rem' }}>
              The last word-smith standing. <br />Everyone else was just noise.
            </p>
            {!Capacitor.isNativePlatform() && (
              <div style={{ width: '100%', marginBottom: '2rem', minHeight: '100px' }}>
                <AdSenseUnit slot="9240397827" format="rectangle" />
              </div>
            )}
            <button
              onClick={handleRestart}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '1.5rem',
                fontWeight: '900',
                background: 'linear-gradient(90deg, var(--p1-color) 0%, var(--p2-color) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}>
              NEW GAME ⚔️
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
