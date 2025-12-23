/**
 * OnboardingFlow - First-time user onboarding with swipeable screens
 * 4 screens: Welcome, Privacy, Device Mode, Decrypt
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { i18n, t } from '../services/I18nService.js';
import { nfc } from '../services/NFCService.js';
import { audio } from '../services/AudioService.js';

class OnboardingFlow extends LitElement {
    static properties = {
        currentScreen: { state: true },
        isPersonalDevice: { state: true },
        selectedLanguage: { state: true },
        isScanning: { state: true },
        touchStartX: { state: true }
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            background: var(--color-bg, #1a1a1a);
        }

        .screens-container {
            display: flex;
            flex: 1;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .screen {
            min-width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
            box-sizing: border-box;
        }

        /* Stone icon - CSS styled like MagicStoneWelcome */
        .stone-container {
            position: relative;
            width: 120px;
            height: 120px;
            margin-bottom: 2rem;
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
                inset -10px -10px 30px rgba(0, 0, 0, 0.4),
                inset 5px 5px 15px rgba(255, 255, 255, 0.15),
                0 15px 30px rgba(0, 0, 0, 0.4),
                0 0 40px rgba(255, 77, 0, 0.4);
            animation: float 4s ease-in-out infinite, glow 3s ease-in-out infinite;
        }

        .stone.small {
            width: 80px;
            height: 80px;
        }

        .stone.mini {
            width: 24px;
            height: 24px;
            box-shadow:
                inset -3px -3px 8px rgba(0, 0, 0, 0.4),
                inset 2px 2px 4px rgba(255, 255, 255, 0.15),
                0 4px 8px rgba(0, 0, 0, 0.3),
                0 0 12px rgba(255, 77, 0, 0.4);
            animation: none;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-8px) rotate(2deg); }
            75% { transform: translateY(-4px) rotate(-2deg); }
        }

        @keyframes glow {
            0%, 100% {
                box-shadow:
                    inset -10px -10px 30px rgba(0, 0, 0, 0.4),
                    inset 5px 5px 15px rgba(255, 255, 255, 0.15),
                    0 15px 30px rgba(0, 0, 0, 0.4),
                    0 0 40px rgba(255, 77, 0, 0.4);
            }
            50% {
                box-shadow:
                    inset -10px -10px 30px rgba(0, 0, 0, 0.4),
                    inset 5px 5px 15px rgba(255, 255, 255, 0.15),
                    0 15px 30px rgba(0, 0, 0, 0.4),
                    0 0 60px rgba(255, 77, 0, 0.6);
            }
        }

        /* Typography */
        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-primary, #fff);
            margin: 0 0 1rem 0;
            background: linear-gradient(135deg, #FF4D00, #FFD700);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.3;
        }

        p {
            font-size: 1rem;
            color: var(--color-text-secondary, #a0a0a0);
            margin: 0 0 2rem 0;
            max-width: 300px;
            line-height: 1.6;
        }

        /* Language selector */
        .language-selector {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            justify-content: center;
        }

        .lang-btn {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--color-text-secondary, #a0a0a0);
            background: var(--color-surface, #333);
            border: 2px solid transparent;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .lang-btn:hover {
            background: var(--color-bg-elevated, #3a3a3a);
        }

        .lang-btn.active {
            color: var(--color-accent, #FF4D00);
            border-color: var(--color-accent, #FF4D00);
            background: var(--color-accent-muted, rgba(255, 77, 0, 0.1));
        }

        /* Privacy warning box */
        .warning-box {
            padding: 1rem 1.25rem;
            background: rgba(255, 77, 0, 0.1);
            border: 1px solid rgba(255, 77, 0, 0.3);
            border-radius: 12px;
            max-width: 300px;
            margin-bottom: 2rem;
        }

        .warning-box .icon {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .warning-box .icon svg {
            width: 20px;
            height: 20px;
        }

        .warning-box .label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--color-accent, #FF4D00);
        }

        .warning-box .text {
            font-size: 0.85rem;
            color: var(--color-text-secondary, #a0a0a0);
            line-height: 1.5;
            margin: 0;
        }

        /* Device mode toggle */
        .toggle-container {
            margin-bottom: 1.5rem;
        }

        .toggle-label {
            font-size: 0.9rem;
            color: var(--color-text-secondary, #a0a0a0);
            margin-bottom: 0.75rem;
        }

        .toggle-group {
            position: relative;
            display: flex;
            background: var(--color-surface, #333);
            border-radius: 25px;
            padding: 4px;
        }

        .toggle-slider {
            position: absolute;
            top: 4px;
            left: 4px;
            width: calc(50% - 4px);
            height: calc(100% - 8px);
            background: var(--color-accent, #FF4D00);
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(255, 77, 0, 0.4);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toggle-slider.right {
            transform: translateX(100%);
        }

        .toggle-btn {
            position: relative;
            z-index: 1;
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--color-text-secondary, #a0a0a0);
            background: transparent;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            transition: color 0.3s ease;
            min-width: 80px;
            flex: 1;
        }

        .toggle-btn.active {
            color: #fff;
        }

        .dynamic-text {
            font-size: 0.9rem;
            color: var(--color-text-secondary, #a0a0a0);
            max-width: 280px;
            line-height: 1.5;
            min-height: 3em;
            transition: opacity 0.3s ease;
        }

        /* NFC scanning */
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

        .scan-stone {
            width: 80px;
            height: 80px;
            z-index: 1;
        }

        .scan-stone .stone {
            width: 100%;
            height: 100%;
        }

        .scan-stone.scanning .stone {
            animation: float 4s ease-in-out infinite, pulse-stone 2s ease-in-out infinite;
        }

        @keyframes pulse-stone {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
        }

        /* Buttons */
        button.primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            color: #fff;
            background: linear-gradient(135deg, #FF4D00, #cc3d00);
            border: none;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255, 77, 0, 0.4);
            transition: all 0.3s ease;
        }

        button.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 77, 0, 0.5);
        }

        button.primary:disabled {
            background: var(--color-surface, #333);
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        .arrow {
            transition: transform 0.3s ease;
        }

        button.primary:hover .arrow {
            transform: translateX(4px);
        }

        /* Dot indicators */
        .dots {
            display: flex;
            justify-content: center;
            width: 100%;
            gap: 0.5rem;
            padding: 1.5rem 0;
        }

        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-surface, #333);
            transition: all 0.3s ease;
        }

        .dot.active {
            background: var(--color-accent, #FF4D00);
            transform: scale(1.2);
        }

        /* Privacy features list */
        .features {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-width: 280px;
            margin-bottom: 1.5rem;
        }

        .feature {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.9rem;
            color: var(--color-text-secondary, #a0a0a0);
        }

        .feature-icon {
            width: 32px;
            height: 32px;
            background: var(--color-surface, #333);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .feature-icon svg {
            width: 18px;
            height: 18px;
            fill: var(--color-accent, #FF4D00);
        }
    `;

    constructor() {
        super();
        this.currentScreen = 0;
        this.isPersonalDevice = false;
        this.selectedLanguage = i18n.getLanguage();
        this.isScanning = false;
        this.touchStartX = 0;
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
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_TAG_READ, async () => {
                await audio.unlock();
                this.completeOnboarding();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.NFC_ERROR, () => {
                this.isScanning = false;
            })
        );
    }

    async selectLanguage(lang) {
        this.selectedLanguage = lang;
        await i18n.setLanguage(lang);
        this.requestUpdate();
    }

    nextScreen() {
        if (this.currentScreen < 3) {
            this.currentScreen++;
        }
    }

    prevScreen() {
        if (this.currentScreen > 0) {
            this.currentScreen--;
        }
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = this.touchStartX - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0 && this.currentScreen < 3) {
                this.nextScreen();
            } else if (diff < 0 && this.currentScreen > 0) {
                this.prevScreen();
            }
        }
    }

    toggleDeviceMode(isPersonal) {
        this.isPersonalDevice = isPersonal;
    }

    async activateNfc() {
        try {
            await storage.setDeviceMode(this.isPersonalDevice ? 'personal' : 'shared');
            await nfc.startReader();
        } catch (error) {
            // Error handling via event bus
        }
    }

    completeOnboarding() {
        localStorage.setItem('pebbble-onboarded', 'true');
        eventBus.emit(Events.ONBOARDING_COMPLETE);
    }

    renderStone(sizeClass = '') {
        return html`<div class="stone ${sizeClass}"></div>`;
    }

    renderScreen1() {
        const languages = [
            { code: 'en', label: 'English' },
            { code: 'fr', label: 'Français' },
            { code: 'es', label: 'Español' },
            { code: 'zh', label: '中文' }
        ];

        return html`
            <div class="screen">
                <div class="language-selector">
                    ${languages.map(lang => html`
                        <button
                            class="lang-btn ${this.selectedLanguage === lang.code ? 'active' : ''}"
                            @click=${() => this.selectLanguage(lang.code)}>
                            ${lang.label}
                        </button>
                    `)}
                </div>

                <div class="stone-container">
                    ${this.renderStone()}
                </div>

                <h1>${t('onboarding.welcome.title')}</h1>
                <p>${t('onboarding.welcome.text')}</p>

                <button class="primary" @click=${this.nextScreen}>
                    ${t('onboarding.discover')}
                    <span class="arrow">→</span>
                </button>
            </div>
        `;
    }

    renderScreen2() {
        return html`
            <div class="screen">
                <h1>${t('onboarding.privacy.title')}</h1>

                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                        </div>
                        <span>${t('onboarding.privacy.noServers')}</span>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        </div>
                        <span>${t('onboarding.privacy.noTracking')}</span>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        </div>
                        <span>${t('onboarding.privacy.encrypted')}</span>
                    </div>
                </div>

                <div class="warning-box">
                    <div class="icon">
                        ${this.renderStone('mini')}
                        <span class="label">${t('onboarding.privacy.warningLabel')}</span>
                    </div>
                    <p class="text">${t('onboarding.privacy.warningText')}</p>
                </div>

                <button class="primary" @click=${this.nextScreen}>
                    ${t('onboarding.understand')}
                    <span class="arrow">→</span>
                </button>
            </div>
        `;
    }

    renderScreen3() {
        const dynamicText = this.isPersonalDevice
            ? t('onboarding.device.textPersonal')
            : t('onboarding.device.textGuest');

        return html`
            <div class="screen">
                <h1>${t('onboarding.device.title')}</h1>
                <p>${t('onboarding.device.subtitle')}</p>

                <div class="toggle-container">
                    <div class="toggle-label">${t('onboarding.device.question')}</div>
                    <div class="toggle-group">
                        <div class="toggle-slider ${this.isPersonalDevice ? 'right' : ''}"></div>
                        <button
                            class="toggle-btn ${!this.isPersonalDevice ? 'active' : ''}"
                            @click=${() => this.toggleDeviceMode(false)}>
                            ${t('onboarding.device.no')}
                        </button>
                        <button
                            class="toggle-btn ${this.isPersonalDevice ? 'active' : ''}"
                            @click=${() => this.toggleDeviceMode(true)}>
                            ${t('onboarding.device.yes')}
                        </button>
                    </div>
                </div>

                <p class="dynamic-text">${dynamicText}</p>

                <button class="primary" @click=${this.nextScreen}>
                    ${t('onboarding.continue')}
                    <span class="arrow">→</span>
                </button>
            </div>
        `;
    }

    renderScreen4() {
        if (!nfc.isSupported()) {
            return html`
                <div class="screen">
                    <div class="scan-container">
                        <div class="scan-stone">
                            ${this.renderStone()}
                        </div>
                    </div>
                    <h1>${t('nfc.notSupported')}</h1>
                    <p>${t('nfc.useAndroid')}</p>
                </div>
            `;
        }

        return html`
            <div class="screen">
                <div class="scan-container">
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="ring ${this.isScanning ? 'active' : ''}"></div>
                    <div class="scan-stone ${this.isScanning ? 'scanning' : ''}">
                        ${this.renderStone()}
                    </div>
                </div>

                <h1>${this.isScanning ? t('onboarding.decrypt.scanning') : t('onboarding.decrypt.title')}</h1>
                <p>${this.isScanning ? t('onboarding.decrypt.holdClose') : t('onboarding.decrypt.text')}</p>

                ${!this.isScanning ? html`
                    <button class="primary" @click=${this.activateNfc}>
                        ${t('onboarding.decrypt.button')}
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderDots() {
        return html`
            <div class="dots">
                ${[0, 1, 2, 3].map(i => html`
                    <div class="dot ${this.currentScreen === i ? 'active' : ''}"></div>
                `)}
            </div>
        `;
    }

    render() {
        return html`
            <div
                class="screens-container"
                style="transform: translateX(-${this.currentScreen * 100}%)"
                @touchstart=${this.handleTouchStart}
                @touchend=${this.handleTouchEnd}>
                ${this.renderScreen1()}
                ${this.renderScreen2()}
                ${this.renderScreen3()}
                ${this.renderScreen4()}
            </div>
            ${this.renderDots()}
        `;
    }
}

customElements.define('onboarding-flow', OnboardingFlow);

export default OnboardingFlow;
