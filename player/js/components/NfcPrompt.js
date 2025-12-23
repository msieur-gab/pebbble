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

        .stone {
            width: 100%;
            height: 100%;
            background: linear-gradient(
                135deg,
                #FF4D00 0%,
                #cc3d00 40%,
                #993000 70%,
                #662000 100%
            );
            border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
            box-shadow:
                inset -8px -8px 20px rgba(0, 0, 0, 0.4),
                inset 4px 4px 10px rgba(255, 255, 255, 0.15),
                0 10px 20px rgba(0, 0, 0, 0.4),
                0 0 30px rgba(255, 77, 0, 0.4);
            animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-6px) rotate(2deg); }
            75% { transform: translateY(-3px) rotate(-2deg); }
        }

        .nfc-icon.scanning .stone {
            animation: float 4s ease-in-out infinite, pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
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

    renderScanning() {
        return html`
            <div class="scan-container">
                <div class="ring active"></div>
                <div class="ring active"></div>
                <div class="ring active"></div>
                <div class="nfc-icon scanning"><div class="stone"></div></div>
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
                <div class="nfc-icon"><div class="stone"></div></div>
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
