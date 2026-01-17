import React from 'react';

interface ScoreBoardProps {
    score1: number;
    score2: number;
    currentPlayer: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ score1, score2, currentPlayer }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem', // Reduced margin
            gap: '10px'
        }}>
            <div style={{
                padding: '0.5rem 1rem', // Reduced padding
                borderRadius: '12px',
                background: 'var(--color-bg-player1)',
                border: `2px solid ${currentPlayer === 1 ? 'var(--color-accent-player1)' : 'transparent'}`,
                boxShadow: currentPlayer === 1 ? '0 0 10px var(--color-accent-player1)' : 'none',
                flex: 1,
                textAlign: 'center',
                transition: 'all 0.3s',
                display: 'flex', // Flex layout for compactness
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <h3 style={{ margin: 0, color: '#555', fontSize: '1rem' }}>P1</h3>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--color-accent-player1)' }}>{score1}</div>
            </div>

            <div style={{
                padding: '0.5rem 1rem', // Reduced padding
                borderRadius: '12px',
                background: 'var(--color-bg-player2)',
                border: `2px solid ${currentPlayer === 2 ? 'var(--color-accent-player2)' : 'transparent'}`,
                boxShadow: currentPlayer === 2 ? '0 0 10px var(--color-accent-player2)' : 'none',
                flex: 1,
                textAlign: 'center',
                transition: 'all 0.3s',
                display: 'flex', // Flex layout for compactness
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <h3 style={{ margin: 0, color: '#555', fontSize: '1rem' }}>P2</h3>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--color-accent-player2)' }}>{score2}</div>
            </div>
        </div>
    );
};
