/**
 * PebbblePlayer - Main application shell component
 * Manages app flow: Home → [Welcome → Device mode] → Loading → Home (with player sheet)
 * Tag data comes from URL hash: #serial=XX&playlistHash=XX
 * Player is a bottom sheet overlay, not a separate screen
 */

import { eventBus, Events } from '../services/EventBus.js';
import { i18n, t } from '../services/I18nService.js';
import { storage } from '../services/StorageService.js';
import { ipfs } from '../services/IPFSService.js';
import { cryptoService } from '../services/CryptoService.js';
import { audio } from '../services/AudioService.js';
import { dateLock } from '../services/DateLockService.js';

// App screens/states (PLAYER is now a sheet overlay, not a screen)
const Screen = {
    HOME: 'home',
    WELCOME: 'welcome',
    DEVICE_MODE: 'device_mode',
    LOADING: 'loading',
    ERROR: 'error'
};

class PebbblePlayer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            screen: Screen.HOME,
            nfcData: null,
            playlist: [],
            error: null,
            loadingMessage: ''
        };

        this.isLoading = false;
        this.unsubscribers = [];
        this.boundHashChangeHandler = this.handleHashChange.bind(this);
    }

    async connectedCallback() {
        console.log('🎮 PebbblePlayer connected');
        this.render();
        this.setupEventListeners();

        // Listen for URL hash changes (new tag taps while app is open)
        window.addEventListener('hashchange', this.boundHashChangeHandler);

        // Check URL params - if we have both serial and playlistHash, handle tag
        const urlParams = this.parseUrlParams();
        if (urlParams) {
            this.handleTagUrl(urlParams);
        }
    }

    parseUrlParams() {
        const hash = window.location.hash.slice(1);
        if (!hash) return null;

        const params = new URLSearchParams(hash);
        const serial = params.get('serial');
        const playlistHash = params.get('playlistHash');

        if (serial && playlistHash) {
            return { serial: serial.toUpperCase(), playlistHash };
        }
        return null;
    }

    /**
     * Check if a playlist is already in the user's library
     */
    async isInLibrary(playlistHash) {
        try {
            const playlists = await storage.getAllPlaylists();
            return playlists.some(p => p.id === playlistHash);
        } catch {
            return false;
        }
    }

    /**
     * Handle URL-based tag loading - always show HOME first with contextual message
     */
    async handleTagUrl(params) {
        const { serial, playlistHash } = params;
        console.log('🏷️ Tag detected from URL');
        console.log(`   Serial: ${serial}`);
        console.log(`   Playlist: ${playlistHash}`);

        // Store tag data
        this.updateState({
            nfcData: { serial, playlistHash, url: window.location.href }
        });

        // Check if this tag is new (not in library)
        const isNew = !(await this.isInLibrary(playlistHash));

        // Check if this is a first-time user (no device mode set)
        const remembered = localStorage.getItem('pebbble-device-mode');

        if (!remembered) {
            // First-time user - show welcome flow
            this.updateState({ screen: Screen.WELCOME });
            this.render();
        } else {
            // Returning user - show HOME with tag detected message
            this.updateState({ screen: Screen.HOME });
            this.render();

            // Emit tag detected for HomeScreen to show contextual UI
            eventBus.emit(Events.TAG_DETECTED, { serial, playlistHash, isNew });
        }
    }

    handleHashChange() {
        const params = this.parseUrlParams();
        if (params) {
            console.log('🔄 Hash changed - new tag detected');
            this.handleTagUrl(params);
        }
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
        window.removeEventListener('hashchange', this.boundHashChangeHandler);
        dateLock.stopWatching();
    }

    setupEventListeners() {
        // Welcome complete
        this.unsubscribers.push(
            eventBus.on(Events.WELCOME_COMPLETE, () => {
                this.handleWelcomeComplete();
            })
        );

        // Device mode set
        this.unsubscribers.push(
            eventBus.on(Events.DEVICE_MODE_SET, () => {
                this.loadPlaylist();
            })
        );

        // Language change
        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.render();
            })
        );

        // Offline playlist selection (from library or tag action)
        this.unsubscribers.push(
            eventBus.on(Events.OFFLINE_PLAYLIST_SELECT, (data) => {
                this.handleOfflinePlaylistSelect(data);
            })
        );
    }

    handleWelcomeComplete() {
        const remembered = localStorage.getItem('pebbble-device-mode');

        if (remembered) {
            this.loadPlaylist();
        } else {
            this.updateState({ screen: Screen.DEVICE_MODE });
            this.render();
        }
    }

    handleOfflinePlaylistSelect(data) {
        const { playlistHash, serial } = data;

        this.updateState({
            nfcData: {
                serial,
                playlistHash,
                url: `https://play.pebbble.app/#playlistHash=${playlistHash}`
            }
        });

        this.loadPlaylist();
    }

    async loadPlaylist() {
        const { nfcData } = this.state;
        if (!nfcData) return;

        if (this.isLoading) {
            console.log('⚠️ Already loading, skipping duplicate call');
            return;
        }
        this.isLoading = true;

        // Show loading screen
        this.updateState({
            screen: Screen.LOADING,
            loadingMessage: t('storage.downloading')
        });
        this.render();

        try {
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
            });

        } catch (error) {
            console.error('Failed to load playlist:', error);
            this.showError(t('storage.error'));
        } finally {
            this.isLoading = false;
        }
    }

    async loadFromCache(cachedPlaylist, cachedAudio) {
        this.updateState({ loadingMessage: t('storage.cached') });
        this.render();

        const tracks = [];

        for (const audioRecord of cachedAudio) {
            const audioUrl = URL.createObjectURL(audioRecord.blob);
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

            tracks.push({
                ...track,
                lockInfo: dateLock.checkAvailability(track)
            });
        }

        // Sort by original order
        const messageOrder = cachedPlaylist.manifest.messages?.map(m => m.messageId) || [];
        tracks.sort((a, b) => messageOrder.indexOf(a.id) - messageOrder.indexOf(b.id));

        // Load into audio service
        const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
        await audio.loadPlaylist(availableTracks);

        this.updateState({ playlist: tracks });

        // Update last played
        await storage.updateLastPlayed(this.state.nfcData.playlistHash);

        // Emit playlist loaded
        eventBus.emit(Events.PLAYLIST_LOADED, { tracks, count: tracks.length });

        // Go back to HOME and open player sheet
        this.updateState({ screen: Screen.HOME });
        this.render();
        eventBus.emit(Events.PLAYER_SHEET_OPEN);

        // Auto-play
        if (availableTracks.length > 0) {
            await audio.play();
        }
    }

    async loadFromNetwork() {
        const { nfcData } = this.state;
        const manifest = await ipfs.downloadPlaylist(nfcData.playlistHash);

        this.updateState({ loadingMessage: t('storage.decrypting') });
        this.render();

        const tracks = [];
        const messages = manifest.messages || [];

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            try {
                const pkg = await ipfs.downloadMessage(message.ipfsHash);
                const fullPkg = {
                    ...pkg,
                    messageId: message.messageId,
                    availableFrom: message.availableFrom,
                    availableTo: message.availableTo
                };

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
                    timestamp: fullPkg.timestamp,
                    lockInfo: dateLock.checkAvailability({
                        availableFrom: fullPkg.availableFrom,
                        availableTo: fullPkg.availableTo
                    })
                };

                tracks.push(track);

                // Save to storage if in personal mode
                if (storage.isAvailable()) {
                    await storage.saveAudio(fullPkg.messageId, nfcData.playlistHash, audioBlob, {
                        title: fullPkg.metadata?.title,
                        duration
                    });
                }

                // On first track, open player sheet and start playback
                if (i === 0) {
                    const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
                    await audio.loadPlaylist(availableTracks);

                    this.updateState({ playlist: [...tracks], screen: Screen.HOME });
                    this.render();

                    eventBus.emit(Events.PLAYLIST_LOADED, { tracks, count: messages.length });
                    eventBus.emit(Events.PLAYER_SHEET_OPEN);

                    if (availableTracks.length > 0) {
                        await audio.play();
                    }
                } else {
                    // Progressive update
                    const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
                    await audio.loadPlaylist(availableTracks);
                    this.updateState({ playlist: [...tracks] });
                }

            } catch (error) {
                console.error('Failed to process message:', message.messageId, error);
            }
        }

        // Save playlist metadata
        if (storage.isAvailable()) {
            await storage.savePlaylist(nfcData.playlistHash, nfcData.serial, manifest);
        }
    }

    getAudioDuration(url) {
        return new Promise((resolve) => {
            const tempAudio = new Audio(url);
            tempAudio.addEventListener('loadedmetadata', () => resolve(tempAudio.duration));
            tempAudio.addEventListener('error', () => resolve(0));
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
                    padding-bottom: 80px; /* Space for mini player */
                    max-width: 480px;
                    margin: 0 auto;
                    box-sizing: border-box;
                }

                @media (min-width: 400px) {
                    .container {
                        padding: 1.5rem;
                        padding-bottom: 90px;
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
            </style>

            <div class="container">
                <div class="screen ${screen === Screen.HOME ? 'active' : ''}" id="screen-home">
                    <home-screen></home-screen>
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
                <div style="margin-bottom: 2rem;">
                    <div style="
                        width: 100px;
                        height: 100px;
                        background: linear-gradient(135deg, var(--color-accent) 0%, #cc3d00 50%, #993000 100%);
                        border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.3);
                        animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite;
                    "></div>
                </div>
                <p style="color: var(--color-text-secondary);">
                    ${this.state.loadingMessage || t('storage.downloading')}
                </p>
            </div>
            <style>
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.3); }
                    50% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 30px rgba(255, 77, 0, 0.5); }
                }
            </style>
        `;
    }

    renderError() {
        return `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                text-align: center;
                padding: 2rem;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1.5rem;
                    background: linear-gradient(135deg, #666 0%, #444 50%, #333 100%);
                    border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
                    opacity: 0.5;
                "></div>
                <h2 style="
                    color: var(--color-text-primary);
                    margin-bottom: 0.5rem;
                ">${t('errors.unknownError')}</h2>
                <p style="
                    color: var(--color-text-secondary);
                    margin-bottom: 2rem;
                ">${this.state.error || ''}</p>
                <button class="btn btn--primary" onclick="location.reload()">
                    ${t('welcome.continue')}
                </button>
            </div>
        `;
    }
}

customElements.define('pebbble-player', PebbblePlayer);

export default PebbblePlayer;
