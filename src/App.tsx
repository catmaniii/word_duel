import { useState, useEffect, useRef } from 'react'
import { canConstruct, checkWordDefinition, fetchNewPresets } from './logic/validator'
import { playSound, initAudio } from './logic/sound'
import { LetterPool } from './components/LetterPool'
import { HistoryList } from './components/HistoryList'
import { InputArea } from './components/InputArea'
import { ScoreBoard } from './components/ScoreBoard'
import { SidebarList } from './components/SidebarList'

// ... imports ...

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
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<{ 1: number, 2: number }>({ 1: 0, 2: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  // Input State
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showMobileLog, setShowMobileLog] = useState(false);

  // Auto-scroll history to bottom
  const historyEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Styles for dynamic background
  const bgColor = isGameStarted
    ? (currentPlayer === 1 ? 'var(--color-bg-player1)' : 'var(--color-bg-player2)')
    : '#f0f0f0';

  useEffect(() => {
    document.body.style.backgroundColor = bgColor;
  }, [bgColor]);

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
      setScores({ 1: 0, 2: 0 });
      setHistory([]);
      setUsedWords(new Set());
      setCurrentPlayer(1);
      setInputValue('');
      setStatusMsg('');
      setShowMobileLog(false);
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
      const points = word.length;
      setScores(prev => ({
        ...prev,
        [currentPlayer]: prev[currentPlayer] + points
      }));
      setHistory(prev => [...prev, { word, player: currentPlayer, chinese: result.chinese }]);
      setUsedWords(prev => new Set(prev).add(word));
      setInputValue('');
      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    } else {
      // Invalid word
      if (result.errorType === 'PROPER_NOUN') {
        setStatusMsg(`"${word}" is a proper noun and not allowed!`);
      } else {
        setStatusMsg(`"${word}" is not a valid English word!`);
      }
      playSound('error');
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
                fontSize: '3.5rem',
                fontWeight: '900',
                background: 'linear-gradient(90deg, var(--color-accent-player1) 0%, var(--color-accent-player2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-2px',
                lineHeight: '1.1',
                userSelect: 'none'
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
                <li>Avoid names, places or repeats!</li>
              </ul>
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
                  background: 'linear-gradient(90deg, var(--color-accent-player1) 0%, var(--color-accent-player2) 100%)',
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

            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', gap: '8px' }}>
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
                onClick={() => setIsGameStarted(false)}
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
                background: 'linear-gradient(90deg, var(--color-accent-player1) 0%, var(--color-accent-player2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-1px',
                lineHeight: '1',
                whiteSpace: 'nowrap',
                userSelect: 'none'
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
            </div>

            {/* MAIN COLUMN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* 2. SCORES */}
              <div style={{ flexShrink: 0, padding: '0 1rem', marginBottom: '0.5rem' }}>
                <ScoreBoard score1={scores[1]} score2={scores[2]} currentPlayer={currentPlayer} />
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
                padding: '0.75rem',
                flexShrink: 0,
                margin: '0.25rem',
                marginTop: 0,
                background: 'rgba(255,255,255,0.6)'
              }}>
                {statusMsg && (
                  <div style={{
                    color: '#d32f2f',
                    background: '#ffcdd2',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    marginBottom: '0.4rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    overflowX: 'auto',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap'
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
                  currentPlayer={currentPlayer}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
