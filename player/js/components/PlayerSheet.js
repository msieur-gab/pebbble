/**
 * PlayerSheet - Bottom sheet container for the player
 * Supports collapsed (mini player) and expanded (full player) states
 * Drag gestures to expand/collapse
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_CHEVRON_DOWN } from '../utils/icons.js';
import './MiniPlayer.js';

class PlayerSheet extends LitElement {
    static properties = {
        isOpen: { state: true },
        isExpanded: { state: true },
        trackTitle: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            pointer-events: none;
        }

        .player-sheet {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #121212;
            border-radius: 16px 16px 0 0;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-height: 95vh;
            height: 95vh;
            overflow: hidden;
            pointer-events: auto;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
        }

        .player-sheet.visible {
            transform: translateY(calc(100% - 70px));
        }

        .player-sheet.expanded {
            transform: translateY(0);
        }

        .mini-player-container {
            display: block;
        }

        .mini-player-container.hidden {
            display: none;
        }

        .full-player {
            display: none;
            flex-direction: column;
            height: 100%;
            padding: 0 1rem 1rem;
            box-sizing: border-box;
            overflow: hidden;
        }

        .full-player.visible {
            display: flex;
        }

        .drag-handle-container {
            display: flex;
            justify-content: center;
            padding: 12px 0 8px;
            cursor: grab;
            touch-action: none;
        }

        .drag-handle-container:active {
            cursor: grabbing;
        }

        .drag-handle {
            width: 40px;
            height: 4px;
            background: var(--color-text-muted, #666);
            border-radius: 2px;
        }

        .drag-zone {
            touch-action: none;
            cursor: grab;
            flex-shrink: 0;
        }

        .drag-zone:active {
            cursor: grabbing;
        }

        .collapse-btn {
            background: none;
            border: none;
            color: var(--color-text-muted, #666);
            padding: 0.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .collapse-btn svg {
            width: 24px;
            height: 24px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 0.5rem;
            flex-shrink: 0;
        }

        .header__title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
        }

        .visualization {
            flex-shrink: 0;
            display: block;
            width: 100%;
            padding: 1rem 0;
        }

        .now-playing {
            text-align: center;
            padding: 0.5rem 0;
            flex-shrink: 0;
        }

        .now-playing__label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--color-text-muted, #666);
            margin-bottom: 0.25rem;
        }

        .now-playing__title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-text-primary, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .transport-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 0;
            flex-shrink: 0;
        }

        .playlist-container {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
    `;

    constructor() {
        super();
        this.isOpen = false;
        this.isExpanded = false;
        this.trackTitle = '-';
        this.miniPlayerHeight = 70;

        this.isDragging = false;
        this.dragStartY = 0;

        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_OPEN, () => {
                this.open();
                this.expand();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_EXPAND, () => {
                this.expand();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                if (data.track) {
                    this.trackTitle = data.track.title;
                }
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.requestUpdate();
            })
        );
    }

    open() {
        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
        this.isExpanded = false;
    }

    expand() {
        this.isExpanded = true;
        document.body.style.overflow = 'hidden';
    }

    collapse() {
        this.isExpanded = false;
        document.body.style.overflow = '';
    }

    handleDragStart(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStartY = e.touches[0].clientY;

        const sheet = this.shadowRoot?.querySelector('.player-sheet');
        if (sheet) {
            sheet.style.transition = 'none';
        }
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const deltaY = e.touches[0].clientY - this.dragStartY;
        const sheet = this.shadowRoot?.querySelector('.player-sheet');

        if (sheet) {
            if (this.isExpanded) {
                const newY = Math.max(0, deltaY);
                sheet.style.transform = `translateY(${newY}px)`;
            } else {
                const maxHeight = window.innerHeight - this.miniPlayerHeight;
                const currentY = window.innerHeight - this.miniPlayerHeight;
                const newY = Math.max(0, Math.min(currentY, currentY + deltaY));
                sheet.style.transform = `translateY(${newY}px)`;
            }
        }
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const deltaY = e.changedTouches[0].clientY - this.dragStartY;
        const sheet = this.shadowRoot?.querySelector('.player-sheet');

        if (sheet) {
            sheet.style.transition = '';
            const threshold = 100;

            if (this.isExpanded && deltaY > threshold) {
                this.collapse();
            } else if (!this.isExpanded && deltaY < -threshold) {
                this.expand();
            }
        }
    }

    render() {
        const state = audio.getState();
        const title = state.currentTrack?.title || this.trackTitle;

        return html`
            <div class="player-sheet ${this.isOpen ? 'visible' : ''} ${this.isExpanded ? 'expanded' : ''}">
                <!-- Mini Player (collapsed state) -->
                <div class="mini-player-container ${this.isExpanded ? 'hidden' : ''}">
                    <mini-player></mini-player>
                </div>

                <!-- Full Player (expanded state) -->
                <div class="full-player ${this.isExpanded ? 'visible' : ''}">
                    <div class="drag-zone"
                         @touchstart=${this.handleDragStart}
                         @touchmove=${this.handleDrag}
                         @touchend=${this.handleDragEnd}>
                        <div class="drag-handle-container">
                            <div class="drag-handle"></div>
                        </div>

                        <header class="header">
                            <h1 class="header__title">${t('player.playlist')}</h1>
                            <button class="collapse-btn" aria-label="Collapse" @click=${this.collapse}>
                                ${unsafeHTML(ICON_CHEVRON_DOWN)}
                            </button>
                        </header>

                        <div class="visualization">
                            <tape-canvas></tape-canvas>
                        </div>
                    </div>

                    <div class="now-playing">
                        <p class="now-playing__label">${t('player.nowPlaying')}</p>
                        <h2 class="now-playing__title">${title}</h2>
                    </div>

                    <progress-bar></progress-bar>

                    <div class="transport-row">
                        <playback-modes></playback-modes>
                        <player-controls></player-controls>
                        <sleep-timer></sleep-timer>
                    </div>

                    <div class="playlist-container">
                        <playlist-view></playlist-view>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('player-sheet', PlayerSheet);

export default PlayerSheet;
