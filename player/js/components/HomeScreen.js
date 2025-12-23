/**
 * HomeScreen - Main home screen with welcome message and playlist library
 * Shows contextual messages when a tag is detected
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { t } from '../services/I18nService.js';
import { audio } from '../services/AudioService.js';
import { nfc } from '../services/NFCService.js';
import { ICON_SETTINGS } from '../utils/icons.js';

class HomeScreen extends LitElement {
    static properties = {
        isFirstTimeUser: { state: true },
        pendingTag: { state: true },
        isNfcScanning: { state: true },
        nfcSupported: { state: true }
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 0 0 1rem 0;
            flex-shrink: 0;
        }

        .welcome {
            display: flex;
            flex-direction: column;
        }

        .welcome__title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-primary, #fff);
            margin-bottom: 0.25rem;
        }

        .welcome__subtitle {
            font-size: 0.9rem;
            color: var(--color-text-muted, #888);
        }

        .settings-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--color-bg-elevated, #242424);
            border: 1px solid var(--color-surface, #333);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
            color: var(--color-text-muted, #888);
        }

        .settings-btn svg {
            width: 22px;
            height: 22px;
        }

        .settings-btn:hover {
            background: var(--color-surface, #333);
            border-color: var(--color-accent, #FF4D00);
        }

        .content {
            flex: 1;
        }

        .pending-tag {
            background: var(--color-bg-elevated, #242424);
            border-radius: 16px;
            border: 2px solid var(--color-accent, #FF4D00);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            text-align: center;
            animation: pulse-border 2s ease-in-out infinite;
        }

        @keyframes pulse-border {
            0%, 100% { border-color: var(--color-accent, #FF4D00); }
            50% { border-color: rgba(255, 77, 0, 0.5); }
        }

        .pending-tag__stone {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.4);
            animation: stone-glow 2s ease-in-out infinite;
        }

        @keyframes stone-glow {
            0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(255, 77, 0, 0.4); }
            50% { box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 30px rgba(255, 77, 0, 0.6); }
        }

        .pending-tag__title {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
            margin-bottom: 1rem;
        }

        .pending-tag__btn {
            padding: 0.875rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            background: var(--color-accent, #FF4D00);
            color: #fff;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.1s, background 0.2s;
        }

        .pending-tag__btn:active {
            transform: scale(0.98);
        }

        .first-time-hint {
            text-align: center;
            padding: 3rem 1.5rem;
            background: var(--color-bg-elevated, #242424);
            border-radius: 16px;
            border: 2px dashed var(--color-surface, #333);
        }

        .hint-stone {
            width: 60px;
            height: 60px;
            margin: 0 auto 1rem;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 15px rgba(255, 77, 0, 0.3);
            opacity: 0.6;
        }

        .hint-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
            margin-bottom: 0.5rem;
        }

        .hint-text {
            font-size: 0.9rem;
            color: var(--color-text-muted, #888);
            max-width: 280px;
            margin: 0 auto;
            line-height: 1.5;
        }

        .library-section {
            margin-top: 1rem;
            padding-bottom: 80px; /* Space for FAB */
        }

        /* NFC FAB (Floating Action Button) */
        .nfc-fab {
            position: fixed;
            bottom: 100px; /* Above the mini player */
            right: 1.5rem;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--color-accent, #FF4D00);
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 77, 0, 0.4);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        .nfc-fab:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(255, 77, 0, 0.5);
        }

        .nfc-fab:active:not(:disabled) {
            transform: scale(0.95);
        }

        .nfc-fab:disabled {
            background: var(--color-surface, #333);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            cursor: not-allowed;
        }

        .nfc-fab.scanning {
            animation: fab-pulse 1.5s ease-in-out infinite;
        }

        @keyframes fab-pulse {
            0%, 100% {
                box-shadow: 0 4px 12px rgba(255, 77, 0, 0.4);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 4px 20px rgba(255, 77, 0, 0.6), 0 0 0 8px rgba(255, 77, 0, 0.1);
                transform: scale(1.05);
            }
        }

        .nfc-fab .fab-stone {
            width: 28px;
            height: 28px;
            background: linear-gradient(
                135deg,
                #fff 0%,
                #f0f0f0 40%,
                #ddd 70%,
                #ccc 100%
            );
            border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
            box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.2),
                        inset 1px 1px 2px rgba(255, 255, 255, 0.8);
        }

        .nfc-fab.scanning .fab-stone {
            animation: fab-stone-pulse 1.5s ease-in-out infinite;
        }

        @keyframes fab-stone-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.9); opacity: 0.8; }
        }

        /* First time user button (larger, centered) */
        .first-time-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            margin-top: 1.5rem;
            background: var(--color-accent, #FF4D00);
            border: none;
            border-radius: 50px;
            color: #fff;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255, 77, 0, 0.3);
            transition: all 0.2s ease;
        }

        .first-time-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 77, 0, 0.4);
        }

        .first-time-btn:disabled {
            background: var(--color-surface, #333);
            box-shadow: none;
            cursor: not-allowed;
        }

        .first-time-btn.scanning {
            animation: pulse-border 2s ease-in-out infinite;
        }

        .first-time-btn .btn-stone {
            width: 20px;
            height: 20px;
            background: linear-gradient(
                135deg,
                #fff 0%,
                #f0f0f0 40%,
                #ddd 70%,
                #ccc 100%
            );
            border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
            box-shadow: inset -1px -1px 2px rgba(0, 0, 0, 0.2),
                        inset 1px 1px 1px rgba(255, 255, 255, 0.8);
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
        }
    `;

    constructor() {
        super();
        this.isFirstTimeUser = true;
        this.pendingTag = null;
        this.isNfcScanning = false;
        this.nfcSupported = nfc.isSupported();
        this.unsubscribers = [];
    }

    async connectedCallback() {
        super.connectedCallback();
        this.setupEventListeners();
        await this.checkUserStatus();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    async checkUserStatus() {
        const playlists = await storage.getAllPlaylists();
        this.isFirstTimeUser = playlists.length === 0;
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.requestUpdate();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.STORAGE_READY, async () => {
                await this.checkUserStatus();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TAG_DETECTED, (data) => {
                this.pendingTag = data;
                this.isNfcScanning = false;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYLIST_LOADED, () => {
                this.pendingTag = null;
                this.isNfcScanning = false;
            })
        );

        // NFC events
        this.unsubscribers.push(
            eventBus.on(Events.NFC_ACTIVATED, () => {
                this.isNfcScanning = true;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_TAG_READ, () => {
                this.isNfcScanning = false;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_ERROR, () => {
                this.isNfcScanning = false;
            })
        );
    }

    openSettings() {
        eventBus.emit(Events.SETTINGS_OPEN);
    }

    async startNfcScan() {
        if (this.isNfcScanning) return;

        try {
            await nfc.startReader();
        } catch (error) {
            // Error handled via event bus
        }
    }

    async handleTagAction() {
        if (this.pendingTag) {
            await audio.unlock();
            eventBus.emit(Events.OFFLINE_PLAYLIST_SELECT, {
                playlistHash: this.pendingTag.playlistHash,
                serial: this.pendingTag.serial
            });
        }
    }

    getWelcomeMessage() {
        if (this.pendingTag) {
            return this.pendingTag.isNew
                ? t('home.newTagDetected')
                : t('home.tagDetected');
        }
        return this.isFirstTimeUser
            ? t('home.welcome')
            : t('home.welcomeBack');
    }

    getSubtitleMessage() {
        if (this.pendingTag) {
            return this.pendingTag.isNew
                ? t('home.addToCollection')
                : t('home.playNow');
        }
        return this.isFirstTimeUser
            ? t('home.tapToAdd')
            : t('home.library');
    }

    renderPendingTag() {
        if (!this.pendingTag) return '';

        return html`
            <div class="pending-tag">
                <div class="pending-tag__stone"></div>
                <h3 class="pending-tag__title">
                    ${this.pendingTag.isNew ? t('home.newTagDetected') : t('home.tagDetected')}
                </h3>
                <button class="pending-tag__btn" @click=${this.handleTagAction}>
                    ${this.pendingTag.isNew ? t('home.addToCollection') : t('home.playNow')}
                </button>
            </div>
        `;
    }

    renderNfcFab() {
        if (!this.nfcSupported) return '';

        return html`
            <button
                class="nfc-fab ${this.isNfcScanning ? 'scanning' : ''}"
                @click=${this.startNfcScan}
                ?disabled=${this.isNfcScanning}
                aria-label="${this.isNfcScanning ? t('nfc.scanning') : t('nfc.activate')}">
                <div class="fab-stone"></div>
            </button>
        `;
    }

    renderContent() {
        if (this.pendingTag) {
            return this.renderPendingTag();
        }

        if (this.isFirstTimeUser) {
            return html`
                <div class="first-time-hint">
                    <div class="hint-stone"></div>
                    <h3 class="hint-title">${t('home.emptyLibrary')}</h3>
                    <p class="hint-text">${t('home.tapToAdd')}</p>
                    ${this.nfcSupported ? html`
                        <button
                            class="first-time-btn ${this.isNfcScanning ? 'scanning' : ''}"
                            @click=${this.startNfcScan}
                            ?disabled=${this.isNfcScanning}>
                            <div class="btn-stone"></div>
                            ${this.isNfcScanning ? t('nfc.scanning') : t('nfc.activate')}
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return html`
            <div class="library-section">
                <offline-library></offline-library>
            </div>
        `;
    }

    render() {
        return html`
            <header class="header">
                <div class="welcome">
                    <h1 class="welcome__title">${this.getWelcomeMessage()}</h1>
                    <p class="welcome__subtitle">${this.getSubtitleMessage()}</p>
                </div>
                <button
                    class="settings-btn"
                    aria-label="${t('home.settings')}"
                    @click=${this.openSettings}>
                    ${unsafeHTML(ICON_SETTINGS)}
                </button>
            </header>

            <section class="content">
                ${this.renderContent()}
            </section>

            ${!this.isFirstTimeUser ? this.renderNfcFab() : ''}
        `;
    }
}

customElements.define('home-screen', HomeScreen);

export default HomeScreen;
