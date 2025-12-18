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
import { ICON_SETTINGS } from '../utils/icons.js';

class HomeScreen extends LitElement {
    static properties = {
        isFirstTimeUser: { state: true },
        pendingTag: { state: true }
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
        }
    `;

    constructor() {
        super();
        this.isFirstTimeUser = true;
        this.pendingTag = null;
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
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYLIST_LOADED, () => {
                this.pendingTag = null;
            })
        );
    }

    openSettings() {
        eventBus.emit(Events.SETTINGS_OPEN);
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
        `;
    }
}

customElements.define('home-screen', HomeScreen);

export default HomeScreen;
