/**
 * SettingsPanel - Side drawer with app settings
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { i18n, t } from '../services/I18nService.js';

class SettingsPanel extends LitElement {
    static properties = {
        isOpen: { state: true },
        currentMode: { state: true },
        currentLang: { state: true }
    };

    static styles = css`
        :host {
            position: fixed;
            inset: 0;
            z-index: 1000;
            pointer-events: none;
        }

        :host([open]) {
            pointer-events: auto;
        }

        .backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        :host([open]) .backdrop {
            opacity: 1;
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
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        :host([open]) .panel {
            transform: translateX(0);
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
    `;

    constructor() {
        super();
        this.isOpen = false;
        this.currentMode = storage.getDeviceMode();
        this.currentLang = i18n.getLanguage();
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();

        this.unsubscribers.push(
            eventBus.on(Events.SETTINGS_OPEN, () => this.open())
        );

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.currentLang = i18n.getLanguage();
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    updated(changedProperties) {
        if (changedProperties.has('isOpen')) {
            if (this.isOpen) {
                this.setAttribute('open', '');
                document.body.style.overflow = 'hidden';
            } else {
                this.removeAttribute('open');
                document.body.style.overflow = '';
            }
        }
    }

    open() {
        this.isOpen = true;
        this.currentMode = storage.getDeviceMode();
    }

    close() {
        this.isOpen = false;
    }

    handleLanguageChange(langCode) {
        i18n.setLanguage(langCode);
    }

    async handleModeChange(mode) {
        await storage.setDeviceMode(mode);
        this.currentMode = mode;
        eventBus.emit(Events.SHOW_TOAST, {
            message: mode === 'personal' ? t('deviceMode.personal.label') : t('deviceMode.shared.label'),
            type: 'success',
            duration: 2000
        });
    }

    async handleClearData() {
        if (confirm(t('settings.clearConfirm'))) {
            await storage.clearAll();
            eventBus.emit(Events.SHOW_TOAST, {
                message: t('settings.dataCleared'),
                type: 'success'
            });
            setTimeout(() => window.location.reload(), 1000);
        }
    }

    getFlag(code) {
        const flags = { en: '🇬🇧', fr: '🇫🇷', zh: '🇨🇳', es: '🇪🇸' };
        return flags[code] || '🌐';
    }

    render() {
        const languages = i18n.getSupportedLanguages();

        return html`
            <div class="backdrop" @click=${this.close}></div>
            <div class="panel">
                <header class="panel-header">
                    <h2 class="panel-title">${t('settings.title')}</h2>
                    <button class="close-btn" @click=${this.close}>✕</button>
                </header>

                <div class="panel-content">
                    <!-- Language -->
                    <div class="setting-group">
                        <div class="setting-label">${t('settings.language')}</div>
                        <div class="setting-options">
                            ${languages.map(lang => html`
                                <button
                                    class="setting-option ${lang.code === this.currentLang ? 'active' : ''}"
                                    @click=${() => this.handleLanguageChange(lang.code)}>
                                    <span class="option-icon">${this.getFlag(lang.code)}</span>
                                    <span class="option-text">
                                        <span class="option-name">${lang.name}</span>
                                    </span>
                                    ${lang.code === this.currentLang ? html`<span class="check-mark">✓</span>` : ''}
                                </button>
                            `)}
                        </div>
                    </div>

                    <!-- Device Mode -->
                    <div class="setting-group">
                        <div class="setting-label">${t('settings.deviceMode')}</div>
                        <div class="setting-options">
                            <button
                                class="setting-option ${this.currentMode === 'personal' ? 'active' : ''}"
                                @click=${() => this.handleModeChange('personal')}>
                                <span class="option-icon">📱</span>
                                <span class="option-text">
                                    <span class="option-name">${t('deviceMode.personal.label')}</span>
                                    <span class="option-desc">${t('deviceMode.personal.description')}</span>
                                </span>
                                ${this.currentMode === 'personal' ? html`<span class="check-mark">✓</span>` : ''}
                            </button>
                            <button
                                class="setting-option ${this.currentMode === 'shared' ? 'active' : ''}"
                                @click=${() => this.handleModeChange('shared')}>
                                <span class="option-icon">👥</span>
                                <span class="option-text">
                                    <span class="option-name">${t('deviceMode.shared.label')}</span>
                                    <span class="option-desc">${t('deviceMode.shared.description')}</span>
                                </span>
                                ${this.currentMode === 'shared' ? html`<span class="check-mark">✓</span>` : ''}
                            </button>
                        </div>
                    </div>

                    <!-- Clear Data -->
                    <div class="setting-group">
                        <button class="danger-btn" @click=${this.handleClearData}>
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
    }
}

customElements.define('settings-panel', SettingsPanel);

export default SettingsPanel;
