/**
 * SettingsPanel - Side drawer with app settings
 */

import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { i18n, t } from '../services/I18nService.js';

class SettingsPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.justOpened = false;
        this.unsubscribers = [];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.SETTINGS_OPEN, () => this.open())
        );

        this.unsubscribers.push(
            eventBus.on(Events.SETTINGS_CLOSE, () => this.close())
        );

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                if (this.isOpen) this.render();
            })
        );
    }

    open() {
        this.isOpen = true;
        this.justOpened = true;
        this.render();
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.render();
        document.body.style.overflow = '';
    }

    handleLanguageChange(langCode) {
        i18n.setLanguage(langCode);
    }

    async handleModeChange(mode) {
        await storage.setDeviceMode(mode);
        this.render();
        eventBus.emit(Events.SHOW_TOAST, {
            message: mode === 'personal' ? t('deviceMode.personal.label') : t('deviceMode.shared.label'),
            type: 'success',
            duration: 2000
        });
    }

    async handleClearData() {
        if (confirm(t('settings.clearConfirm'))) {
            await storage.clearAll();
            this.render();
            eventBus.emit(Events.SHOW_TOAST, {
                message: t('settings.dataCleared'),
                type: 'success'
            });
            // Reload to reset state
            setTimeout(() => window.location.reload(), 1000);
        }
    }

    getFlag(code) {
        const flags = { en: '🇬🇧', fr: '🇫🇷', zh: '🇨🇳', es: '🇪🇸' };
        return flags[code] || '🌐';
    }

    render() {
        const currentMode = storage.getDeviceMode();
        const currentLang = i18n.getLanguage();
        const languages = i18n.getSupportedLanguages();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: ${this.isOpen ? 'block' : 'none'};
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                }

                .backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                }

                .panel {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    width: min(320px, 85vw);
                    background: var(--color-bg, #1a1a1a);
                    border-left: 1px solid var(--color-surface, #333);
                    display: flex;
                    flex-direction: column;
                    ${this.justOpened ? 'animation: slideIn 0.3s ease-out;' : ''}
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                .panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    border-bottom: 1px solid var(--color-surface, #333);
                    flex-shrink: 0;
                }

                .panel-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-primary, #fff);
                }

                .close-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--color-bg-elevated, #242424);
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    transition: background 0.2s;
                    color: var(--color-text-primary, #fff);
                }

                .close-btn:hover {
                    background: var(--color-surface, #333);
                }

                .panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    -webkit-overflow-scrolling: touch;
                }

                .setting-group {
                    margin-bottom: 1.5rem;
                }

                .setting-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted, #888);
                    margin-bottom: 0.75rem;
                }

                .setting-options {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .setting-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: var(--color-bg-elevated, #242424);
                    border: 2px solid transparent;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                    width: 100%;
                }

                .setting-option:hover {
                    background: var(--color-surface, #333);
                }

                .setting-option.active {
                    border-color: var(--color-accent, #FF4D00);
                    background: rgba(255, 77, 0, 0.1);
                }

                .option-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                .option-text {
                    flex: 1;
                    min-width: 0;
                }

                .option-name {
                    font-weight: 500;
                    color: var(--color-text-primary, #fff);
                    font-size: 0.95rem;
                }

                .option-desc {
                    font-size: 0.8rem;
                    color: var(--color-text-muted, #888);
                    margin-top: 0.1rem;
                }

                .check-mark {
                    color: var(--color-accent, #FF4D00);
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .danger-btn {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    color: #ef4444;
                    font-weight: 500;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .danger-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                }

                .panel-footer {
                    padding: 1rem;
                    border-top: 1px solid var(--color-surface, #333);
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--color-text-muted, #888);
                    flex-shrink: 0;
                }
            </style>

            <div class="backdrop" id="backdrop"></div>
            <div class="panel">
                <header class="panel-header">
                    <h2 class="panel-title">${t('settings.title')}</h2>
                    <button class="close-btn" id="close-btn">✕</button>
                </header>

                <div class="panel-content">
                    <!-- Language -->
                    <div class="setting-group">
                        <div class="setting-label">${t('settings.language')}</div>
                        <div class="setting-options">
                            ${languages.map(lang => `
                                <button class="setting-option ${lang.code === currentLang ? 'active' : ''}"
                                        data-lang="${lang.code}">
                                    <span class="option-icon">${this.getFlag(lang.code)}</span>
                                    <span class="option-text">
                                        <span class="option-name">${lang.name}</span>
                                    </span>
                                    ${lang.code === currentLang ? '<span class="check-mark">✓</span>' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Device Mode -->
                    <div class="setting-group">
                        <div class="setting-label">${t('settings.deviceMode')}</div>
                        <div class="setting-options">
                            <button class="setting-option ${currentMode === 'personal' ? 'active' : ''}"
                                    data-mode="personal">
                                <span class="option-icon">📱</span>
                                <span class="option-text">
                                    <span class="option-name">${t('deviceMode.personal.label')}</span>
                                    <span class="option-desc">${t('deviceMode.personal.description')}</span>
                                </span>
                                ${currentMode === 'personal' ? '<span class="check-mark">✓</span>' : ''}
                            </button>
                            <button class="setting-option ${currentMode === 'shared' ? 'active' : ''}"
                                    data-mode="shared">
                                <span class="option-icon">👥</span>
                                <span class="option-text">
                                    <span class="option-name">${t('deviceMode.shared.label')}</span>
                                    <span class="option-desc">${t('deviceMode.shared.description')}</span>
                                </span>
                                ${currentMode === 'shared' ? '<span class="check-mark">✓</span>' : ''}
                            </button>
                        </div>
                    </div>

                    <!-- Clear Data -->
                    <div class="setting-group">
                        <button class="danger-btn" id="clear-btn">
                            <span>🗑️</span>
                            <span>${t('settings.clearData')}</span>
                        </button>
                    </div>
                </div>

                <footer class="panel-footer">
                    Pebbble Player v1.0
                </footer>
            </div>
        `;

        // Event listeners
        this.shadowRoot.getElementById('backdrop')?.addEventListener('click', () => this.close());
        this.shadowRoot.getElementById('close-btn')?.addEventListener('click', () => this.close());
        this.shadowRoot.getElementById('clear-btn')?.addEventListener('click', () => this.handleClearData());

        this.shadowRoot.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', () => this.handleLanguageChange(btn.dataset.lang));
        });

        this.shadowRoot.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.handleModeChange(btn.dataset.mode));
        });

        // Reset animation flag after render
        this.justOpened = false;
    }
}

customElements.define('settings-panel', SettingsPanel);

export default SettingsPanel;
