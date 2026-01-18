import React from 'react';

interface PlayerStatusProps {
    currentPlayer: number;
    playerCount: number;
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({ currentPlayer, playerCount }) => {
    const players = Array.from({ length: playerCount }, (_, i) => i + 1);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            gap: '8px',
            width: '100%',
            padding: '0 4px'
        }}>
            {players.map((p) => {
                const isActive = p === currentPlayer;
                return (
                    <div
                        key={p}
                        className={`player-bubble ${isActive ? 'active' : ''}`}
                        style={{
                            '--player-accent': `var(--p${p}-color)`,
                            '--player-bg': `var(--p${p}-bg)`,
                        } as React.CSSProperties}
                    >
                        {isActive ? `Player ${p}` : `P${p}`}
                    </div>
                );
            })}
        </div>
    );
};
