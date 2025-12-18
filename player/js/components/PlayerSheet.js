/**
 * PlayerSheet - Bottom sheet container for the player
 * Supports collapsed (mini player) and expanded (full player) states
 * Drag gestures to expand/collapse
 */

import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { ICON_CHEVRON_DOWN } from '../utils/icons.js';
import './MiniPlayer.js';

class PlayerSheet extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.isOpen = false;
        this.isExpanded = false;
        this.isDragging = false;
        this.dragStartY = 0;
        this.currentTranslateY = 0;

        this.miniPlayerHeight = 70;
        this.unsubscribers = [];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.setupDragHandlers();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
        this.removeDragHandlers();
    }

    setupEventListeners() {
        // Open sheet when playlist loads
        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_OPEN, () => {
                this.open();
                this.expand();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_CLOSE, () => {
                this.close();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_EXPAND, () => {
                this.expand();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_COLLAPSE, () => {
                this.collapse();
            })
        );

        // Update now playing title on track change
        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                const titleEl = this.shadowRoot?.querySelector('.now-playing__title');
                if (titleEl && data.track) {
                    titleEl.textContent = data.track.title;
                }
            })
        );

        // Re-render on language change
        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.render();
                if (this.isOpen) {
                    this.updateSheetState();
                }
            })
        );
    }

    setupDragHandlers() {
        this.boundDragStart = this.handleDragStart.bind(this);
        this.boundDrag = this.handleDrag.bind(this);
        this.boundDragEnd = this.handleDragEnd.bind(this);
    }

    removeDragHandlers() {
        const dragZone = this.shadowRoot?.querySelector('.drag-zone');
        if (dragZone) {
            dragZone.removeEventListener('touchstart', this.boundDragStart);
            dragZone.removeEventListener('touchmove', this.boundDrag);
            dragZone.removeEventListener('touchend', this.boundDragEnd);
        }
    }

    attachDragHandlers() {
        const dragZone = this.shadowRoot?.querySelector('.drag-zone');
        if (dragZone) {
            dragZone.addEventListener('touchstart', this.boundDragStart, { passive: false });
            dragZone.addEventListener('touchmove', this.boundDrag, { passive: false });
            dragZone.addEventListener('touchend', this.boundDragEnd, { passive: true });
        }
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
                // Dragging down from expanded
                const newY = Math.max(0, deltaY);
                sheet.style.transform = `translateY(${newY}px)`;
            } else {
                // Dragging up from collapsed
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

            // Threshold for state change
            const threshold = 100;

            if (this.isExpanded && deltaY > threshold) {
                this.collapse();
            } else if (!this.isExpanded && deltaY < -threshold) {
                this.expand();
            } else {
                // Snap back
                this.updateSheetState();
            }
        }
    }

    open() {
        this.isOpen = true;
        this.updateSheetState();
    }

    close() {
        this.isOpen = false;
        this.isExpanded = false;
        this.updateSheetState();
    }

    expand() {
        this.isExpanded = true;
        this.updateSheetState();
        document.body.style.overflow = 'hidden';
    }

    collapse() {
        this.isExpanded = false;
        this.updateSheetState();
        document.body.style.overflow = '';
    }

    updateSheetState() {
        const sheet = this.shadowRoot?.querySelector('.player-sheet');
        const miniPlayer = this.shadowRoot?.querySelector('.mini-player-container');
        const fullPlayer = this.shadowRoot?.querySelector('.full-player');

        if (sheet) {
            sheet.classList.toggle('visible', this.isOpen);
            sheet.classList.toggle('expanded', this.isExpanded);

            if (!this.isOpen) {
                sheet.style.transform = 'translateY(100%)';
            } else if (this.isExpanded) {
                sheet.style.transform = 'translateY(0)';
            } else {
                sheet.style.transform = `translateY(calc(100% - ${this.miniPlayerHeight}px))`;
            }
        }

        if (miniPlayer) {
            miniPlayer.style.display = this.isExpanded ? 'none' : 'block';
        }

        if (fullPlayer) {
            fullPlayer.style.display = this.isExpanded ? 'flex' : 'none';
        }
    }

    handleCollapse() {
        this.collapse();
    }

    render() {
        const state = audio.getState();
        const trackTitle = state.currentTrack?.title || '-';

        this.shadowRoot.innerHTML = `
            <style>
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
                    transform: translateY(calc(100% - ${this.miniPlayerHeight}px));
                }

                .player-sheet.expanded {
                    transform: translateY(0);
                }

                .mini-player-container {
                    display: block;
                }

                .full-player {
                    display: none;
                    flex-direction: column;
                    height: 100%;
                    padding: 0 1rem 1rem;
                    box-sizing: border-box;
                    overflow: hidden;
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

                .header__actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
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
            </style>

            <div class="player-sheet">
                <!-- Mini Player (collapsed state) -->
                <div class="mini-player-container">
                    <mini-player></mini-player>
                </div>

                <!-- Full Player (expanded state) -->
                <div class="full-player">
                    <!-- Drag zone: swipe down anywhere in this area to collapse -->
                    <div class="drag-zone">
                        <div class="drag-handle-container">
                            <div class="drag-handle"></div>
                        </div>

                        <header class="header">
                            <h1 class="header__title">${t('player.playlist')}</h1>
                            <button class="collapse-btn" aria-label="Collapse">
                                ${ICON_CHEVRON_DOWN}
                            </button>
                        </header>

                        <div class="visualization">
                            <tape-canvas></tape-canvas>
                        </div>
                    </div>

                    <div class="now-playing">
                        <p class="now-playing__label">${t('player.nowPlaying')}</p>
                        <h2 class="now-playing__title">${trackTitle}</h2>
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

        // Attach drag handlers
        this.attachDragHandlers();

        // Collapse button
        const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
        collapseBtn?.addEventListener('click', () => this.handleCollapse());

        // Update state
        this.updateSheetState();
    }
}

customElements.define('player-sheet', PlayerSheet);

export default PlayerSheet;
