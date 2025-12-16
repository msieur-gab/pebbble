/**
 * NfcPrompt - NFC activation and scanning prompt
 * Simplified version without Shadow DOM for better compatibility
 */

import { eventBus, Events } from '../services/EventBus.js';
import { nfc } from '../services/NFCService.js';
import { t } from '../services/I18nService.js';

class NfcPrompt extends HTMLElement {
    constructor() {
        super();
        this.isScanning = false;
    }

    connectedCallback() {
        this.render();
    }

    async activateNfc() {
        console.log('🔘 Activate NFC button clicked');

        if (!nfc.isSupported()) {
            console.log('❌ NFC not supported');
            this.showError(t('nfc.notSupported'));
            return;
        }

        try {
            console.log('📡 Starting NFC reader...');
            await nfc.startReader();
            this.isScanning = true;
            this.render();
            console.log('✅ NFC reader started');
        } catch (error) {
            console.error('❌ NFC error:', error);
            this.showError(error.message);
        }
    }

    showError(message) {
        const errorEl = this.querySelector('#error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    render() {
        // Check if we have a playlistHash from URL (launched via NFC)
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const hasPlaylistHash = params.has('playlistHash');

        this.innerHTML = `
            <style>
                .nfc-prompt {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    padding: 1.5rem;
                    text-align: center;
                }

                .scan-container {
                    position: relative;
                    width: 160px;
                    height: 160px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.5rem;
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

                .nfc-prompt h2 {
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

                .nfc-btn {
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

                .nfc-btn:active {
                    transform: scale(0.95);
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
            </style>

            <div class="nfc-prompt">
                <div class="scan-container">
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <span class="nfc-icon ${this.isScanning ? 'scanning' : ''}">📡</span>
                </div>

                ${this.isScanning ? `
                    <h2>${hasPlaylistHash ? t('welcome.title') : t('nfc.scanning')}</h2>
                    <p class="subtitle">${hasPlaylistHash ? 'Hold your Pebbble close to unlock' : 'Hold your Pebbble close to your device'}</p>
                ` : `
                    <h2>${hasPlaylistHash ? t('welcome.title') : 'Ready to Listen'}</h2>
                    <p class="subtitle">${hasPlaylistHash ? 'Scan your Pebbble to unlock your messages' : 'Activate NFC to scan your magic stone'}</p>
                    <button class="nfc-btn" id="activate-btn">
                        <span>📡</span>
                        ${hasPlaylistHash ? 'Scan to Unlock' : t('nfc.activate')}
                    </button>
                `}

                <div class="error-message" id="error-message"></div>
            </div>

            ${!this.isScanning ? `
                <offline-library></offline-library>
            ` : ''}
        `;

        // Attach click handler directly after render
        const btn = this.querySelector('#activate-btn');
        if (btn) {
            btn.onclick = () => this.activateNfc();
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
}

customElements.define('nfc-prompt', NfcPrompt);

export default NfcPrompt;
