/**
 * PlaybackModes - Repeat mode toggles (off, one, all)
 */

import { eventBus, Events } from '../services/EventBus.js';
import { audio, RepeatMode } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_REPEAT, ICON_REPEAT_ONE } from '../utils/icons.js';

class PlaybackModes extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.repeatMode = RepeatMode.OFF;
        this.unsubscribers = [];
    }

    connectedCallback() {
        // Get current state from audio service
        const state = audio.getState();
        this.repeatMode = state.repeatMode;

        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.REPEAT_MODE_CHANGE, (data) => {
                this.repeatMode = data.mode;
                this.updateUI();
            })
        );
    }

    toggleRepeat() {
        audio.cycleRepeatMode();
    }

    updateUI() {
        const repeatBtn = this.shadowRoot.getElementById('repeat-btn');
        const repeatIcon = this.shadowRoot.getElementById('repeat-icon');

        if (!repeatBtn) return;

        // Update active state
        const isActive = this.repeatMode !== RepeatMode.OFF;
        repeatBtn.classList.toggle('active', isActive);
        repeatBtn.title = this.getRepeatTitle();

        // Update icon based on mode
        if (this.repeatMode === RepeatMode.ONE) {
            repeatIcon.innerHTML = ICON_REPEAT_ONE;
        } else {
            repeatIcon.innerHTML = ICON_REPEAT;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    flex-shrink: 0;
                }

                .mode-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border: none;
                    background: none;
                    color: var(--color-text-muted, #666);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .mode-btn:hover {
                    color: var(--color-text-secondary, #a0a0a0);
                    background: var(--color-surface, #333);
                }

                .mode-btn.active {
                    color: var(--color-accent, #FF4D00);
                }

                .mode-icon {
                    width: 22px;
                    height: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .mode-icon svg {
                    width: 100%;
                    height: 100%;
                }
            </style>

            <button class="mode-btn ${this.repeatMode !== RepeatMode.OFF ? 'active' : ''}"
                    id="repeat-btn"
                    title="${this.getRepeatTitle()}">
                <span class="mode-icon" id="repeat-icon">
                    ${this.repeatMode === RepeatMode.ONE ? ICON_REPEAT_ONE : ICON_REPEAT}
                </span>
            </button>
        `;

        // Add click listener
        const repeatBtn = this.shadowRoot.getElementById('repeat-btn');
        repeatBtn?.addEventListener('click', () => this.toggleRepeat());
    }

    getRepeatTitle() {
        switch (this.repeatMode) {
            case RepeatMode.ONE: return t('controls.repeatOne');
            case RepeatMode.ALL: return t('controls.repeatAll');
            default: return t('controls.repeatOff');
        }
    }
}

customElements.define('playback-modes', PlaybackModes);

export default PlaybackModes;
