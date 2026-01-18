import React, { useState, useEffect, useRef } from 'react';
import { canConstruct } from '../logic/validator';

interface InputAreaProps {
    sourceWord: string;
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    onRequestHint: () => void;
    onSurrender: () => void;
    isHintBlinking?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
    sourceWord, value, onChange, onSubmit, isLoading, onRequestHint, onSurrender, isHintBlinking
}) => {
    const [isFormatValid, setIsFormatValid] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    // Simple mobile detection
    const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        if (value) {
            setIsFormatValid(canConstruct(value, sourceWord));
        } else {
            setIsFormatValid(true);
        }
    }, [value, sourceWord]);

    const prevLoading = useRef(isLoading);

    // Handle focus on PC
    useEffect(() => {
        if (!isMobile()) {
            // Success case: loading finished and value was cleared
            if (!isLoading && value === '') {
                inputRef.current?.focus();
            }
            // Failure/Error case: loading finished but value remains
            if (prevLoading.current === true && !isLoading && value !== '') {
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        }
        prevLoading.current = isLoading;
    }, [isLoading, value]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (value && isFormatValid && !isLoading) {
            onSubmit();
        }
    };

    const borderColor = isFormatValid
        ? 'var(--player-accent)'
        : '#d32f2f'; // Darker red border

    // --- Rich Input Logic ---
    // Calculate which characters are valid/invalid in real-time
    const getHighlightedText = () => {
        const sourceChars = sourceWord.toUpperCase().split('');
        const charCounts: Record<string, number> = {};
        sourceChars.forEach(c => charCounts[c] = (charCounts[c] || 0) + 1);

        const currentCounts: Record<string, number> = {};

        return value.split('').map((char, index) => {
            const upperChar = char.toUpperCase();
            let isCharValid = true;

            if (!charCounts[upperChar]) {
                isCharValid = false;
            } else {
                currentCounts[upperChar] = (currentCounts[upperChar] || 0) + 1;
                if (currentCounts[upperChar] > charCounts[upperChar]) {
                    isCharValid = false;
                }
            }

            return (
                <span key={index} style={{ color: isCharValid ? 'inherit' : '#d32f2f', fontWeight: isCharValid ? 'normal' : 'bold' }}>
                    {char}
                </span>
            );
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
                <button
                    type="button"
                    onClick={onRequestHint}
                    title="Watch an ad for a hint"
                    style={{
                        padding: '8px',
                        fontSize: '1.2rem',
                        background: 'white',
                        border: `1px solid #ddd`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '46px',
                        width: '46px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    💡
                </button>
                <button
                    type="button"
                    onClick={onSurrender}
                    title="I give up!"
                    style={{
                        padding: '8px',
                        fontSize: '1.2rem',
                        background: 'white',
                        border: `1px solid #ddd`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '46px',
                        width: '46px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    🏳️
                </button>
            </div>

            <div style={{ position: 'relative', flex: 1, height: '46px' }}>
                {/* Visual Display Layer (Behind the transparent input) */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    padding: '12px',
                    fontSize: '1em',
                    lineHeight: '20px',
                    pointerEvents: 'none',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'inherit',
                    color: '#333'
                }}>
                    {getHighlightedText()}
                </div>

                {/* Actual Input (Transparent text, visible cursor) */}
                <input
                    ref={inputRef}
                    type="text"
                    className={isHintBlinking ? 'hint-blink' : ''}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={value ? '' : `Guess a word...`}
                    disabled={isLoading}
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                        width: '100%',
                        height: '100%',
                        padding: '12px',
                        fontSize: '1em',
                        borderRadius: '8px',
                        border: `2px solid ${borderColor}`,
                        backgroundColor: isFormatValid ? 'white' : '#FFDada', // Darker pink background
                        color: 'transparent',
                        caretColor: '#333', // Keep cursor visible
                        outline: 'none',
                        transition: 'background-color 0.2s, border-color 0.2s',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                    }}
                />
            </div>

            <button
                type="submit"
                className="input-submit-btn"
                disabled={isLoading || !value || !isFormatValid}
                style={{
                    backgroundColor: 'var(--player-accent)',
                    color: 'white',
                    fontWeight: 'bold',
                    opacity: isLoading ? 0.7 : (isFormatValid && value ? 1 : 0.5),
                    height: '46px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (isLoading || !value || !isFormatValid) ? 'default' : 'pointer',
                    minWidth: '60px'
                }}
            >
                {isLoading ? '...' : 'Go'}
            </button>
        </form>
    );
};

