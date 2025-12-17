/**
 * HomeScreen - Main home screen with welcome message and playlist library
 * Shows contextual messages when a tag is detected
 */

import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { t } from '../services/I18nService.js';

class HomeScreen extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isFirstTimeUser = true;
        this.pendingTag = null;
        this.unsubscribers = [];
    }

    async connectedCallback() {
        await this.checkUserStatus();
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    async checkUserStatus() {
        const playlists = await storage.getAllPlaylists();
        this.isFirstTimeUser = playlists.length === 0;
    }

    setupEventListeners() {
        // Settings button
        this.attachSettingsListener();

        // Language change - re-render
        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => this.render())
        );

        // Storage ready - recheck status
        this.unsubscribers.push(
            eventBus.on(Events.STORAGE_READY, async () => {
                await this.checkUserStatus();
                this.render();
            })
        );

        // Tag detected - show contextual message
        this.unsubscribers.push(
            eventBus.on(Events.TAG_DETECTED, (data) => {
                this.pendingTag = data;
                this.render();
            })
        );

        // Playlist loaded - clear pending tag
        this.unsubscribers.push(
            eventBus.on(Events.PLAYLIST_LOADED, () => {
                this.pendingTag = null;
            })
        );
    }

    attachSettingsListener() {
        const settingsBtn = this.shadowRoot.getElementById('settings-btn');
        settingsBtn?.addEventListener('click', () => {
            eventBus.emit(Events.SETTINGS_OPEN);
        });
    }

    attachActionListeners() {
        const addBtn = this.shadowRoot.getElementById('add-tag-btn');
        const playBtn = this.shadowRoot.getElementById('play-tag-btn');

        addBtn?.addEventListener('click', () => this.handleAddTag());
        playBtn?.addEventListener('click', () => this.handlePlayTag());
    }

    handleAddTag() {
        if (this.pendingTag) {
            eventBus.emit(Events.OFFLINE_PLAYLIST_SELECT, {
                playlistHash: this.pendingTag.playlistHash,
                serial: this.pendingTag.serial
            });
        }
    }

    handlePlayTag() {
        if (this.pendingTag) {
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

    render() {
        this.shadowRoot.innerHTML = `
            <style>
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

                /* Pending tag card */
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

                /* First time hint */
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

                .library-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted, #888);
                }
            </style>

            <header class="header">
                <div class="welcome">
                    <h1 class="welcome__title">${this.getWelcomeMessage()}</h1>
                    <p class="welcome__subtitle">${this.getSubtitleMessage()}</p>
                </div>
                <button class="settings-btn" id="settings-btn" aria-label="${t('home.settings')}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                </button>
            </header>

            <section class="content">
                ${this.pendingTag ? `
                    <div class="pending-tag">
                        <div class="pending-tag__stone"></div>
                        <h3 class="pending-tag__title">
                            ${this.pendingTag.isNew ? t('home.newTagDetected') : t('home.tagDetected')}
                        </h3>
                        <button class="pending-tag__btn" id="${this.pendingTag.isNew ? 'add-tag-btn' : 'play-tag-btn'}">
                            ${this.pendingTag.isNew ? t('home.addToCollection') : t('home.playNow')}
                        </button>
                    </div>
                ` : ''}

                ${this.isFirstTimeUser && !this.pendingTag ? `
                    <div class="first-time-hint">
                        <div class="hint-stone"></div>
                        <h3 class="hint-title">${t('home.emptyLibrary')}</h3>
                        <p class="hint-text">${t('home.tapToAdd')}</p>
                    </div>
                ` : !this.isFirstTimeUser ? `
                    <div class="library-section">
                        <offline-library></offline-library>
                    </div>
                ` : ''}
            </section>
        `;

        // Attach event listeners
        this.attachSettingsListener();
        this.attachActionListeners();
    }
}

customElements.define('home-screen', HomeScreen);

export default HomeScreen;
