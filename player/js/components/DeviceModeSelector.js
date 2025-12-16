/**
 * DeviceModeSelector - Personal vs Shared device selection
 * Determines whether to persist audio locally
 */

import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { t } from '../services/I18nService.js';

class DeviceModeSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const personalBtn = this.shadowRoot.getElementById('personal-btn');
        const sharedBtn = this.shadowRoot.getElementById('shared-btn');

        if (personalBtn) {
            personalBtn.addEventListener('click', () => this.selectMode('personal'));
        }

        if (sharedBtn) {
            sharedBtn.addEventListener('click', () => this.selectMode('shared'));
        }
    }

    async selectMode(mode) {
        await storage.setDeviceMode(mode);
        // Event is emitted by storage service
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    padding: 2rem;
                    animation: fadeIn 0.4s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .icon-container {
                    width: 80px;
                    height: 80px;
                    background: var(--color-accent-muted, rgba(255, 77, 0, 0.2));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }

                .icon {
                    font-size: 2.5rem;
                }

                h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--color-text-primary, #fff);
                    margin-bottom: 0.5rem;
                    text-align: center;
                }

                .subtitle {
                    font-size: 0.9rem;
                    color: var(--color-text-secondary, #a0a0a0);
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .options {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    width: 100%;
                    max-width: 320px;
                }

                .option {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1.25rem;
                    background: var(--color-bg-elevated, #242424);
                    border: 2px solid var(--color-surface, #333);
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }

                .option:hover {
                    border-color: var(--color-accent, #FF4D00);
                    background: var(--color-bg-card, #2a2a2a);
                }

                .option:active {
                    transform: scale(0.98);
                }

                .option-icon {
                    width: 48px;
                    height: 48px;
                    background: var(--color-surface, #333);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }

                .option:hover .option-icon {
                    background: var(--color-accent-muted, rgba(255, 77, 0, 0.2));
                }

                .option-content {
                    flex: 1;
                }

                .option-label {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--color-text-primary, #fff);
                    margin-bottom: 0.25rem;
                }

                .option-desc {
                    font-size: 0.85rem;
                    color: var(--color-text-muted, #666);
                    line-height: 1.4;
                }

                .security-note {
                    margin-top: 2rem;
                    padding: 1rem;
                    background: rgba(34, 197, 94, 0.1);
                    border-radius: 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    max-width: 320px;
                }

                .security-note-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                .security-note-text {
                    font-size: 0.8rem;
                    color: var(--color-success, #22c55e);
                    line-height: 1.4;
                }
            </style>

            <div class="icon-container">
                <span class="icon">🔒</span>
            </div>

            <h2>${t('deviceMode.title')}</h2>
            <p class="subtitle">${t('deviceMode.subtitle')}</p>

            <div class="options">
                <button class="option" id="personal-btn">
                    <div class="option-icon">📱</div>
                    <div class="option-content">
                        <div class="option-label">${t('deviceMode.personal.label')}</div>
                        <div class="option-desc">${t('deviceMode.personal.description')}</div>
                    </div>
                </button>

                <button class="option" id="shared-btn">
                    <div class="option-icon">👥</div>
                    <div class="option-content">
                        <div class="option-label">${t('deviceMode.shared.label')}</div>
                        <div class="option-desc">${t('deviceMode.shared.description')}</div>
                    </div>
                </button>
            </div>

            <div class="security-note">
                <span class="security-note-icon">🛡️</span>
                <span class="security-note-text">
                    Your messages are always encrypted. Only your magic stone can unlock them.
                </span>
            </div>
        `;

        this.setupEventListeners();
    }
}

customElements.define('device-mode-selector', DeviceModeSelector);

export default DeviceModeSelector;
