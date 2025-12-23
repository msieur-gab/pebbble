/**
 * NfcPrompt - NFC activation and scanning prompt (Lit component)
 * Shows the "Activate NFC" screen with scanning animation
 * Android-only: Web NFC is not supported on iOS
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { t } from '../services/I18nService.js';
import { nfc } from '../services/NFCService.js';

class NfcPrompt extends LitElement {
    static properties = {
        isScanning: { state: true },
        error: { state: true },
        buttonText: { state: true },
        isButtonDisabled: { state: true }
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
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
            width: 80px;
            height: 80px;
            z-index: 1;
        }

        .nfc-icon svg {
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 0 20px rgba(255, 77, 0, 0.5));
        }

        .nfc-icon.scanning svg {
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
            margin-top: 2rem;
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

        .not-supported {
            padding: 2rem;
            text-align: center;
        }

        .not-supported h2 {
            margin-bottom: 1rem;
        }

        .not-supported p {
            color: var(--color-text-secondary, #a0a0a0);
            line-height: 1.5;
            max-width: 280px;
        }
    `;

    constructor() {
        super();
        this.isScanning = false;
        this.error = null;
        this.buttonText = t('nfc.activate');
        this.isButtonDisabled = false;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.NFC_ACTIVATED, () => {
                this.isScanning = true;
                this.error = null;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_ERROR, (data) => {
                this.isScanning = false;
                this.error = data.message;
                this.buttonText = t('nfc.tryAgain');
                this.isButtonDisabled = false;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.buttonText = this.isScanning ? t('nfc.scanning') : t('nfc.activate');
                this.requestUpdate();
            })
        );
    }

    async activateNfc() {
        this.buttonText = t('nfc.starting');
        this.isButtonDisabled = true;
        this.error = null;

        try {
            await nfc.startReader();
        } catch (error) {
            // Error handling done via event bus
        }
    }

    renderNotSupported() {
        return html`
            <div class="not-supported">
                <div class="scan-container">
                    <span class="nfc-icon">📱</span>
                </div>
                <h2>${t('nfc.notSupported')}</h2>
                <p>${t('nfc.useAndroid')}</p>
            </div>
        `;
    }

    renderStoneIcon() {
        return html`
            <svg viewBox="0 0 192 192">
                <defs>
                    <radialGradient id="stoneGradNfc" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stop-color="#ff6a2a"/>
                        <stop offset="40%" stop-color="#FF4D00"/>
                        <stop offset="70%" stop-color="#cc3d00"/>
                        <stop offset="100%" stop-color="#802600"/>
                    </radialGradient>
                    <filter id="glowNfc">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <ellipse cx="96" cy="100" rx="58" ry="52" fill="url(#stoneGradNfc)" filter="url(#glowNfc)" transform="rotate(-8 96 100)"/>
                <ellipse cx="78" cy="82" rx="18" ry="12" fill="rgba(255,255,255,0.15)" transform="rotate(-20 78 82)"/>
            </svg>
        `;
    }

    renderScanning() {
        return html`
            <div class="scan-container">
                <div class="ring active"></div>
                <div class="ring active"></div>
                <div class="ring active"></div>
                <div class="nfc-icon scanning">${this.renderStoneIcon()}</div>
            </div>
            <h2>${t('nfc.scanning')}</h2>
            <p class="subtitle">${t('nfc.holdClose')}</p>
        `;
    }

    renderActivate() {
        return html`
            <div class="scan-container">
                <div class="ring"></div>
                <div class="ring"></div>
                <div class="ring"></div>
                <div class="nfc-icon">${this.renderStoneIcon()}</div>
            </div>
            <h2>${t('nfc.ready')}</h2>
            <p class="subtitle">${t('nfc.tapToActivate')}</p>
            <button
                @click=${this.activateNfc}
                ?disabled=${this.isButtonDisabled}>
                ${this.buttonText}
            </button>
            ${this.error ? html`
                <div class="error-message">${this.error}</div>
            ` : ''}
            <div class="hint">
                <div class="hint-title">${t('nfc.hint')}</div>
                <p class="hint-text">${t('nfc.hintText')}</p>
            </div>
        `;
    }

    render() {
        if (!nfc.isSupported()) {
            return this.renderNotSupported();
        }

        if (this.isScanning) {
            return this.renderScanning();
        }

        return this.renderActivate();
    }
}

customElements.define('nfc-prompt', NfcPrompt);

export default NfcPrompt;
