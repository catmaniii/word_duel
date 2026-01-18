import React from 'react';

interface HistoryItem {
    word: string;
    player: number;
}

interface SidebarListProps {
    history: HistoryItem[];
}

export const SidebarList: React.FC<SidebarListProps> = ({ history }) => {
    return (
        <div className="glass-panel" style={{
            width: '180px',
            height: '100%',
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: '16px', // Match standard panel
            marginRight: '1rem',
            flexShrink: 0
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', textAlign: 'center', color: '#555' }}>
                Word Log
            </h4>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {history.map((item, idx) => (
                    <div key={idx} style={{
                        fontSize: '0.8rem',
                        padding: '2px 4px',
                        color: `var(--p${item.player}-color)`,
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <span>{idx + 1}.</span>
                        <span style={{ fontWeight: 500 }}>{item.word}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
