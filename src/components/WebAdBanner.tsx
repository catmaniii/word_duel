import { useEffect } from 'react';

interface WebAdBannerProps {
    adSlot?: string;
    style?: React.CSSProperties;
}

/**
 * Google AdSense Banner Component
 * Note: Real ads will only show on verified domains. 
 * Placeholders appear during local development.
 */
export const WebAdBanner = ({ adSlot, style }: WebAdBannerProps) => {
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, []);

    return (
        <div className="ad-container" style={{
            margin: '15px 0',
            textAlign: 'center',
            overflow: 'hidden',
            minHeight: '100px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            color: '#888',
            ...style
        }}>
            {/* This is the standardized AdSense code block */}
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-3352266449267869"
                data-ad-slot={adSlot || ""}
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>

            {/* Dev Tip: In local dev, AdSense might show nothing or an empty box */}
        </div>
    );
};
