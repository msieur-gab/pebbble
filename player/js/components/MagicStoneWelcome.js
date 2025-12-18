/**
 * MagicStoneWelcome - "You have a magic stone!" welcome screen
 * Shown after NFC tag is successfully scanned
 */

import { eventBus, Events } from '../services/EventBus.js';
import { t } from '../services/I18nService.js';
import { audio } from '../services/AudioService.js';

class MagicStoneWelcome extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const continueBtn = this.shadowRoot.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', async () => {
                // Unlock audio FIRST - this must happen in user gesture context
                await audio.unlock();
                eventBus.emit(Events.WELCOME_COMPLETE);
            });
        }
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
                    text-align: center;
                    padding: 2rem;
                    animation: fadeIn 0.5s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .stone-container {
                    position: relative;
                    width: 160px;
                    height: 160px;
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
                        inset -15px -15px 40px rgba(0, 0, 0, 0.4),
                        inset 8px 8px 20px rgba(255, 255, 255, 0.15),
                        0 20px 40px rgba(0, 0, 0, 0.4),
                        0 0 60px rgba(255, 77, 0, 0.4);
                    animation: float 4s ease-in-out infinite, glow 3s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-8px) rotate(2deg); }
                    75% { transform: translateY(-4px) rotate(-2deg); }
                }

                @keyframes glow {
                    0%, 100% { box-shadow:
                        inset -15px -15px 40px rgba(0, 0, 0, 0.4),
                        inset 8px 8px 20px rgba(255, 255, 255, 0.15),
                        0 20px 40px rgba(0, 0, 0, 0.4),
                        0 0 60px rgba(255, 77, 0, 0.4);
                    }
                    50% { box-shadow:
                        inset -15px -15px 40px rgba(0, 0, 0, 0.4),
                        inset 8px 8px 20px rgba(255, 255, 255, 0.15),
                        0 20px 40px rgba(0, 0, 0, 0.4),
                        0 0 80px rgba(255, 77, 0, 0.6);
                    }
                }

                /* Sparkle effects */
                .sparkles {
                    position: absolute;
                    inset: -20px;
                    pointer-events: none;
                }

                .sparkle {
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: #FFD700;
                    border-radius: 50%;
                    animation: sparkle 2s ease-in-out infinite;
                }

                .sparkle:nth-child(1) { top: 10%; left: 20%; animation-delay: 0s; }
                .sparkle:nth-child(2) { top: 30%; right: 10%; animation-delay: 0.4s; }
                .sparkle:nth-child(3) { bottom: 20%; left: 10%; animation-delay: 0.8s; }
                .sparkle:nth-child(4) { bottom: 10%; right: 25%; animation-delay: 1.2s; }
                .sparkle:nth-child(5) { top: 50%; left: 0%; animation-delay: 1.6s; }

                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }

                h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--color-text-primary, #fff);
                    margin-bottom: 0.75rem;
                    background: linear-gradient(135deg, #FF4D00, #FFD700);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                p {
                    font-size: 1rem;
                    color: var(--color-text-secondary, #a0a0a0);
                    margin-bottom: 2.5rem;
                    max-width: 280px;
                    line-height: 1.5;
                }

                button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1rem 2.5rem;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #fff;
                    background: linear-gradient(135deg, #FF4D00, #cc3d00);
                    border: none;
                    border-radius: 50px;
                    cursor: pointer;
                    box-shadow:
                        0 4px 15px rgba(255, 77, 0, 0.4),
                        0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                }

                button:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 6px 20px rgba(255, 77, 0, 0.5),
                        0 4px 8px rgba(0, 0, 0, 0.2);
                }

                button:active {
                    transform: translateY(0);
                }

                .arrow {
                    transition: transform 0.3s ease;
                }

                button:hover .arrow {
                    transform: translateX(4px);
                }
            </style>

            <div class="stone-container">
                <div class="stone"></div>
                <div class="sparkles">
                    <div class="sparkle"></div>
                    <div class="sparkle"></div>
                    <div class="sparkle"></div>
                    <div class="sparkle"></div>
                    <div class="sparkle"></div>
                </div>
            </div>

            <h1>${t('welcome.title')}</h1>
            <p>${t('welcome.subtitle')}</p>

            <button id="continue-btn">
                ${t('welcome.continue')}
                <span class="arrow">→</span>
            </button>
        `;

        // Re-attach event listeners after render
        this.setupEventListeners();
    }
}

customElements.define('magic-stone-welcome', MagicStoneWelcome);

export default MagicStoneWelcome;
