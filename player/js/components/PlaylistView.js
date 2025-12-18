/**
 * PlaylistView - Displays the list of tracks with their availability status
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';
import { t } from '../services/I18nService.js';
import { LockStatus } from '../services/DateLockService.js';
import { formatTime } from '../utils/formatters.js';
import { ICON_LOCK, ICON_CLOCK } from '../utils/icons.js';

class PlaylistView extends LitElement {
    static properties = {
        tracks: { state: true },
        currentIndex: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            margin-top: 1rem;
            flex-shrink: 0;
        }

        .playlist-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .playlist-title {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-muted, #666);
        }

        .track-count {
            font-size: 0.75rem;
            color: var(--color-text-muted, #666);
        }

        .track-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding-bottom: 2rem;
        }

        .track-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.875rem 1rem;
            background: var(--color-bg-elevated, #242424);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
        }

        .track-item:hover:not(.locked):not(.expired) {
            background: var(--color-surface, #333);
        }

        .track-item.active {
            background: var(--color-accent-muted, rgba(255, 77, 0, 0.15));
            border-color: var(--color-accent, #FF4D00);
        }

        .track-item.locked,
        .track-item.expired {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .track-index {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--color-text-muted, #666);
            flex-shrink: 0;
        }

        .track-item.active .track-index {
            color: var(--color-accent, #FF4D00);
        }

        .playing-indicator {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 16px;
        }

        .playing-bar {
            width: 3px;
            background: var(--color-accent, #FF4D00);
            border-radius: 2px;
            animation: wave 0.8s ease-in-out infinite;
        }

        .playing-bar:nth-child(1) { height: 60%; animation-delay: 0s; }
        .playing-bar:nth-child(2) { height: 100%; animation-delay: 0.1s; }
        .playing-bar:nth-child(3) { height: 40%; animation-delay: 0.2s; }

        @keyframes wave {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.5); }
        }

        .track-info {
            flex: 1;
            min-width: 0;
        }

        .track-title {
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--color-text-primary, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-meta {
            font-size: 0.8rem;
            color: var(--color-text-muted, #666);
            margin-top: 0.25rem;
        }

        .track-duration {
            font-size: 0.8rem;
            color: var(--color-text-muted, #666);
            font-variant-numeric: tabular-nums;
            flex-shrink: 0;
        }

        .lock-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .lock-icon svg {
            width: 16px;
            height: 16px;
        }

        .lock-icon.locked { color: var(--color-warning, #eab308); }
        .lock-icon.expired { color: var(--color-text-muted, #666); }

        .empty-state {
            text-align: center;
            padding: 2rem;
            color: var(--color-text-muted, #666);
        }
    `;

    constructor() {
        super();
        this.tracks = [];
        this.currentIndex = 0;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();

        const state = audio.getState();
        if (state.playlistLength > 0) {
            this.tracks = audio.playlist;
            this.currentIndex = state.currentIndex;
        }

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                this.currentIndex = data.index;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYLIST_LOADED, (data) => {
                this.tracks = data.tracks;
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    handleTrackClick(index) {
        const track = this.tracks[index];

        if (track.lockInfo && track.lockInfo.status !== LockStatus.UNLOCKED) {
            return;
        }

        audio.playTrack(index);
    }

    renderTrackIndex(track, index) {
        const isActive = index === this.currentIndex;

        if (isActive) {
            return html`
                <div class="playing-indicator">
                    <div class="playing-bar"></div>
                    <div class="playing-bar"></div>
                    <div class="playing-bar"></div>
                </div>
            `;
        }
        return index + 1;
    }

    renderTrack(track, index) {
        const isActive = index === this.currentIndex;
        const lockInfo = track.lockInfo || { status: LockStatus.UNLOCKED };
        const isLocked = lockInfo.status === LockStatus.LOCKED;
        const isExpired = lockInfo.status === LockStatus.EXPIRED;

        let statusClass = '';
        if (isActive) statusClass = 'active';
        else if (isLocked) statusClass = 'locked';
        else if (isExpired) statusClass = 'expired';

        return html`
            <div class="track-item ${statusClass}" @click=${() => this.handleTrackClick(index)}>
                <div class="track-index">
                    ${this.renderTrackIndex(track, index)}
                </div>

                <div class="track-info">
                    <div class="track-title">${track.title}</div>
                    ${lockInfo.message ? html`<div class="track-meta">${lockInfo.message}</div>` : ''}
                </div>

                ${isLocked ? html`<span class="lock-icon locked">${unsafeHTML(ICON_LOCK)}</span>` : ''}
                ${isExpired ? html`<span class="lock-icon expired">${unsafeHTML(ICON_CLOCK)}</span>` : ''}

                ${!isLocked && !isExpired ? html`
                    <span class="track-duration">${formatTime(track.duration)}</span>
                ` : ''}
            </div>
        `;
    }

    render() {
        return html`
            <div class="playlist-header">
                <span class="playlist-title">${t('player.playlist')}</span>
                <span class="track-count">${this.tracks.length} ${this.tracks.length === 1 ? 'track' : 'tracks'}</span>
            </div>

            <div class="track-list">
                ${this.tracks.length === 0
                    ? html`<div class="empty-state">No tracks available</div>`
                    : this.tracks.map((track, index) => this.renderTrack(track, index))
                }
            </div>
        `;
    }
}

customElements.define('playlist-view', PlaylistView);

export default PlaylistView;
