import React from 'react';

interface HistoryItem {
    word: string;
    player: number;
    chinese?: string;
}

interface HistoryListProps {
    history: HistoryItem[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column', // Newest at bottom visually if we want, or top. 
            // Actually standard chat usually puts newest at bottom. Let's stick to list order.
            // If we want newest first, use flex-col.
            gap: '10px',
            // Height controlled by parent
            padding: '10px',
            width: '100%',
            boxSizing: 'border-box', // Prevent padding from adding to width
            overflowX: 'hidden', // Force hide horizontal scroll
        }}>
            {history.map((item, idx) => (
                <div key={idx} className="history-bubble" style={{
                    alignSelf: item.player === 1 ? 'flex-start' : 'flex-end',
                    backgroundColor: item.player === 1 ? 'var(--color-bg-player1)' : 'var(--color-bg-player2)',
                    color: '#333',
                    border: `1px solid ${item.player === 1 ? 'var(--color-accent-player1)' : 'var(--color-accent-player2)'}`,
                    borderRadius: '12px',
                    padding: '8px 16px',
                    maxWidth: '80%', // Desktop max width
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    textAlign: 'left',
                    wordBreak: 'break-word', // Ensure words break
                    overflowWrap: 'anywhere', // Better than break-word for exact fits
                    hyphens: 'auto'
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{item.word}</div>
                    {item.chinese && (
                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                            {item.chinese}
                        </div>
                    )}
                </div>
            ))}
            {history.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                    No words yet. Start typing!
                </div>
            )}
        </div>
    );
};
