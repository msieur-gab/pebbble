/**
 * PeeblePlayer - Main application shell component
 * Manages app flow: NFC prompt → Welcome → Device mode → Player
 */

import { eventBus, Events } from '../services/EventBus.js';
import { i18n, t } from '../services/I18nService.js';
import { storage } from '../services/StorageService.js';
import { nfc } from '../services/NFCService.js';
import { ipfs } from '../services/IPFSService.js';
import { cryptoService } from '../services/CryptoService.js';
import { audio } from '../services/AudioService.js';
import { dateLock } from '../services/DateLockService.js';

// App screens/states
const Screen = {
    NFC_PROMPT: 'nfc_prompt',
    WELCOME: 'welcome',
    DEVICE_MODE: 'device_mode',
    LOADING: 'loading',
    PLAYER: 'player',
    ERROR: 'error'
};

class PeeblePlayer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            screen: Screen.NFC_PROMPT,
            nfcData: null,
            playlist: [],
            error: null,
            loadingMessage: ''
        };

        this.isLoading = false; // Guard against double loading

        this.unsubscribers = [];
    }

    connectedCallback() {
        console.log('🎮 PeeblePlayer connected');
        this.render();
        console.log('🎮 PeeblePlayer rendered');
        this.setupEventListeners();
        this.checkUrlParams();
    }

    /**
     * Check for URL parameters
     * - Debug mode: #playlistHash=Qm...&serial=04:2D:B7:1A:E7:1C:90
     * - NFC launch: #playlistHash=Qm... (need to scan for serial)
     */
    checkUrlParams() {
        const hash = window.location.hash.slice(1);
        if (!hash) return;

        const params = new URLSearchParams(hash);
        const playlistHash = params.get('playlistHash');
        const serial = params.get('serial');

        if (playlistHash && serial) {
            // Debug mode: both params provided
            console.log('🧪 Debug mode: Using URL parameters');
            console.log(`   Playlist: ${playlistHash}`);
            console.log(`   Serial: ${serial}`);

            this.handleNfcRead({
                serial,
                url: `https://play.pebbble.app/#playlistHash=${playlistHash}`
            });
        } else if (playlistHash) {
            // App launched via NFC tag - we have the hash but need to scan for serial
            console.log('📱 Launched via NFC URL, need to scan for serial');
            console.log(`   Playlist: ${playlistHash}`);

            // Store the playlistHash for later use when we get the serial
            this.pendingPlaylistHash = playlistHash;

            // Emit event so NfcPrompt knows we're in "rescan" mode
            eventBus.emit(Events.NFC_RESCAN_NEEDED, { playlistHash });
        }
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
        dateLock.stopWatching();
    }

    setupEventListeners() {
        // NFC events
        this.unsubscribers.push(
            eventBus.on(Events.NFC_ACTIVATED, () => {
                this.updateState({ screen: Screen.NFC_PROMPT });
                this.render();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_TAG_READ, (data) => {
                this.handleNfcRead(data);
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_ERROR, (data) => {
                this.showError(data.message);
            })
        );

        // App flow events
        this.unsubscribers.push(
            eventBus.on(Events.WELCOME_COMPLETE, () => {
                this.handleWelcomeComplete();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.DEVICE_MODE_SET, () => {
                this.loadPlaylist();
            })
        );

        // Language change
        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.render();
                // Restore now playing title after re-render
                this.updateNowPlayingTitle();
            })
        );

        // Offline playlist selection
        this.unsubscribers.push(
            eventBus.on(Events.OFFLINE_PLAYLIST_SELECT, (data) => {
                this.handleOfflinePlaylistSelect(data);
            })
        );

        // Track change - update now playing title
        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                const titleEl = this.shadowRoot?.getElementById('current-track-title');
                if (titleEl && data.track) {
                    titleEl.textContent = data.track.title;
                }
            })
        );
    }

    async handleNfcRead(data) {
        const { serial, url } = data;

        if (!serial) {
            this.showError(t('nfc.error'));
            return;
        }

        // Use pending playlistHash from URL if available, otherwise parse from NFC URL
        let playlistHash = this.pendingPlaylistHash;
        if (!playlistHash && url) {
            playlistHash = nfc.parsePlaylistHash(url);
        }

        if (!playlistHash) {
            this.showError(t('errors.decryptionFailed'));
            return;
        }

        // Clear pending hash
        this.pendingPlaylistHash = null;

        // Store NFC data
        this.updateState({
            nfcData: { serial, url, playlistHash },
            screen: Screen.WELCOME
        });

        this.render();
    }

    handleWelcomeComplete() {
        // Check if device mode is already set
        const mode = storage.getDeviceMode();
        const remembered = localStorage.getItem('pebbble-device-mode');

        if (remembered) {
            // Already have a preference, go straight to loading
            this.loadPlaylist();
        } else {
            // Need to ask about device mode
            this.updateState({ screen: Screen.DEVICE_MODE });
            this.render();
        }
    }

    /**
     * Handle selection of an offline/cached playlist
     */
    handleOfflinePlaylistSelect(data) {
        const { playlistHash, serial } = data;

        // Set up nfcData as if we scanned the tag
        this.updateState({
            nfcData: {
                serial,
                playlistHash,
                url: `https://play.pebbble.app/#playlistHash=${playlistHash}`
            }
        });

        // Load playlist directly (skip welcome since we already have permission)
        this.loadPlaylist();
    }

    async loadPlaylist() {
        const { nfcData } = this.state;
        if (!nfcData) return;

        // Prevent double loading
        if (this.isLoading) {
            console.log('⚠️ Already loading, skipping duplicate call');
            return;
        }
        this.isLoading = true;

        this.updateState({
            screen: Screen.LOADING,
            loadingMessage: t('storage.downloading')
        });
        this.render();

        try {
            // Check if playlist is cached
            const cachedPlaylist = await storage.getPlaylist(nfcData.playlistHash);
            const cachedAudio = await storage.getPlaylistAudio(nfcData.playlistHash);

            if (cachedPlaylist && cachedAudio.length > 0) {
                console.log('💾 Loading from cache...');
                await this.loadFromCache(cachedPlaylist, cachedAudio);
            } else {
                console.log('🌐 Downloading from network...');
                await this.loadFromNetwork();
            }

            // Start watching for date changes
            dateLock.startWatching(() => {
                const updated = dateLock.annotatePlaylist(this.state.playlist);
                this.updateState({ playlist: updated });
                this.render();
            });

        } catch (error) {
            console.error('Failed to load playlist:', error);
            this.showError(t('storage.error'));
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load playlist from IndexedDB cache
     */
    async loadFromCache(cachedPlaylist, cachedAudio) {
        this.updateState({ loadingMessage: t('storage.cached') });
        this.render();

        const tracks = [];

        // Show player immediately
        this.updateState({
            screen: Screen.PLAYER,
            playlist: []
        });
        this.render();

        // Build tracks from cached audio
        for (const audioRecord of cachedAudio) {
            const audioUrl = URL.createObjectURL(audioRecord.blob);

            // Find message info from manifest
            const messageInfo = cachedPlaylist.manifest.messages?.find(
                m => m.messageId === audioRecord.id
            ) || {};

            const track = {
                id: audioRecord.id,
                title: audioRecord.title || `Message ${tracks.length + 1}`,
                audioUrl,
                duration: audioRecord.duration || await this.getAudioDuration(audioUrl),
                availableFrom: messageInfo.availableFrom,
                availableTo: messageInfo.availableTo,
                timestamp: audioRecord.timestamp
            };

            const annotatedTrack = {
                ...track,
                lockInfo: dateLock.checkAvailability(track)
            };

            tracks.push(annotatedTrack);
            console.log('💾 Loaded from cache:', track.title);
        }

        // Sort by original order in manifest
        const messageOrder = cachedPlaylist.manifest.messages?.map(m => m.messageId) || [];
        tracks.sort((a, b) => {
            const indexA = messageOrder.indexOf(a.id);
            const indexB = messageOrder.indexOf(b.id);
            return indexA - indexB;
        });

        // Load into audio service and auto-play
        const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
        audio.loadPlaylist(availableTracks);

        this.updateState({ playlist: tracks });
        this.render();
        this.updateNowPlayingTitle();

        // Update last played timestamp
        await storage.updateLastPlayed(this.state.nfcData.playlistHash);

        console.log('📊 Loaded from cache:', tracks.length, 'tracks');

        // Auto-play first available track
        if (availableTracks.length > 0) {
            await audio.play();
        }
    }

    /**
     * Load playlist from network (IPFS)
     */
    async loadFromNetwork() {
        const { nfcData } = this.state;

        // Download playlist manifest
        const manifest = await ipfs.downloadPlaylist(nfcData.playlistHash);

        this.updateState({ loadingMessage: t('storage.decrypting') });
        this.render();

        // Show player immediately with empty playlist (progressive loading)
        console.log('📋 Manifest:', manifest);
        const tracks = [];

        this.updateState({
            screen: Screen.PLAYER,
            playlist: []
        });
        this.render();

        // Download and decrypt messages progressively
        const messages = manifest.messages || [];

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            try {
                // Download package
                const pkg = await ipfs.downloadMessage(message.ipfsHash);
                const fullPkg = {
                    ...pkg,
                    messageId: message.messageId,
                    availableFrom: message.availableFrom,
                    availableTo: message.availableTo
                };

                console.log('🔐 Processing:', fullPkg.messageId);

                // Decrypt
                const audioBlob = await cryptoService.decryptAudioPackage(fullPkg, nfcData.serial);
                const audioUrl = URL.createObjectURL(audioBlob);
                const duration = await this.getAudioDuration(audioUrl);

                const track = {
                    id: fullPkg.messageId,
                    title: fullPkg.metadata?.title || `Message ${tracks.length + 1}`,
                    audioUrl,
                    duration,
                    availableFrom: fullPkg.availableFrom,
                    availableTo: fullPkg.availableTo,
                    timestamp: fullPkg.timestamp
                };

                // Annotate with lock info
                const annotatedTrack = {
                    ...track,
                    lockInfo: dateLock.checkAvailability(track)
                };

                tracks.push(annotatedTrack);
                console.log('🎵 Track ready:', track.title, `(${i + 1}/${messages.length})`);

                // Update playlist progressively
                const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
                audio.loadPlaylist(availableTracks);

                this.updateState({ playlist: [...tracks] });
                this.render();

                // Auto-play on first track
                if (i === 0 && availableTracks.length > 0) {
                    this.updateNowPlayingTitle();
                    await audio.play();
                }

                // Save to storage if in personal mode
                if (storage.isAvailable()) {
                    await storage.saveAudio(fullPkg.messageId, nfcData.playlistHash, audioBlob, {
                        title: fullPkg.metadata?.title,
                        duration
                    });
                }

            } catch (error) {
                console.error('Failed to process message:', message.messageId, error);
            }
        }

        console.log('📊 Total tracks:', tracks.length);

        // Save playlist metadata
        if (storage.isAvailable()) {
            await storage.savePlaylist(nfcData.playlistHash, nfcData.serial, manifest);
        }
    }

    getAudioDuration(url) {
        return new Promise((resolve) => {
            const tempAudio = new Audio(url);
            tempAudio.addEventListener('loadedmetadata', () => {
                resolve(tempAudio.duration);
            });
            tempAudio.addEventListener('error', () => {
                resolve(0);
            });
        });
    }

    showError(message) {
        this.updateState({
            screen: Screen.ERROR,
            error: message
        });
        this.render();
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    updateNowPlayingTitle() {
        const titleEl = this.shadowRoot?.getElementById('current-track-title');
        if (titleEl) {
            const state = audio.getState();
            if (state.currentTrack) {
                titleEl.textContent = state.currentTrack.title;
            }
        }
    }

    render() {
        const { screen } = this.state;
        console.log('🎮 Rendering screen:', screen);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    min-height: 100vh;
                    min-height: 100dvh;
                }

                .container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    height: 100dvh;
                    padding: 1rem;
                    max-width: 480px;
                    margin: 0 auto;
                    box-sizing: border-box;
                }

                @media (min-width: 400px) {
                    .container {
                        padding: 1.5rem;
                    }
                }

                .screen {
                    display: none;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }

                .screen.active {
                    display: flex;
                }

                .player-screen {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                }

                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.25rem 0;
                    flex-shrink: 0;
                }

                .header__title {
                    font-size: 1.125rem;
                    font-weight: 600;
                }

                .now-playing {
                    text-align: center;
                    padding: 0.25rem 0;
                    flex-shrink: 0;
                }

                .now-playing__label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--color-text-muted, #666);
                    margin-bottom: 0.25rem;
                }

                .now-playing__title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-primary, #fff);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .transport-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0;
                    flex-shrink: 0;
                }
            </style>

            <div class="container">
                <div class="screen ${screen === Screen.NFC_PROMPT ? 'active' : ''}" id="screen-nfc">
                    <nfc-prompt></nfc-prompt>
                </div>

                <div class="screen ${screen === Screen.WELCOME ? 'active' : ''}" id="screen-welcome">
                    <magic-stone-welcome></magic-stone-welcome>
                </div>

                <div class="screen ${screen === Screen.DEVICE_MODE ? 'active' : ''}" id="screen-device">
                    <device-mode-selector></device-mode-selector>
                </div>

                <div class="screen ${screen === Screen.LOADING ? 'active' : ''}" id="screen-loading">
                    ${this.renderLoading()}
                </div>

                <div class="screen ${screen === Screen.PLAYER ? 'active' : ''}" id="screen-player">
                    ${this.renderPlayer()}
                </div>

                <div class="screen ${screen === Screen.ERROR ? 'active' : ''}" id="screen-error">
                    ${this.renderError()}
                </div>
            </div>
        `;
    }

    renderLoading() {
        return `
            <div class="loading-screen" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                text-align: center;
            ">
                <div class="stone-visual" style="margin-bottom: 2rem;">
                    <div class="stone-visual__shape animate-float animate-glow" style="
                        width: 100px;
                        height: 100px;
                        background: linear-gradient(135deg, var(--color-accent) 0%, #cc3d00 50%, #993000 100%);
                        border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.3);
                    "></div>
                </div>
                <p style="color: var(--color-text-secondary);">
                    ${this.state.loadingMessage || t('storage.downloading')}
                </p>
            </div>
        `;
    }

    renderPlayer() {
        return `
            <div class="player-screen">
                <header class="header">
                    <h1 class="header__title">${t('player.playlist')}</h1>
                    <div class="header__actions">
                        <language-selector></language-selector>
                    </div>
                </header>

                <tape-canvas></tape-canvas>

                <div class="now-playing">
                    <p class="now-playing__label">${t('player.nowPlaying')}</p>
                    <h2 class="now-playing__title" id="current-track-title">-</h2>
                </div>

                <progress-bar></progress-bar>

                <div class="transport-row">
                    <playback-modes></playback-modes>
                    <player-controls></player-controls>
                    <sleep-timer></sleep-timer>
                </div>

                <playlist-view></playlist-view>
            </div>
        `;
    }

    renderError() {
        return `
            <div class="error-screen" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                text-align: center;
                padding: 2rem;
            ">
                <div style="
                    font-size: 4rem;
                    margin-bottom: 1rem;
                ">😔</div>
                <h2 style="
                    color: var(--color-text-primary);
                    margin-bottom: 0.5rem;
                ">${t('errors.unknownError')}</h2>
                <p style="
                    color: var(--color-text-secondary);
                    margin-bottom: 2rem;
                ">${this.state.error || ''}</p>
                <button class="btn btn--primary" id="retry-btn">
                    ${t('nfc.activate')}
                </button>
            </div>
        `;
    }
}

customElements.define('pebbble-player', PeeblePlayer);

export default PeeblePlayer;
