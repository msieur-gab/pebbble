/**
 * PlayerControls - Play/pause, previous/next, and progress bar
 */

import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_PLAY, ICON_PAUSE, ICON_PREV, ICON_NEXT } from '../utils/icons.js';

class PlayerControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.isPlaying = false;
        this.unsubscribers = [];
    }

    connectedCallback() {
        // Get current state from audio service
        const state = audio.getState();
        this.isPlaying = state.isPlaying;

        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.PLAY, () => {
                this.isPlaying = true;
                this.updatePlayButton();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PAUSE, () => {
                this.isPlaying = false;
                this.updatePlayButton();
            })
        );
    }

    updatePlayButton() {
        const playBtn = this.shadowRoot.getElementById('play-btn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? ICON_PAUSE : ICON_PLAY;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                }

                .transport {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .transport-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border: none;
                    background: none;
                    color: var(--color-text-secondary, #a0a0a0);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 50%;
                }

                .transport-btn:hover:not(:disabled) {
                    color: var(--color-text-primary, #fff);
                    background: var(--color-surface, #333);
                }

                .transport-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }

                .transport-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .transport-btn svg {
                    width: 24px;
                    height: 24px;
                }

                .play-btn {
                    width: 64px;
                    height: 64px;
                    background: var(--color-accent, #FF4D00);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(255, 77, 0, 0.4);
                    transition: all 0.3s ease;
                }

                .play-btn:hover:not(:disabled) {
                    background: var(--color-accent-hover, #ff6a2a);
                    transform: scale(1.05);
                    box-shadow: 0 6px 25px rgba(255, 77, 0, 0.5);
                }

                .play-btn:active:not(:disabled) {
                    transform: scale(0.98);
                }

                .play-btn svg {
                    width: 28px;
                    height: 28px;
                    margin-left: 2px;
                }
            </style>

            <div class="transport">
                <button class="transport-btn" id="prev-btn" title="${t('controls.previous')}">
                    ${ICON_PREV}
                </button>

                <button class="transport-btn play-btn" id="play-btn" title="${t('controls.play')}">
                    ${this.isPlaying ? ICON_PAUSE : ICON_PLAY}
                </button>

                <button class="transport-btn" id="next-btn" title="${t('controls.next')}">
                    ${ICON_NEXT}
                </button>
            </div>
        `;

        // Button listeners
        const playBtn = this.shadowRoot.getElementById('play-btn');
        const prevBtn = this.shadowRoot.getElementById('prev-btn');
        const nextBtn = this.shadowRoot.getElementById('next-btn');

        playBtn?.addEventListener('click', () => audio.toggle());
        prevBtn?.addEventListener('click', () => audio.previous());
        nextBtn?.addEventListener('click', () => audio.next());
    }
}

customElements.define('player-controls', PlayerControls);

export default PlayerControls;
