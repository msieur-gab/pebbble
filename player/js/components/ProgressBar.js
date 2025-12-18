/**
 * ProgressBar - Playback progress with time display
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { formatTime } from '../utils/formatters.js';

class ProgressBar extends LitElement {
    static properties = {
        currentTime: { state: true },
        duration: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            padding: 0.5rem 0;
            flex-shrink: 0;
        }

        .progress-bar {
            width: 100%;
            height: 4px;
            background: var(--color-surface, #333);
            border-radius: 2px;
            cursor: pointer;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--color-accent, #FF4D00);
            border-radius: 2px;
            transition: width 100ms linear;
            width: 0%;
        }

        .progress-bar:hover .progress-fill {
            background: var(--color-accent-hover, #ff6a2a);
        }

        .times {
            display: flex;
            justify-content: space-between;
            margin-top: 0.5rem;
            font-size: 0.75rem;
            font-variant-numeric: tabular-nums;
            color: var(--color-text-muted, #666);
        }
    `;

    constructor() {
        super();
        this.currentTime = 0;
        this.duration = 0;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        const state = audio.getState();
        this.currentTime = state.currentTime;
        this.duration = state.duration;

        this.unsubscribers.push(
            eventBus.on(Events.TIME_UPDATE, (data) => {
                this.currentTime = data.currentTime;
                this.duration = data.duration;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                this.currentTime = 0;
                this.duration = data.track?.duration || 0;
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    handleProgressClick(event) {
        const progressBar = this.shadowRoot.getElementById('progress-bar');
        if (!progressBar) return;

        const rect = progressBar.getBoundingClientRect();
        const percent = ((event.clientX - rect.left) / rect.width) * 100;
        audio.seekPercent(Math.max(0, Math.min(100, percent)));
    }

    render() {
        const percent = this.duration > 0
            ? (this.currentTime / this.duration) * 100
            : 0;
        const remaining = Math.max(0, this.duration - this.currentTime);

        return html`
            <div class="progress-bar" id="progress-bar" @click=${this.handleProgressClick}>
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
            <div class="times">
                <span>${formatTime(this.currentTime)}</span>
                <span>-${formatTime(remaining)}</span>
            </div>
        `;
    }
}

customElements.define('progress-bar', ProgressBar);

export default ProgressBar;
