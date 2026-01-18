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
            flexDirection: 'column',
            gap: '6px', // Reduced from 10px
            padding: '8px', // Reduced from 10px
            width: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
        }}>
            {history.map((item, idx) => {
                const isEven = item.player % 2 === 0;
                return (
                    <div key={idx} className="history-bubble" style={{
                        alignSelf: isEven ? 'flex-end' : 'flex-start',
                        backgroundColor: `var(--p${item.player}-bg)`,
                        color: '#333',
                        border: `1px solid var(--p${item.player}-color)`,
                        borderRadius: '10px',
                        padding: '4px 10px',
                        maxWidth: '85%',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: '1.2'
                    }}>
                        <div style={{
                            fontWeight: 'bold',
                            fontSize: '1.1em',
                            textAlign: isEven ? 'right' : 'left',
                            color: `var(--p${item.player}-color)`
                        }}>
                            {item.word}
                        </div>
                        {item.chinese && (
                            <div style={{
                                fontSize: '0.8em',
                                color: '#666',
                                marginTop: '1px',
                                lineHeight: '1.2',
                                textAlign: 'left' // Ensure definition stays left-aligned
                            }}>
                                {item.chinese}
                            </div>
                        )}
                    </div>
                );
            })}
            {history.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                    No words yet. Start typing!
                </div>
            )}
        </div>
    );
};
