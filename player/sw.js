/**
 * Pebbble Player Service Worker
 * Caches app shell for offline use
 */

const CACHE_NAME = 'pebbble-v19';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/base.css',
    './css/components.css',
    './css/animations.css',
    './js/app.js',
    './js/services/EventBus.js',
    './js/services/I18nService.js',
    './js/services/StorageService.js',
    './js/services/CryptoService.js',
    './js/services/IPFSService.js',
    './js/services/AudioService.js',
    './js/services/DateLockService.js',
    './js/services/InstallPromptService.js',
    './js/components/PebbblePlayer.js',
    './js/components/HomeScreen.js',
    './js/components/SettingsPanel.js',
    './js/components/PlayerSheet.js',
    './js/components/MiniPlayer.js',
    './js/components/MagicStoneWelcome.js',
    './js/components/DeviceModeSelector.js',
    './js/components/PlaylistView.js',
    './js/components/PlayerControls.js',
    './js/components/ProgressBar.js',
    './js/components/StoneCanvas.js',
    './js/components/TapeCanvas.js',
    './js/components/PlaybackModes.js',
    './js/components/SleepTimer.js',
    './js/components/LanguageSelector.js',
    './js/components/OfflineLibrary.js',
    './js/components/Toast.js',
    './js/i18n/en.json',
    './js/i18n/fr.json',
    './js/i18n/zh.json',
    './js/i18n/es.json'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: stale-while-revalidate for static, network-first for IPFS
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-first for IPFS gateways
    if (url.hostname.includes('ipfs') || url.hostname.includes('pinata')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Stale-while-revalidate for static assets
    // Returns cached version immediately, then updates cache in background
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request).then((response) => {
                    // Update cache with new version
                    if (response.ok) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => cached);

                // Return cached immediately, or wait for network
                return cached || fetchPromise;
            });
        })
    );
});
