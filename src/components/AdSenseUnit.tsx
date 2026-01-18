import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface AdSenseUnitProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
    responsive?: 'true' | 'false';
    style?: React.CSSProperties;
    className?: string;
    onStatusChange?: (status: 'filled' | 'unfilled' | 'error') => void;
}

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
    slot,
    format = 'auto',
    responsive = 'true',
    style = { display: 'block' },
    className = '',
    onStatusChange
}) => {
    const insRef = React.useRef<HTMLModElement>(null);

    // Never render on native platforms
    if (Capacitor.isNativePlatform()) return null;

    useEffect(() => {
        const ins = insRef.current;
        if (!ins) return;

        // Observer to detect when Google adds 'data-ad-status'
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
                    const status = ins.getAttribute('data-ad-status') as 'filled' | 'unfilled';
                    console.log(`AdSense [${slot}] status:`, status);
                    if (onStatusChange) onStatusChange(status);
                }
            });
        });

        observer.observe(ins, { attributes: true });

        try {
            if (typeof window !== 'undefined') {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error('AdSense error:', e);
            if (onStatusChange) onStatusChange('error');
        }

        return () => observer.disconnect();
    }, [slot, onStatusChange]);

    return (
        <div className={`adsense-container ${className}`} style={{ overflow: 'hidden', ...style }}>
            <ins
                ref={insRef}
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
