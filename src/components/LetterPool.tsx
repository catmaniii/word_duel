import React, { useMemo } from 'react';
import { playSound } from '../logic/sound';

interface LetterPoolProps {
    sourceWord: string;
    currentInput: string;
    onLetterClick: (char: string) => void;
    onBackspace: () => void;
    onClear: () => void;
}

export const LetterPool: React.FC<LetterPoolProps> = ({ sourceWord, currentInput, onLetterClick, onBackspace, onClear }) => {
    const letters = useMemo(() => {
        // ... existing logic ...
        const sourceCounts: Record<string, number> = {};
        for (const char of sourceWord.toUpperCase()) {
            sourceCounts[char] = (sourceCounts[char] || 0) + 1;
        }

        const inputCounts: Record<string, number> = {};
        for (const char of currentInput.toUpperCase()) {
            inputCounts[char] = (inputCounts[char] || 0) + 1;
        }

        const remaining: Array<{ char: string; count: number }> = [];
        Object.keys(sourceCounts).sort().forEach(char => {
            const left = sourceCounts[char] - (inputCounts[char] || 0);
            remaining.push({ char, count: Math.max(0, left) });
        });

        return remaining;
    }, [sourceWord, currentInput]);

    const buttonStyle: React.CSSProperties = {
        padding: '0.8rem 1rem',
        borderRadius: '8px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        minWidth: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: '1px solid #ccc',
        transition: 'all 0.1s active'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '0.25rem 0' }}>
            {/* Control Buttons (Clear/Backspace) - Moved to Top */}
            {currentInput.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                    marginBottom: '2px'
                }}>
                    {/* Clear Button */}
                    <button
                        onClick={() => {
                            playSound('delete');
                            onClear();
                        }}
                        style={{ ...buttonStyle, background: '#fee', color: '#e53935', minWidth: '60px', padding: '0.5rem 0.8rem', fontSize: '1rem' }}
                        title="Clear Input"
                    >
                        <span style={{ fontSize: '0.8em', marginRight: '4px' }}>✕</span> Clear
                    </button>

                    {/* Backspace Button */}
                    <button
                        onClick={() => {
                            playSound('delete');
                            onBackspace();
                        }}
                        style={{ ...buttonStyle, background: '#fff3e0', color: '#fb8c00', minWidth: '60px', padding: '0.5rem 0.8rem', fontSize: '1rem' }}
                        title="Backspace"
                    >
                        <span style={{ fontSize: '0.8em', marginRight: '4px' }}>⌫</span> Back
                    </button>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                justifyContent: 'center',
            }}>
                {letters.map(({ char, count }) => (
                    <button
                        key={char}
                        onClick={() => {
                            if (count > 0) {
                                playSound('click');
                                onLetterClick(char);
                            }
                        }}
                        disabled={count === 0}
                        style={{
                            ...buttonStyle,
                            background: count > 0 ? '#fff' : 'rgba(0,0,0,0.05)',
                            color: count > 0 ? '#333' : '#ccc',
                            border: count === 0 ? '1px dashed #ddd' : '1px solid #ccc',
                            boxShadow: count > 0 ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            cursor: count > 0 ? 'pointer' : 'default',
                        }}
                    >
                        {char}
                        <span style={{
                            fontSize: '0.6em',
                            position: 'absolute',
                            top: '2px',
                            right: '4px',
                            opacity: 0.7
                        }}>
                            {count}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
