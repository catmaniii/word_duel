import { useState, useEffect } from 'react'
import { canConstruct, checkWordDefinition, fetchNewPresets } from './logic/validator' // Import function
import { playSound } from './logic/sound'
import { LetterPool } from './components/LetterPool'
import { HistoryList } from './components/HistoryList'
import { InputArea } from './components/InputArea'
import { ScoreBoard } from './components/ScoreBoard'
import { SidebarList } from './components/SidebarList'

interface HistoryItem {
  word: string;
  player: number;
  chinese?: string;
}

const PRESETS = [
  "PROGRAMMING", "ARCHITECTURE", "JAVASCRIPT", "DEVELOPER",
  "ANTIGRAVITY", "COMMUNICATION", "DICTIONARY", "REVOLUTION",
  "UNDERSTANDING", "PERSPECTIVE", "INTELLIGENCE"
];

function App() {
  // Game Setup State
  const [presets, setPresets] = useState<string[]>(PRESETS);
  const [isRefreshingPresets, setIsRefreshingPresets] = useState(false);

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

    setIsSetupLoading(true);
    setSetupError('');

    try {
      // Validate if it's a real word
      const result = await checkWordDefinition(trimmedWord);
      if (!result.isValid) {
        setSetupError(`"${trimmedWord}" is not a valid English word.`);
        setIsSetupLoading(false);
        playSound('error');
        return;
      }

      // Success - Start Game
      playSound('start');
      setSourceWord(trimmedWord);
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
      setStatusMsg(`"${word}" is not a valid English word!`);
      playSound('error');
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0', // Full bleed for setup, padding added inside components
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
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                margin: 0,
                fontSize: '3.5rem',
                fontWeight: '900',
                background: 'linear-gradient(90deg, var(--color-accent-player1) 0%, var(--color-accent-player2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-2px',
                lineHeight: '1.1'
              }}>
                WORD DUEL
              </h1>
              <p style={{ color: '#888', marginTop: '0.5rem', fontWeight: 500 }}>
                Red vs Blue • Word Construction
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                value={setupInput}
                onChange={(e) => {
                  setSetupInput(e.target.value);
                  setSetupError('');
                }}
                placeholder="Enter a 6+ letter word..."
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
                <div style={{ color: '#e53935', fontSize: '0.9em', marginBottom: '10px' }}>
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
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {isRefreshingPresets ? (
                  <span style={{ color: '#ccc', fontSize: '0.9em' }}>Fetching new words...</span>
                ) : presets.map(p => (
                  <button
                    key={p}
                    disabled={isSetupLoading}
                    onClick={() => runStartGame(p)}
                    style={{
                      fontSize: '0.8em',
                      padding: '6px 12px',
                      background: '#f5f5f5',
                      color: '#555'
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>

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

          {/* SIDEBAR: Compact List */}
          <div className="desktop-sidebar">
            <SidebarList history={history} />
          </div>

          {/* MAIN COLUMN */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* STICKY HEADER: Scores, Word, Pool */}
            <div className="glass-panel" style={{
              marginBottom: '1rem',
              padding: '1rem',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div className="game-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', order: 1 }}>
                  <button
                    onClick={() => setIsGameStarted(false)}
                    style={{ padding: '4px 8px', fontSize: '0.8em', background: 'transparent', border: '1px solid #ccc', color: '#666' }}>
                    Quit
                  </button>
                  {/* Log Button for Mobile */}
                  <button
                    className="mobile-log-btn"
                    onClick={() => setShowMobileLog(true)}
                    style={{ padding: '4px 8px', fontSize: '0.8em', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                    Log
                  </button>
                </div>

                <div className="source-word-display" style={{
                  fontSize: '2rem',
                  fontWeight: '900',
                  letterSpacing: '0.1rem',
                  color: '#333',
                  textAlign: 'center',
                  order: 2 // On desktop: center
                }}>
                  {sourceWord}
                </div>

                <div style={{ width: '50px', order: 3 }}></div> {/* Spacer for center alignment */}
              </div>

              <ScoreBoard score1={scores[1]} score2={scores[2]} currentPlayer={currentPlayer} />
              <LetterPool
                sourceWord={sourceWord}
                currentInput={inputValue}
                onLetterClick={(char) => setInputValue(prev => prev + char)}
                onBackspace={() => setInputValue(prev => prev.slice(0, -1))}
                onClear={() => setInputValue('')}
              />
            </div>

            {/* SCROLLABLE CONTENT: History Bubbles */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
              <HistoryList history={history} />
            </div>

            {/* STICKY FOOTER: Input Area */}
            <div className="glass-panel" style={{ padding: '1rem', flexShrink: 0 }}>
              {statusMsg && (
                <div style={{
                  color: '#d32f2f',
                  background: '#ffcdd2',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
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
      )}
    </div>
  )
}

export default App
