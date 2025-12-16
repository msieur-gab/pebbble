/**
 * ProgressBar - Playback progress with time display
 */

import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';

class ProgressBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.currentTime = 0;
        this.duration = 0;
        this.unsubscribers = [];
    }

    connectedCallback() {
        // Get current state from audio service
        const state = audio.getState();
        this.currentTime = state.currentTime;
        this.duration = state.duration;

        this.render();
        this.setupEventListeners();
        this.updateProgress();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.TIME_UPDATE, (data) => {
                this.currentTime = data.currentTime;
                this.duration = data.duration;
                this.updateProgress();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                this.currentTime = 0;
                this.duration = data.track?.duration || 0;
                this.updateProgress();
            })
        );
    }

    updateProgress() {
        const progressFill = this.shadowRoot.getElementById('progress-fill');
        const currentTimeEl = this.shadowRoot.getElementById('current-time');
        const remainingTimeEl = this.shadowRoot.getElementById('remaining-time');

        if (progressFill) {
            const percent = this.duration > 0
                ? (this.currentTime / this.duration) * 100
                : 0;
            progressFill.style.width = `${percent}%`;
        }

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.currentTime);
        }

        if (remainingTimeEl) {
            const remaining = Math.max(0, this.duration - this.currentTime);
            remainingTimeEl.textContent = `-${this.formatTime(remaining)}`;
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    handleProgressClick(event) {
        const progressBar = this.shadowRoot.getElementById('progress-bar');
        if (!progressBar) return;

        const rect = progressBar.getBoundingClientRect();
        const percent = ((event.clientX - rect.left) / rect.width) * 100;
        audio.seekPercent(Math.max(0, Math.min(100, percent)));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
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
            </style>

            <div class="progress-bar" id="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="times">
                <span id="current-time">0:00</span>
                <span id="remaining-time">-0:00</span>
            </div>
        `;

        const progressBar = this.shadowRoot.getElementById('progress-bar');
        progressBar?.addEventListener('click', (e) => this.handleProgressClick(e));
    }
}

customElements.define('progress-bar', ProgressBar);

export default ProgressBar;
