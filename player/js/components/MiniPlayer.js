/**
 * MiniPlayer - Compact player bar for collapsed state
 * Supports swipe gestures for track navigation
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_PLAY, ICON_PAUSE } from '../utils/icons.js';

class MiniPlayer extends LitElement {
    static properties = {
        currentTrack: { state: true },
        isPlaying: { state: true },
        progress: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            height: 70px;
            position: relative;
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
        }

        .mini-player {
            height: 100%;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            gap: 0.75rem;
            background: #121212;
        }

        .mini-player__content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
            transition: transform 0.15s ease-out;
        }

        .mini-player__content.swipe-next {
            animation: swipe-left 0.2s ease-out;
        }

        .mini-player__content.swipe-previous {
            animation: swipe-right 0.2s ease-out;
        }

        @keyframes swipe-left {
            0% { transform: translateX(0); }
            50% { transform: translateX(-20px); opacity: 0.5; }
            100% { transform: translateX(0); }
        }

        @keyframes swipe-right {
            0% { transform: translateX(0); }
            50% { transform: translateX(20px); opacity: 0.5; }
            100% { transform: translateX(0); }
        }

        .mini-player__stone {
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 10px rgba(255, 77, 0, 0.3);
        }

        .mini-player__info {
            flex: 1;
            min-width: 0;
        }

        .mini-player__title {
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--color-text-primary, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .mini-player__hint {
            font-size: 0.7rem;
            color: var(--color-text-muted, #666);
            margin-top: 2px;
        }

        .mini-player__play-btn {
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-accent, #FF4D00);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            color: white;
            transition: transform 0.1s, background 0.2s;
        }

        .mini-player__play-btn:active {
            transform: scale(0.95);
        }

        .mini-player__play-btn svg {
            width: 24px;
            height: 24px;
        }

        .mini-player__progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--color-border, #333);
        }

        .mini-player__progress-fill {
            height: 100%;
            background: var(--color-accent, #FF4D00);
            transition: width 0.1s linear;
        }
    `;

    constructor() {
        super();
        this.currentTrack = null;
        this.isPlaying = false;
        this.progress = 0;

        this.touchStartX = 0;
        this.touchStartTime = 0;
        this.swipeThreshold = 50;
        this.isSwiping = false;

        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        this.setupTouchHandlers();

        const state = audio.getState();
        this.currentTrack = state.currentTrack;
        this.isPlaying = state.isPlaying;
        if (state.duration > 0) {
            this.progress = (state.currentTime / state.duration) * 100;
        }

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                this.currentTrack = data.track;
            })
        );

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

        this.unsubscribers.push(
            eventBus.on(Events.TIME_UPDATE, (data) => {
                this.progress = data.percent;
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        this.removeTouchHandlers();
    }

    setupTouchHandlers() {
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);

        this.addEventListener('touchstart', this.boundTouchStart, { passive: true });
        this.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        this.addEventListener('touchend', this.boundTouchEnd, { passive: true });
    }

    removeTouchHandlers() {
        this.removeEventListener('touchstart', this.boundTouchStart);
        this.removeEventListener('touchmove', this.boundTouchMove);
        this.removeEventListener('touchend', this.boundTouchEnd);
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartTime = Date.now();
        this.isSwiping = false;
    }

    handleTouchMove(e) {
        const deltaX = e.touches[0].clientX - this.touchStartX;

        if (Math.abs(deltaX) > 10) {
            this.isSwiping = true;
            if (e.cancelable) {
                e.preventDefault();
            }

            const content = this.shadowRoot.querySelector('.mini-player__content');
            if (content) {
                const elasticDelta = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.8, 80);
                content.style.transform = `translateX(${elasticDelta}px)`;
                content.style.transition = 'none';
            }
        }
    }

    handleTouchEnd(e) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaTime = Date.now() - this.touchStartTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        const content = this.shadowRoot.querySelector('.mini-player__content');
        if (content) {
            content.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            content.style.transform = 'translateX(0)';
        }

        if (this.isSwiping) {
            if (deltaX > this.swipeThreshold || (deltaX > 20 && velocity > 0.5)) {
                audio.previous();
                this.showSwipeFeedback('previous');
            } else if (deltaX < -this.swipeThreshold || (deltaX < -20 && velocity > 0.5)) {
                audio.next();
                this.showSwipeFeedback('next');
            }
        }

        this.isSwiping = false;
    }

    showSwipeFeedback(direction) {
        const content = this.shadowRoot.querySelector('.mini-player__content');
        if (content) {
            content.classList.add(`swipe-${direction}`);
            setTimeout(() => {
                content.classList.remove(`swipe-${direction}`);
            }, 200);
        }
    }

    handlePlayPause(e) {
        e.stopPropagation();
        audio.isPlaying ? audio.pause() : audio.play();
    }

    handleExpand() {
        if (!this.isSwiping) {
            eventBus.emit(Events.PLAYER_SHEET_EXPAND);
        }
    }

    render() {
        const trackTitle = this.currentTrack?.title || t('miniPlayer.nowPlaying');

        return html`
            <div class="mini-player" @click=${this.handleExpand}>
                <div class="mini-player__content">
                    <div class="mini-player__stone"></div>
                    <div class="mini-player__info">
                        <div class="mini-player__title">${trackTitle}</div>
                        <div class="mini-player__hint">${t('miniPlayer.swipeHint')}</div>
                    </div>
                </div>
                <button
                    class="mini-player__play-btn"
                    aria-label=${this.isPlaying ? t('controls.pause') : t('controls.play')}
                    @click=${this.handlePlayPause}>
                    ${unsafeHTML(this.isPlaying ? ICON_PAUSE : ICON_PLAY)}
                </button>
                <div class="mini-player__progress">
                    <div class="mini-player__progress-fill" style="width: ${this.progress}%"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('mini-player', MiniPlayer);

export default MiniPlayer;
