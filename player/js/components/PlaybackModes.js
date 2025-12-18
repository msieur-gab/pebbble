/**
 * PlaybackModes - Repeat mode toggles (off, one, all)
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { audio, RepeatMode } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_REPEAT, ICON_REPEAT_ONE } from '../utils/icons.js';

class PlaybackModes extends LitElement {
    static properties = {
        repeatMode: { state: true }
    };

    static styles = css`
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
    `;

    constructor() {
        super();
        this.repeatMode = RepeatMode.OFF;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        const state = audio.getState();
        this.repeatMode = state.repeatMode;

        this.unsubscribers.push(
            eventBus.on(Events.REPEAT_MODE_CHANGE, (data) => {
                this.repeatMode = data.mode;
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    toggleRepeat() {
        audio.cycleRepeatMode();
    }

    getRepeatTitle() {
        switch (this.repeatMode) {
            case RepeatMode.ONE: return t('controls.repeatOne');
            case RepeatMode.ALL: return t('controls.repeatAll');
            default: return t('controls.repeatOff');
        }
    }

    render() {
        const isActive = this.repeatMode !== RepeatMode.OFF;
        const icon = this.repeatMode === RepeatMode.ONE ? ICON_REPEAT_ONE : ICON_REPEAT;

        return html`
            <button
                class="mode-btn ${isActive ? 'active' : ''}"
                title=${this.getRepeatTitle()}
                @click=${this.toggleRepeat}>
                <span class="mode-icon">${unsafeHTML(icon)}</span>
            </button>
        `;
    }
}

customElements.define('playback-modes', PlaybackModes);

export default PlaybackModes;
