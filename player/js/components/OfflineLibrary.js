/**
 * OfflineLibrary - Shows cached playlists for offline playback
 */

import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { eventBus, Events } from '../services/EventBus.js';
import { storage } from '../services/StorageService.js';
import { t } from '../services/I18nService.js';
import { audio } from '../services/AudioService.js';
import { ICON_DELETE } from '../utils/icons.js';

class OfflineLibrary extends LitElement {
    static properties = {
        playlists: { state: true }
    };

    static styles = css`
        :host {
            display: block;
        }

        .library-section {
            margin-top: 2rem;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .section-stone {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2), 0 0 6px rgba(255, 77, 0, 0.2);
        }

        .section-title {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-muted, #666);
        }

        .playlist-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .playlist-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--color-bg-elevated, #242424);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
        }

        .playlist-item:hover {
            background: var(--color-surface, #333);
            border-color: var(--color-accent, #FF4D00);
        }

        .playlist-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--color-accent, #FF4D00) 0%, #cc3d00 50%, #993000 100%);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 10px rgba(255, 77, 0, 0.3);
            flex-shrink: 0;
        }

        .playlist-info {
            flex: 1;
            min-width: 0;
        }

        .playlist-name {
            font-size: 1rem;
            font-weight: 500;
            color: var(--color-text-primary, #fff);
            margin-bottom: 0.25rem;
        }

        .playlist-meta {
            font-size: 0.8rem;
            color: var(--color-text-muted, #666);
        }

        .playlist-actions {
            display: flex;
            align-items: center;
        }

        .delete-btn {
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            color: var(--color-text-muted, #666);
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .delete-btn:hover {
            background: rgba(255, 77, 0, 0.15);
            color: var(--color-accent, #FF4D00);
        }

        .delete-btn svg {
            width: 18px;
            height: 18px;
        }
    `;

    constructor() {
        super();
        this.playlists = [];
        this.unsubscribers = [];
    }

    async connectedCallback() {
        super.connectedCallback();

        await this.loadPlaylists();

        this.unsubscribers.push(
            eventBus.on(Events.STORAGE_READY, async () => {
                await this.loadPlaylists();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.LANGUAGE_CHANGE, () => {
                this.requestUpdate();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYLIST_LOADED, async () => {
                await this.loadPlaylists();
            })
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
    }

    async loadPlaylists() {
        this.playlists = await storage.getAllPlaylists();
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    }

    async handlePlaylistClick(playlist) {
        await audio.unlock();
        eventBus.emit(Events.OFFLINE_PLAYLIST_SELECT, {
            playlistHash: playlist.id,
            serial: playlist.serial
        });
    }

    async handleDelete(e, playlist) {
        e.stopPropagation();

        if (confirm(t('settings.clearConfirm'))) {
            await storage.deletePlaylist(playlist.id);
            await this.loadPlaylists();
        }
    }

    renderPlaylist(playlist, index) {
        const trackCount = playlist.manifest?.messages?.length || 0;
        const lastPlayed = this.formatDate(playlist.lastPlayed);

        return html`
            <div class="playlist-item" @click=${() => this.handlePlaylistClick(playlist)}>
                <div class="playlist-icon"></div>
                <div class="playlist-info">
                    <div class="playlist-name">Pebbble</div>
                    <div class="playlist-meta">
                        ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}
                        ${lastPlayed ? ` · ${lastPlayed}` : ''}
                    </div>
                </div>
                <div class="playlist-actions">
                    <button
                        class="delete-btn"
                        title="Delete"
                        @click=${(e) => this.handleDelete(e, playlist)}>
                        ${unsafeHTML(ICON_DELETE)}
                    </button>
                </div>
            </div>
        `;
    }

    render() {
        if (this.playlists.length === 0) {
            return html``;
        }

        return html`
            <div class="library-section">
                <div class="section-header">
                    <div class="section-stone"></div>
                    <span class="section-title">${t('storage.cached')}</span>
                </div>

                <div class="playlist-list">
                    ${this.playlists.map((playlist, index) => this.renderPlaylist(playlist, index))}
                </div>
            </div>
        `;
    }
}

customElements.define('offline-library', OfflineLibrary);

export default OfflineLibrary;
