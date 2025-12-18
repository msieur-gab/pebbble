/**
 * SleepTimer - Timer to stop playback after a set duration
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { formatTime } from '../utils/formatters.js';

// Module-level state to persist across re-renders
let timerState = {
    timerMinutes: 0,
    remainingSeconds: 0,
    timerInterval: null,
    endTime: null,
    isPaused: false,
    pausedRemaining: 0,
    activeInstance: null
};

class SleepTimer extends LitElement {
    static properties = {
        isOpen: { state: true },
        timerMinutes: { state: true },
        remainingSeconds: { state: true }
    };

    static styles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            flex-shrink: 0;
            position: relative;
        }

        .timer-trigger {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border: none;
            background: none;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.7rem;
            font-weight: 600;
            flex-direction: column;
            gap: 1px;
        }

        .timer-trigger:hover {
            background: var(--color-surface, #333);
        }

        .timer-trigger.active {
            color: var(--color-accent, #FF4D00);
        }

        .timer-trigger:not(.active) {
            color: var(--color-text-muted, #666);
        }

        .timer-trigger:not(.active):hover {
            color: var(--color-text-secondary, #a0a0a0);
        }

        .timer-icon {
            font-size: 1.2rem;
            line-height: 1;
        }

        .timer-display {
            font-variant-numeric: tabular-nums;
            font-size: 0.65rem;
        }

        .timer-panel {
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 0.5rem;
            padding: 1rem;
            background: var(--color-bg-elevated, #242424);
            border-radius: 16px;
            width: 200px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideUp 0.2s ease-out;
            z-index: 100;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .panel-title {
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-muted, #666);
            margin-bottom: 0.75rem;
            text-align: center;
        }

        .preset-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.4rem;
        }

        .preset-btn {
            padding: 0.6rem 0.5rem;
            background: var(--color-surface, #333);
            border: 2px solid transparent;
            border-radius: 10px;
            color: var(--color-text-secondary, #a0a0a0);
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .preset-btn:hover {
            background: var(--color-bg-card, #2a2a2a);
            border-color: var(--color-accent, #FF4D00);
            color: var(--color-text-primary, #fff);
        }

        .preset-btn.active {
            background: var(--color-accent-muted, rgba(255, 77, 0, 0.15));
            border-color: var(--color-accent, #FF4D00);
            color: var(--color-accent, #FF4D00);
        }

        .off-btn {
            grid-column: span 2;
            margin-top: 0.25rem;
            background: transparent;
            border: 1px solid var(--color-surface, #333);
        }

        .off-btn:hover {
            border-color: var(--color-text-muted, #666);
        }
    `;

    constructor() {
        super();
        this.isOpen = false;
        this.presets = [2, 30, 45, 60];
        this.timerMinutes = timerState.timerMinutes;
        this.remainingSeconds = timerState.remainingSeconds;
        this.unsubscribers = [];
        this.closePanel = this.closePanel.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        timerState.activeInstance = this;

        // Sync state if timer is running
        if (timerState.timerMinutes > 0) {
            if (timerState.isPaused) {
                this.remainingSeconds = timerState.pausedRemaining;
            } else if (timerState.endTime) {
                const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
                if (remaining > 0) {
                    this.remainingSeconds = remaining;
                    if (!timerState.timerInterval) {
                        this.startInterval();
                    }
                } else {
                    this.onTimerComplete();
                }
            }
        }
        this.timerMinutes = timerState.timerMinutes;

        this.unsubscribers = [
            eventBus.on(Events.PLAY, () => this.handlePlaybackResume()),
            eventBus.on(Events.PAUSE, () => this.handlePlaybackPause())
        ];
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        if (timerState.activeInstance === this) {
            timerState.activeInstance = null;
        }
        document.removeEventListener('click', this.closePanel);
    }

    handlePlaybackPause() {
        if (this.timerMinutes > 0 && !timerState.isPaused) {
            timerState.isPaused = true;
            timerState.pausedRemaining = this.remainingSeconds;
            this.stopInterval();
        }
    }

    handlePlaybackResume() {
        if (this.timerMinutes > 0 && timerState.isPaused) {
            timerState.isPaused = false;
            timerState.endTime = Date.now() + (timerState.pausedRemaining * 1000);
            this.remainingSeconds = timerState.pausedRemaining;
            this.startInterval();
        }
    }

    togglePanel(e) {
        e.stopPropagation();
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            setTimeout(() => {
                document.addEventListener('click', this.closePanel);
            }, 0);
        } else {
            document.removeEventListener('click', this.closePanel);
        }
    }

    closePanel() {
        if (this.isOpen) {
            this.isOpen = false;
            document.removeEventListener('click', this.closePanel);
        }
    }

    setTimer(minutes) {
        this.stopInterval();
        timerState.isPaused = false;
        timerState.pausedRemaining = 0;

        if (minutes === 0) {
            this.timerMinutes = 0;
            this.remainingSeconds = 0;
            timerState.timerMinutes = 0;
            timerState.remainingSeconds = 0;
            timerState.endTime = null;
            this.isOpen = false;
            return;
        }

        this.timerMinutes = minutes;
        this.remainingSeconds = minutes * 60;
        timerState.timerMinutes = minutes;
        timerState.remainingSeconds = minutes * 60;
        timerState.endTime = Date.now() + (minutes * 60 * 1000);

        eventBus.emit(Events.TIMER_SET, { minutes });

        if (audio.isPlaying) {
            this.startInterval();
        } else {
            timerState.isPaused = true;
            timerState.pausedRemaining = minutes * 60;
        }

        this.isOpen = false;
    }

    startInterval() {
        this.stopInterval();
        timerState.timerInterval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
            timerState.remainingSeconds = remaining;

            eventBus.emit(Events.TIMER_TICK, {
                remaining: remaining,
                formatted: formatTime(remaining)
            });

            if (timerState.activeInstance) {
                timerState.activeInstance.remainingSeconds = remaining;
            }

            if (remaining <= 0) {
                this.onTimerComplete();
            }
        }, 1000);
    }

    stopInterval() {
        if (timerState.timerInterval) {
            clearInterval(timerState.timerInterval);
            timerState.timerInterval = null;
        }
    }

    onTimerComplete() {
        this.stopInterval();
        audio.pause();

        this.timerMinutes = 0;
        this.remainingSeconds = 0;
        timerState.timerMinutes = 0;
        timerState.remainingSeconds = 0;
        timerState.endTime = null;
        timerState.isPaused = false;
        timerState.pausedRemaining = 0;

        eventBus.emit(Events.TIMER_COMPLETE);
    }

    render() {
        const isActive = this.timerMinutes > 0;
        const displayTime = timerState.isPaused
            ? timerState.pausedRemaining
            : this.remainingSeconds;

        return html`
            <button
                class="timer-trigger ${isActive ? 'active' : ''}"
                title=${t('timer.title')}
                @click=${this.togglePanel}>
                <span class="timer-icon">⏱️</span>
                ${isActive ? html`<span class="timer-display">${formatTime(displayTime)}</span>` : ''}
            </button>

            ${this.isOpen ? html`
                <div class="timer-panel">
                    <div class="panel-title">${t('timer.setTimer')}</div>
                    <div class="preset-grid">
                        ${this.presets.map(mins => html`
                            <button
                                class="preset-btn ${this.timerMinutes === mins ? 'active' : ''}"
                                @click=${() => this.setTimer(mins)}>
                                ${mins}m
                            </button>
                        `)}
                        <button class="preset-btn off-btn" @click=${() => this.setTimer(0)}>
                            ${t('timer.off')}
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('sleep-timer', SleepTimer);

export default SleepTimer;
