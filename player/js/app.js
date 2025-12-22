/**
 * Pebbble Player - Application Entry Point (Android NFC version)
 * Initializes services and registers components
 * Uses Web NFC API to extract tag serial for secure decryption
 */

// Services
import { i18n } from './services/I18nService.js';
import { storage } from './services/StorageService.js';
import { audio } from './services/AudioService.js';
import { eventBus, Events } from './services/EventBus.js';
import { installPrompt } from './services/InstallPromptService.js';
import { nfc } from './services/NFCService.js';

// Components
import './components/PebbblePlayer.js';
import './components/HomeScreen.js';
import './components/NfcPrompt.js';
import './components/SettingsPanel.js';
import './components/MagicStoneWelcome.js';
import './components/DeviceModeSelector.js';
import './components/PlaylistView.js';
import './components/PlayerControls.js';
import './components/ProgressBar.js';
import './components/StoneCanvas.js';
import './components/TapeCanvas.js';
import './components/PlaybackModes.js';
import './components/SleepTimer.js';
import './components/LanguageSelector.js';
import './components/OfflineLibrary.js';
import './components/Toast.js';
import './components/PlayerSheet.js';
import './components/MiniPlayer.js';

/**
 * Initialize the application
 */
async function init() {
    console.log('🪨 Pebbble Player initializing...');

    try {
        // 1. Register service worker for PWA
        await registerServiceWorker();

        // 2. Initialize i18n (auto-detects language)
        await i18n.init();
        console.log(`🌐 Language: ${i18n.getLanguage()}`);

        // 3. Initialize storage service
        await storage.init();
        console.log(`💾 Storage mode: ${storage.getDeviceMode()}`);

        // 4. Initialize audio service with the audio element
        const audioElement = document.getElementById('audio-element');
        if (audioElement) {
            audio.init(audioElement);
            console.log('🔊 Audio service ready');
        }

        // 5. Initialize install prompt
        installPrompt.init();

        // 6. Check NFC support
        if (nfc.isSupported()) {
            console.log('📡 NFC supported');
        } else {
            console.log('📡 NFC not supported - Web NFC requires Chrome on Android');
        }

        console.log('✅ Pebbble Player ready! (Android NFC version)');

    } catch (error) {
        console.error('❌ Initialization failed:', error);
    }
}

/**
 * Register the service worker for PWA functionality
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('📦 Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available
                        eventBus.emit(Events.SHOW_TOAST, {
                            message: 'Update available!',
                            type: 'info',
                            duration: 0,
                            action: {
                                label: 'Refresh',
                                callback: () => window.location.reload()
                            }
                        });
                    }
                });
            });
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }
}

/**
 * Handle visibility changes (for timer/audio management)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // App moved to background
        console.log('📱 App backgrounded');
    } else {
        // App returned to foreground
        console.log('📱 App foregrounded');
    }
});

/**
 * Handle before unload (cleanup)
 */
window.addEventListener('beforeunload', () => {
    // Cleanup audio resources
    audio.destroy();
});

/**
 * Prevent pull-to-refresh on mobile (can interfere with touch controls)
 */
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.pebbble = {
    eventBus,
    audio,
    storage,
    i18n,
    nfc
};
