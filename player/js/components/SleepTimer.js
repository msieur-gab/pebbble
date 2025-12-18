/**
 * SleepTimer - Timer to stop playback after a set duration
 */

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
    activeInstance: null  // Track which component instance should receive updates
};

class SleepTimer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.isOpen = false;
        this.presets = [2, 30, 45, 60]; // minutes
    }

    get timerMinutes() {
        return timerState.timerMinutes;
    }

    set timerMinutes(val) {
        timerState.timerMinutes = val;
    }

    get remainingSeconds() {
        return timerState.remainingSeconds;
    }

    set remainingSeconds(val) {
        timerState.remainingSeconds = val;
    }

    connectedCallback() {
        // Mark this as the active instance for display updates
        timerState.activeInstance = this;

        // If timer is running, sync remaining time
        if (timerState.timerMinutes > 0) {
            if (timerState.isPaused) {
                // Timer was paused, use stored remaining time
                this.remainingSeconds = timerState.pausedRemaining;
            } else if (timerState.endTime) {
                // Timer running, calculate from endTime
                const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
                if (remaining > 0) {
                    this.remainingSeconds = remaining;
                    // Restart interval if not running
                    if (!timerState.timerInterval) {
                        this.startInterval();
                    }
                } else {
                    this.onTimerComplete();
                }
            }
        }

        // Listen for play/pause events to sync timer
        this.unsubscribers = [
            eventBus.on(Events.PLAY, () => this.handlePlaybackResume()),
            eventBus.on(Events.PAUSE, () => this.handlePlaybackPause())
        ];

        this.render();
    }

    disconnectedCallback() {
        // Unsubscribe from events
        if (this.unsubscribers) {
            this.unsubscribers.forEach(unsub => unsub());
        }
        // Clear active instance if this was it
        if (timerState.activeInstance === this) {
            timerState.activeInstance = null;
        }
        document.removeEventListener('click', this.closePanel);
    }

    /**
     * Pause timer when playback pauses
     */
    handlePlaybackPause() {
        if (this.timerMinutes > 0 && !timerState.isPaused) {
            timerState.isPaused = true;
            timerState.pausedRemaining = this.remainingSeconds;
            this.stopInterval();
        }
    }

    /**
     * Resume timer when playback resumes
     */
    handlePlaybackResume() {
        if (this.timerMinutes > 0 && timerState.isPaused) {
            timerState.isPaused = false;
            // Recalculate endTime based on remaining time
            timerState.endTime = Date.now() + (timerState.pausedRemaining * 1000);
            this.remainingSeconds = timerState.pausedRemaining;
            this.startInterval();
        }
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        this.render();
    }

    setTimer(minutes) {
        this.stopInterval();
        timerState.isPaused = false;
        timerState.pausedRemaining = 0;

        if (minutes === 0) {
            this.timerMinutes = 0;
            this.remainingSeconds = 0;
            timerState.endTime = null;
            this.render();
            return;
        }

        this.timerMinutes = minutes;
        this.remainingSeconds = minutes * 60;
        timerState.endTime = Date.now() + (minutes * 60 * 1000);

        eventBus.emit(Events.TIMER_SET, { minutes });

        // Only start if audio is playing
        if (audio.isPlaying) {
            this.startInterval();
        } else {
            // Audio is paused, so pause the timer too
            timerState.isPaused = true;
            timerState.pausedRemaining = minutes * 60;
        }

        this.isOpen = false;
        this.render();
    }

    startInterval() {
        this.stopInterval();
        timerState.timerInterval = setInterval(() => {
            // Calculate from endTime to stay accurate
            const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
            timerState.remainingSeconds = remaining;

            eventBus.emit(Events.TIMER_TICK, {
                remaining: remaining,
                formatted: formatTime(remaining)
            });

            // Update the active instance's display
            if (timerState.activeInstance) {
                timerState.activeInstance.updateDisplay();
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
        timerState.endTime = null;
        timerState.isPaused = false;
        timerState.pausedRemaining = 0;

        eventBus.emit(Events.TIMER_COMPLETE);

        // Update display on active instance
        if (timerState.activeInstance) {
            timerState.activeInstance.render();
        }
    }

    updateDisplay() {
        const display = this.shadowRoot.getElementById('timer-display');
        if (display) {
            const remaining = timerState.isPaused
                ? timerState.pausedRemaining
                : timerState.remainingSeconds;
            display.textContent = formatTime(remaining);
        }
    }

    render() {
        const isActive = this.timerMinutes > 0;

        this.shadowRoot.innerHTML = `
            <style>
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
                    color: ${isActive ? 'var(--color-accent, #FF4D00)' : 'var(--color-text-muted, #666)'};
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
                    color: ${isActive ? 'var(--color-accent, #FF4D00)' : 'var(--color-text-secondary, #a0a0a0)'};
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
                    display: ${this.isOpen ? 'block' : 'none'};
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
            </style>

            <button class="timer-trigger" id="timer-trigger" title="${t('timer.title')}">
                <span class="timer-icon">⏱️</span>
                ${isActive ? `<span class="timer-display" id="timer-display">${formatTime(this.remainingSeconds)}</span>` : ''}
            </button>

            <div class="timer-panel">
                <div class="panel-title">${t('timer.setTimer')}</div>
                <div class="preset-grid">
                    ${this.presets.map(mins => `
                        <button class="preset-btn ${this.timerMinutes === mins ? 'active' : ''}"
                                data-minutes="${mins}">
                            ${mins}m
                        </button>
                    `).join('')}
                    <button class="preset-btn off-btn" data-minutes="0">
                        ${t('timer.off')}
                    </button>
                </div>
            </div>
        `;

        // Event listeners
        const trigger = this.shadowRoot.getElementById('timer-trigger');
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        this.shadowRoot.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes, 10);
                this.setTimer(minutes);
            });
        });

        // Close panel when clicking outside
        if (this.isOpen) {
            setTimeout(() => {
                document.addEventListener('click', this.closePanel);
            }, 0);
        }
    }

    closePanel = () => {
        if (this.isOpen) {
            this.isOpen = false;
            document.removeEventListener('click', this.closePanel);
            this.render();
        }
    }
}

customElements.define('sleep-timer', SleepTimer);

export default SleepTimer;
