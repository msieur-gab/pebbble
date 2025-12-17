/**
 * HomeScreen - Main home screen with welcome message and playlist library
 * Replaces NfcPrompt as the initial screen in the unified player
 */

import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { t } from '../services/I18nService.js';

class HomeScreen extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isFirstTimeUser = true;
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
        const settingsBtn = this.shadowRoot.getElementById('settings-btn');
        settingsBtn?.addEventListener('click', () => {
            eventBus.emit(Events.SETTINGS_OPEN);
        });

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
                    font-size: 1.25rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .settings-btn:hover {
                    background: var(--color-surface, #333);
                    border-color: var(--color-accent, #FF4D00);
                }

                .content {
                    flex: 1;
                }

                .first-time-hint {
                    text-align: center;
                    padding: 3rem 1.5rem;
                    background: var(--color-bg-elevated, #242424);
                    border-radius: 16px;
                    border: 2px dashed var(--color-surface, #333);
                }

                .hint-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    display: block;
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
                    <h1 class="welcome__title">
                        ${this.isFirstTimeUser ? t('home.welcome') : t('home.welcomeBack')}
                    </h1>
                    <p class="welcome__subtitle">
                        ${this.isFirstTimeUser ? t('home.tapToAdd') : t('home.library')}
                    </p>
                </div>
                <button class="settings-btn" id="settings-btn" aria-label="${t('home.settings')}">
                    ⚙️
                </button>
            </header>

            <section class="content">
                ${this.isFirstTimeUser ? `
                    <div class="first-time-hint">
                        <span class="hint-icon">🪨</span>
                        <h3 class="hint-title">${t('home.emptyLibrary')}</h3>
                        <p class="hint-text">${t('home.tapToAdd')}</p>
                    </div>
                ` : `
                    <offline-library></offline-library>
                `}
            </section>
        `;

        // Re-setup event listeners after render
        const settingsBtn = this.shadowRoot.getElementById('settings-btn');
        settingsBtn?.addEventListener('click', () => {
            eventBus.emit(Events.SETTINGS_OPEN);
        });
    }
}

customElements.define('home-screen', HomeScreen);

export default HomeScreen;
