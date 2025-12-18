/**
 * PlayerControls - Play/pause, previous/next, and progress bar
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_PLAY, ICON_PAUSE, ICON_PREV, ICON_NEXT } from '../utils/icons.js';

class PlayerControls extends LitElement {
    static properties = {
        isPlaying: { state: true }
    };

    static styles = css`
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
    `;

    constructor() {
        super();
        this.isPlaying = false;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        const state = audio.getState();
        this.isPlaying = state.isPlaying;

        this.unsubscribers.push(
            eventBus.on(Events.PLAY, () => {
                this.isPlaying = true;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PAUSE, () => {
                this.isPlaying = false;
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    togglePlay() {
        audio.isPlaying ? audio.pause() : audio.play();
    }

    render() {
        return html`
            <div class="transport">
                <button
                    class="transport-btn"
                    title=${t('controls.previous')}
                    @click=${() => audio.previous()}>
                    ${unsafeHTML(ICON_PREV)}
                </button>

                <button
                    class="transport-btn play-btn"
                    title=${t('controls.play')}
                    @click=${this.togglePlay}>
                    ${unsafeHTML(this.isPlaying ? ICON_PAUSE : ICON_PLAY)}
                </button>

                <button
                    class="transport-btn"
                    title=${t('controls.next')}
                    @click=${() => audio.next()}>
                    ${unsafeHTML(ICON_NEXT)}
                </button>
            </div>
        `;
    }
}

customElements.define('player-controls', PlayerControls);

export default PlayerControls;
