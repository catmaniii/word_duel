import React from 'react';

interface PlayerStatusProps {
    currentPlayer: number;
    playerCount: number;
    eliminatedPlayers: Set<number>;
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({ currentPlayer, playerCount, eliminatedPlayers }) => {
    const players = Array.from({ length: playerCount }, (_, i) => i + 1);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            gap: '8px',
            width: '100%',
            padding: '0 4px',
            flexWrap: 'wrap'
        }}>
            {players.map((p) => {
                const isActive = p === currentPlayer;
                const isEliminated = eliminatedPlayers.has(p);

                return (
                    <div
                        key={p}
                        className={`player-bubble ${isActive ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}`}
                        style={{
                            '--player-accent': isEliminated ? '#ccc' : `var(--p${p}-color)`,
                            '--player-bg': isEliminated ? '#f5f5f5' : `var(--p${p}-bg)`,
                            opacity: isEliminated ? 0.6 : 1,
                            textDecoration: isEliminated ? 'line-through' : 'none',
                        } as React.CSSProperties}
                    >
                        {isActive ? `Player ${p}` : `P${p}`}
                    </div>
                );
            })}
        </div>
    );
};
