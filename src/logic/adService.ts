import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// Google AdMob Rewarded Ad Unit ID
const REAL_REWARDED_ID = 'ca-app-pub-3352266449267869/9240397827';
// Google's official Test ID for Android
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

// SET THIS TO 'false' when you are ready to release and earn revenue!
const USE_TEST_ADS = true

export class AdService {
    private static initialized = false;
    private static isAdLoaded = false;

    static async initialize() {
        if (this.initialized || !Capacitor.isNativePlatform()) return;

        try {
            await AdMob.initialize({
                initializeForTesting: true,
            });
            this.initialized = true;
            console.log('AdMob Initialized');

            // Pre-load the first ad immediately
            await this.loadAd();
        } catch (e) {
            console.error('AdMob Init Failed:', e);
        }
    }

    /**
     * Internal method to prepare/load an ad in the background
     */
    private static async loadAd() {
        if (!this.initialized || !Capacitor.isNativePlatform()) return;

        try {
            const adUnitId = USE_TEST_ADS ? TEST_REWARDED_ID : REAL_REWARDED_ID;
            const options: RewardAdOptions = {
                adId: adUnitId,
            };
            await AdMob.prepareRewardVideoAd(options);
            this.isAdLoaded = true;
            console.log('AdMob: Ad Pre-loaded and ready');
        } catch (e) {
            console.error('AdMob: Failed to pre-load ad:', e);
            this.isAdLoaded = false;
        }
    }

    /**
     * Shows a rewarded ad and returns a promise that resolves when the user earns a reward
     */
    static async showRewardedAd(): Promise<{ success: boolean; error?: string }> {
        if (!Capacitor.isNativePlatform()) {
            console.warn('AdMob skipped: Not on native platform');
            return { success: true }; // Simulate success for web dev
        }

        // If not loaded yet (or previous failed), try to load it now
        if (!this.isAdLoaded) {
            console.log('AdMob: Ad not ready, loading on demand...');
            try {
                await this.loadAd();
            } catch (e: any) {
                return { success: false, error: e?.message || "Failed to load pre-ad" };
            }
        }

        if (!this.isAdLoaded) {
            return { success: false, error: "Ad rejected or failed to load. Check AdMob console." };
        }

        return new Promise(async (resolve) => {
            let rewarded = false;
            const handlers: PluginListenerHandle[] = [];

            const onRewarded = (reward: AdMobRewardItem) => {
                console.log('User earned reward:', reward);
                rewarded = true;
            };

            const onDismissed = () => {
                console.log('Ad dismissed');
                cleanup();
                // Start loading the next ad for next time
                this.isAdLoaded = false;
                this.loadAd();
                resolve({ success: rewarded });
            };

            const onFailed = (error: any) => {
                console.error('AdMob Error Details:', JSON.stringify(error));
                cleanup();
                this.isAdLoaded = false;
                // Try to load again for next time
                this.loadAd();
                resolve({ success: false, error: error?.message || "Ad failed to show (FailedToShow)" });
            };

            const cleanup = () => {
                handlers.forEach(h => h.remove());
            };

            try {
                // Add listeners and store handles
                handlers.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, onRewarded));
                handlers.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, onDismissed));
                handlers.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, onFailed));

                // Show the already prepared ad
                await AdMob.showRewardVideoAd();
            } catch (e: any) {
                console.error('Error playing rewarded ad:', e);
                cleanup();
                this.isAdLoaded = false;
                this.loadAd();
                resolve({ success: false, error: e?.message || "Exception while showing ad" });
            }
        });
    }
}
