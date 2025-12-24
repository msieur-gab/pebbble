/**
 * PebbblePlayer - Main application shell component (Android NFC version)
 * Manages app flow: NFC_PROMPT → [Welcome → Device mode] → Loading → Home (with player sheet)
 * Serial is extracted from NFC tag scan (not from URL) for better security
 * playlistHash comes from the tag's NDEF URL record
 * Player is a bottom sheet overlay, not a separate screen
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { i18n, t } from '../services/I18nService.js';
import { storage } from '../services/StorageService.js';
import { ipfs } from '../services/IPFSService.js';
import { cryptoService } from '../services/CryptoService.js';
import { audio } from '../services/AudioService.js';
import { dateLock } from '../services/DateLockService.js';
import { nfc } from '../services/NFCService.js';

const Screen = {
    ONBOARDING: 'onboarding',
    HOME: 'home',
    WELCOME: 'welcome',
    DEVICE_MODE: 'device_mode',
    TAP_TO_LISTEN: 'tap_to_listen',
    LOADING: 'loading',
    ERROR: 'error'
};

class PebbblePlayer extends LitElement {
    static properties = {
        screen: { state: true },
        nfcData: { state: true },
        playlist: { state: true },
        error: { state: true },
        loadingMessage: { state: true },
        i18nReady: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            height: 100%;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 1rem;
            padding-bottom: 80px;
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

        /* Tap to listen screen */
        .tap-to-listen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
        }

        .tap-stone {
            position: relative;
            margin-bottom: 2rem;
        }

        .pulse-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 140px;
            height: 140px;
            border-radius: 50%;
            border: 2px solid var(--color-accent, #FF4D00);
            opacity: 0;
            animation: pulse-ring 2s ease-out infinite;
        }

        .pulse-ring:nth-child(2) { animation-delay: 0.5s; }
        .pulse-ring:nth-child(3) { animation-delay: 1s; }

        @keyframes pulse-ring {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }

        .stone {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 30px rgba(255, 77, 0, 0.4);
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .tap-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
            margin-bottom: 0.5rem;
        }

        .tap-subtitle {
            font-size: 0.9rem;
            color: var(--color-text-muted, #888);
        }

        /* Loading screen */
        .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            text-align: center;
        }

        .loading-stone {
            width: 100px;
            height: 100px;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, var(--color-accent) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.3);
            animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.3); }
            50% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 30px rgba(255, 77, 0, 0.5); }
        }

        .loading-text {
            color: var(--color-text-secondary);
        }

        /* Error screen */
        .error-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            text-align: center;
            padding: 2rem;
        }

        .error-stone {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #666 0%, #444 50%, #333 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            opacity: 0.5;
        }

        .error-title {
            color: var(--color-text-primary);
            margin-bottom: 0.5rem;
        }

        .error-message {
            color: var(--color-text-secondary);
            margin-bottom: 2rem;
        }

        .btn--primary {
            padding: 0.875rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            background: var(--color-accent, #FF4D00);
            color: #fff;
            border: none;
            border-radius: 50px;
            cursor: pointer;
        }
    `;

    constructor() {
        super();
        this.screen = Screen.HOME;
        this.nfcData = null;
        this.playlist = [];
        this.error = null;
        this.loadingMessage = '';
        this.isLoading = false;
        this.i18nReady = false;
        this.unsubscribers = [];
    }

    async connectedCallback() {
        super.connectedCallback();
        console.log('🎮 PebbblePlayer connected (Android NFC version)');
        this.setupEventListeners();

        // Check if i18n is already ready (might have loaded before component)
        const { i18n } = await import('../services/I18nService.js');
        if (i18n.isReady) {
            this.i18nReady = true;
            await this.initializeScreen();
        }
    }

    async initializeScreen() {
        // Check if first-time user needs onboarding
        const hasOnboarded = localStorage.getItem('pebbble-onboarded');
        const hasPlaylists = await this.checkForExistingPlaylists();

        if (!hasOnboarded && !hasPlaylists) {
            console.log('🆕 First-time user - showing onboarding');
            this.screen = Screen.ONBOARDING;
        }
    }

    async checkForExistingPlaylists() {
        try {
            const playlists = await storage.getAllPlaylists();
            return playlists && playlists.length > 0;
        } catch (e) {
            return false;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        dateLock.stopWatching();
        nfc.stopReader();
    }

    async handleNfcTagRead(data) {
        const { serial, playlistHash, url } = data;
        console.log('🏷️ NFC Tag scanned!');
        console.log(`   Serial: ${serial}`);
        console.log(`   Playlist: ${playlistHash}`);

        if (!serial) {
            console.error('❌ No serial number from NFC tag');
            eventBus.emit(Events.SHOW_TOAST, {
                message: 'Could not read tag serial number',
                type: 'error',
                duration: 5000
            });
            return;
        }

        if (!playlistHash) {
            console.error('❌ No playlist hash in tag URL');
            eventBus.emit(Events.SHOW_TOAST, {
                message: 'Invalid Pebbble tag - no playlist found',
                type: 'error',
                duration: 5000
            });
            return;
        }

        this.nfcData = { serial, playlistHash, url };

        // If we're in onboarding, let the onboarding flow handle the rest
        if (this.screen === Screen.ONBOARDING) {
            console.log('📱 NFC read during onboarding - flow continues there');
            return;
        }

        const remembered = localStorage.getItem('pebbble-device-mode');
        const cached = await storage.getPlaylist(playlistHash);

        if (cached) {
            console.log('📦 Playlist already cached');
            this.screen = Screen.HOME;
            eventBus.emit(Events.TAG_DETECTED, {
                serial,
                playlistHash,
                isNew: false
            });
            eventBus.emit(Events.SHOW_TOAST, {
                message: t('home.alreadyInLibrary'),
                type: 'info',
                duration: 5000
            });
        } else if (!remembered) {
            this.screen = Screen.WELCOME;
        } else {
            this.screen = Screen.TAP_TO_LISTEN;
        }
    }

    setupEventListeners() {
        // Wait for i18n to be ready before showing content
        this.unsubscribers.push(
            eventBus.on(Events.I18N_READY, async () => {
                console.log('🌐 i18n ready');
                this.i18nReady = true;
                await this.initializeScreen();
            })
        );

        // NFC tag read - the main entry point for new playlists
        this.unsubscribers.push(
            eventBus.on(Events.NFC_TAG_READ, (data) => {
                this.handleNfcTagRead(data);
            })
        );

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

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.requestUpdate();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.OFFLINE_PLAYLIST_SELECT, (data) => {
                this.handleOfflinePlaylistSelect(data);
            })
        );

        // Onboarding complete - NFC was scanned during onboarding
        this.unsubscribers.push(
            eventBus.on(Events.ONBOARDING_COMPLETE, () => {
                console.log('✅ Onboarding complete');
                // nfcData was already set by NFC_TAG_READ handler
                if (this.nfcData) {
                    this.loadPlaylist();
                } else {
                    // No tag scanned yet, go to home
                    this.screen = Screen.HOME;
                }
            })
        );
    }

    handleWelcomeComplete() {
        const remembered = localStorage.getItem('pebbble-device-mode');

        if (remembered) {
            this.loadPlaylist();
        } else {
            this.screen = Screen.DEVICE_MODE;
        }
    }

    handleOfflinePlaylistSelect(data) {
        const { playlistHash, serial } = data;

        this.nfcData = {
            serial,
            playlistHash,
            url: `https://play.pebbble.app/#playlistHash=${playlistHash}`
        };

        this.loadPlaylist();
    }

    async handleTapToListen() {
        await audio.unlock();
        this.loadPlaylist();
    }

    async loadPlaylist() {
        if (!this.nfcData) return;

        if (this.isLoading) {
            console.log('⚠️ Already loading, skipping duplicate call');
            return;
        }
        this.isLoading = true;

        this.screen = Screen.LOADING;
        this.loadingMessage = t('storage.downloading');

        try {
            const cachedPlaylist = await storage.getPlaylist(this.nfcData.playlistHash);
            const cachedAudio = await storage.getPlaylistAudio(this.nfcData.playlistHash);

            if (cachedPlaylist && cachedAudio.length > 0) {
                console.log('💾 Loading from cache...');
                await this.loadFromCache(cachedPlaylist, cachedAudio);
            } else {
                console.log('🌐 Downloading from network...');
                await this.loadFromNetwork();
            }

            dateLock.startWatching(() => {
                const updated = dateLock.annotatePlaylist(this.playlist);
                this.playlist = updated;
            });

        } catch (error) {
            console.error('Failed to load playlist:', error);
            this.showError(t('storage.error'));
        } finally {
            this.isLoading = false;
        }
    }

    async loadFromCache(cachedPlaylist, cachedAudio) {
        this.loadingMessage = t('storage.cached');

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

        const messageOrder = cachedPlaylist.manifest.messages?.map(m => m.messageId) || [];
        tracks.sort((a, b) => messageOrder.indexOf(a.id) - messageOrder.indexOf(b.id));

        const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
        await audio.loadPlaylist(availableTracks);

        this.playlist = tracks;

        await storage.updateLastPlayed(this.nfcData.playlistHash);

        eventBus.emit(Events.PLAYLIST_LOADED, { tracks, count: tracks.length });

        this.screen = Screen.HOME;
        eventBus.emit(Events.PLAYER_SHEET_OPEN);

        if (availableTracks.length > 0) {
            await audio.play();
        }
    }

    async loadFromNetwork() {
        const manifest = await ipfs.downloadPlaylist(this.nfcData.playlistHash);

        // Save playlist metadata immediately so OfflineLibrary can find it
        // when PLAYLIST_LOADED fires (before audio processing completes)
        if (storage.isAvailable()) {
            await storage.savePlaylist(this.nfcData.playlistHash, this.nfcData.serial, manifest);
        }

        this.loadingMessage = t('storage.decrypting');

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

                const audioBlob = await cryptoService.decryptAudioPackage(fullPkg, this.nfcData.serial);
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

                if (storage.isAvailable()) {
                    await storage.saveAudio(fullPkg.messageId, this.nfcData.playlistHash, audioBlob, {
                        title: fullPkg.metadata?.title,
                        duration
                    });
                }

                if (i === 0) {
                    const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
                    await audio.loadPlaylist(availableTracks);

                    this.playlist = [...tracks];
                    this.screen = Screen.HOME;

                    eventBus.emit(Events.PLAYLIST_LOADED, { tracks, count: messages.length });
                    eventBus.emit(Events.PLAYER_SHEET_OPEN);

                    if (availableTracks.length > 0) {
                        await audio.play();
                    }
                } else {
                    const availableTracks = tracks.filter(t => t.lockInfo.status === 'unlocked');
                    await audio.loadPlaylist(availableTracks);
                    this.playlist = [...tracks];
                }

            } catch (error) {
                console.error('Failed to process message:', message.messageId, error);
            }
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
        this.screen = Screen.ERROR;
        this.error = message;
    }

    renderTapToListen() {
        return html`
            <div class="tap-to-listen" @click=${this.handleTapToListen}>
                <div class="tap-stone">
                    <div class="pulse-ring"></div>
                    <div class="pulse-ring"></div>
                    <div class="pulse-ring"></div>
                    <div class="stone"></div>
                </div>
                <p class="tap-title">${t('player.tapToListen')}</p>
                <p class="tap-subtitle">${t('player.newPebbble')}</p>
            </div>
        `;
    }

    renderLoading() {
        return html`
            <div class="loading-screen">
                <div class="loading-stone"></div>
                <p class="loading-text">${this.loadingMessage || t('storage.downloading')}</p>
            </div>
        `;
    }

    renderError() {
        return html`
            <div class="error-screen">
                <div class="error-stone"></div>
                <h2 class="error-title">${t('errors.unknownError')}</h2>
                <p class="error-message">${this.error || ''}</p>
                <button class="btn--primary" @click=${() => location.reload()}>
                    ${t('welcome.continue')}
                </button>
            </div>
        `;
    }

    renderInitialLoading() {
        return html`
            <div class="container">
                <div class="loading-screen">
                    <div class="loading-stone"></div>
                </div>
            </div>
        `;
    }

    render() {
        // Wait for i18n before showing any content
        if (!this.i18nReady) {
            return this.renderInitialLoading();
        }

        console.log('🎮 Rendering screen:', this.screen);

        return html`
            <div class="container">
                <div class="screen ${this.screen === Screen.ONBOARDING ? 'active' : ''}">
                    <onboarding-flow></onboarding-flow>
                </div>

                <div class="screen ${this.screen === Screen.HOME ? 'active' : ''}">
                    <home-screen></home-screen>
                </div>

                <div class="screen ${this.screen === Screen.WELCOME ? 'active' : ''}">
                    <magic-stone-welcome></magic-stone-welcome>
                </div>

                <div class="screen ${this.screen === Screen.DEVICE_MODE ? 'active' : ''}">
                    <device-mode-selector></device-mode-selector>
                </div>

                <div class="screen ${this.screen === Screen.TAP_TO_LISTEN ? 'active' : ''}">
                    ${this.renderTapToListen()}
                </div>

                <div class="screen ${this.screen === Screen.LOADING ? 'active' : ''}">
                    ${this.renderLoading()}
                </div>

                <div class="screen ${this.screen === Screen.ERROR ? 'active' : ''}">
                    ${this.renderError()}
                </div>
            </div>
        `;
    }
}

customElements.define('pebbble-player', PebbblePlayer);

export default PebbblePlayer;
