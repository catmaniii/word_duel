import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface AdSenseUnitProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
    responsive?: 'true' | 'false';
    style?: React.CSSProperties;
    className?: string;
}

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

/**
 * A reusable Google AdSense unit for the web version of Word Duel.
 * Automatically ignores rendering on native platforms.
 */
export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
    slot,
    format = 'auto',
    responsive = 'true',
    style = { display: 'block' },
    className = ''
}) => {
    // Never render on native platforms
    if (Capacitor.isNativePlatform()) return null;

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, [slot]); // Re-push if slot changes (though rare in lifecycle)

    return (
        <div className={`adsense-container ${className}`} style={{ overflow: 'hidden', ...style }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block', ...style }}
                data-ad-client="ca-pub-3352266449267869"
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive}
            />
        </div>
    );
};
