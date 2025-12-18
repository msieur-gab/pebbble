/**
 * LanguageSelector - Language switch dropdown
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { i18n, t } from '../services/I18nService.js';

class LanguageSelector extends LitElement {
    static properties = {
        isOpen: { state: true },
        currentLang: { state: true }
    };

    static styles = css`
        :host {
            display: inline-block;
            position: relative;
        }

        .trigger {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: var(--color-bg-elevated, #242424);
            border: 1px solid var(--color-surface, #333);
            border-radius: 8px;
            color: var(--color-text-secondary, #a0a0a0);
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .trigger:hover {
            background: var(--color-surface, #333);
            color: var(--color-text-primary, #fff);
        }

        .trigger-flag {
            font-size: 1rem;
        }

        .trigger-arrow {
            font-size: 0.6rem;
            transition: transform 0.2s ease;
        }

        .trigger-arrow.open {
            transform: rotate(180deg);
        }

        .dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 0.5rem;
            min-width: 140px;
            background: var(--color-bg-elevated, #242424);
            border: 1px solid var(--color-surface, #333);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            z-index: 100;
            animation: dropdownIn 0.2s ease-out;
        }

        @keyframes dropdownIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .lang-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            color: var(--color-text-secondary, #a0a0a0);
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
        }

        .lang-option:hover {
            background: var(--color-surface, #333);
            color: var(--color-text-primary, #fff);
        }

        .lang-option.active {
            color: var(--color-accent, #FF4D00);
            background: var(--color-accent-muted, rgba(255, 77, 0, 0.1));
        }

        .lang-flag {
            font-size: 1.1rem;
        }

        .lang-name {
            flex: 1;
        }

        .lang-check {
            font-size: 0.8rem;
            color: var(--color-accent, #FF4D00);
        }
    `;

    constructor() {
        super();
        this.isOpen = false;
        this.currentLang = 'en';
        this.unsubscribers = [];
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        this.currentLang = i18n.getLanguage();

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, (data) => {
                this.currentLang = data.language;
            })
        );

        document.addEventListener('click', this.handleDocumentClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        document.removeEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick(e) {
        if (!this.contains(e.target) && this.isOpen) {
            this.isOpen = false;
        }
    }

    toggleDropdown(e) {
        e.stopPropagation();
        this.isOpen = !this.isOpen;
    }

    async selectLanguage(lang) {
        await i18n.setLanguage(lang);
        this.isOpen = false;
    }

    getLanguageFlag(code) {
        const flags = {
            en: '🇬🇧',
            fr: '🇫🇷',
            zh: '🇨🇳',
            es: '🇪🇸'
        };
        return flags[code] || '🌐';
    }

    render() {
        const languages = i18n.getSupportedLanguages();

        return html`
            <button class="trigger" @click=${this.toggleDropdown}>
                <span class="trigger-flag">${this.getLanguageFlag(this.currentLang)}</span>
                <span class="trigger-arrow ${this.isOpen ? 'open' : ''}">▼</span>
            </button>

            ${this.isOpen ? html`
                <div class="dropdown">
                    ${languages.map(lang => html`
                        <button
                            class="lang-option ${lang.code === this.currentLang ? 'active' : ''}"
                            @click=${() => this.selectLanguage(lang.code)}>
                            <span class="lang-flag">${this.getLanguageFlag(lang.code)}</span>
                            <span class="lang-name">${lang.name}</span>
                            ${lang.code === this.currentLang ? html`<span class="lang-check">✓</span>` : ''}
                        </button>
                    `)}
                </div>
            ` : ''}
        `;
    }
}

customElements.define('language-selector', LanguageSelector);

export default LanguageSelector;
