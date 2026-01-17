import React, { useState, useEffect, useRef } from 'react';
import { canConstruct } from '../logic/validator';

interface InputAreaProps {
    sourceWord: string;
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    currentPlayer: number;
}

export const InputArea: React.FC<InputAreaProps> = ({ sourceWord, value, onChange, onSubmit, isLoading, currentPlayer }) => {
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
        ? (currentPlayer === 1 ? 'var(--color-accent-player1)' : 'var(--color-accent-player2)')
        : 'red';

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', gap: '8px' }}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Player ${currentPlayer}'s turn...`}
                disabled={isLoading}
                style={{
                    flex: 1,
                    minWidth: 0, // Allow shrinking
                    padding: '12px',
                    fontSize: '1.1em',
                    borderRadius: '8px',
                    border: `2px solid ${borderColor}`,
                    backgroundColor: isFormatValid ? 'white' : '#FFEEEE',
                    outline: 'none',
                    transition: 'all 0.2s'
                }}
            />
            <button
                type="submit"
                className="input-submit-btn" // For mobile width fix
                disabled={isLoading || !value || !isFormatValid}
                style={{
                    backgroundColor: currentPlayer === 1 ? 'var(--color-accent-player1)' : 'var(--color-accent-player2)',
                    color: 'white',
                    fontWeight: 'bold',
                    opacity: isLoading ? 0.7 : 1
                }}
            >
                {isLoading ? 'Checking...' : 'Submit'}
            </button>
        </form>
    );
};
