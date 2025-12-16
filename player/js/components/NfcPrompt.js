/**
 * NfcPrompt - NFC activation and scanning prompt
 * Shows the initial "Activate NFC" screen with scanning animation
 */

import { eventBus, Events } from '../services/EventBus.js';
import { nfc } from '../services/NFCService.js';
import { t } from '../services/I18nService.js';

class NfcPrompt extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isScanning = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const activateBtn = this.shadowRoot.getElementById('activate-btn');
        if (activateBtn) {
            activateBtn.addEventListener('click', () => this.activateNfc());
        }

        // Listen for NFC events
        eventBus.on(Events.NFC_ACTIVATED, () => {
            this.isScanning = true;
            this.render();
        });

        eventBus.on(Events.NFC_ERROR, (data) => {
            this.isScanning = false;
            this.showError(data.message);
        });
    }

    async activateNfc() {
        // Check if NFC is supported
        if (!nfc.isSupported()) {
            this.showError(t('nfc.notSupported'));
            return;
        }

        try {
            await nfc.startReader();
            this.isScanning = true;
            this.render();
        } catch (error) {
            this.showError(error.message);
        }
    }

    showError(message) {
        const errorEl = this.shadowRoot.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    padding: 1.5rem;
                    text-align: center;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .scan-container {
                    position: relative;
                    width: 160px;
                    height: 160px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                    flex-shrink: 0;
                }

                .ring {
                    position: absolute;
                    border: 2px solid var(--color-accent, #FF4D00);
                    border-radius: 50%;
                    opacity: 0;
                }

                .ring.active {
                    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .ring:nth-child(1) { inset: 0; }
                .ring:nth-child(2) { inset: 20px; animation-delay: 0.5s; }
                .ring:nth-child(3) { inset: 40px; animation-delay: 1s; }

                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.6; }
                    100% { transform: scale(1.3); opacity: 0; }
                }

                .nfc-icon {
                    font-size: 4rem;
                    z-index: 1;
                }

                .nfc-icon.scanning {
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.95); }
                }

                h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-primary, #fff);
                    margin-bottom: 0.5rem;
                }

                .subtitle {
                    font-size: 0.9rem;
                    color: var(--color-text-secondary, #a0a0a0);
                    margin-bottom: 2rem;
                    max-width: 280px;
                }

                button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1rem 2rem;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #fff;
                    background: var(--color-accent, #FF4D00);
                    border: none;
                    border-radius: 50px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(255, 77, 0, 0.3);
                    transition: all 0.3s ease;
                }

                button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 77, 0, 0.4);
                }

                button:disabled {
                    background: var(--color-surface, #333);
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .error-message {
                    display: none;
                    margin-top: 1.5rem;
                    padding: 0.75rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px;
                    color: var(--color-error, #ef4444);
                    font-size: 0.85rem;
                    max-width: 280px;
                }

                .hint {
                    margin-top: 3rem;
                    padding: 1rem;
                    background: var(--color-bg-elevated, #242424);
                    border-radius: 12px;
                    max-width: 280px;
                }

                .hint-title {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-text-muted, #666);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }

                .hint-text {
                    font-size: 0.85rem;
                    color: var(--color-text-secondary, #a0a0a0);
                    line-height: 1.4;
                }

                .main-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex-shrink: 0;
                }

                .scroll-content {
                    width: 100%;
                    max-width: 320px;
                }
            </style>

            <div class="main-content">
                <div class="scan-container">
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <span class="nfc-icon ${this.isScanning ? 'scanning' : ''}">📡</span>
                </div>

                ${this.isScanning ? `
                    <h2>${t('nfc.scanning')}</h2>
                    <p class="subtitle">Hold your Pebbble close to your device</p>
                ` : `
                    <h2>Ready to Listen</h2>
                    <p class="subtitle">Activate NFC to scan your magic stone</p>
                    <button id="activate-btn">
                        <span>📡</span>
                        ${t('nfc.activate')}
                    </button>
                `}

                <div class="error-message" id="error-message"></div>
            </div>

            ${!this.isScanning ? `
                <div class="scroll-content">
                    <offline-library></offline-library>
                </div>
            ` : ''}
        `;

        this.setupEventListeners();
    }
}

customElements.define('nfc-prompt', NfcPrompt);

export default NfcPrompt;
