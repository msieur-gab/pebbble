// js/components/savedPlaylists.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { MessageDb } from '../services/messageDb.js';

class SavedPlaylists extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.db = new MessageDb();

        this.render();
        this.loadPlaylists();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .playlist-manager-container {
                    padding: 1rem;
                }
                .playlist-item {
                    background-color: #f9fafb;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    margin-bottom: 0.5rem;
                }
                .playlist-item button {
                    cursor: pointer;
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: bold;
                    margin-left: 1rem;
                }
                .playlist-item button.delete {
                    color: var(--accent-color);
                }
            </style>
            <div class="playlist-manager-container">
                <h3>Saved Playlists</h3>
                <div id="saved-playlists-container"></div>
                <button id="createNewBtn" class="btn btn-primary">Create New Playlist</button>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.querySelector('#createNewBtn').addEventListener('click', () => {
            eventBus.publish('new-playlist-requested');
        });

        this.shadowRoot.querySelector('#saved-playlists-container').addEventListener('click', async (event) => {
            if (event.target.classList.contains('load-playlist-btn')) {
                const playlistId = event.target.dataset.id;
                const playlist = await this.db.getFinalizedPlaylist(playlistId);
                eventBus.publish('load-playlist', { playlist });
            }
            if (event.target.classList.contains('delete-playlist-btn')) {
                const playlistId = event.target.dataset.id;
                await this.db.deleteFinalizedPlaylist(playlistId);
                this.loadPlaylists();
                log('Playlist deleted from local database.', 'info');
            }
        });
    }

    async loadPlaylists() {
        const playlists = await this.db.getFinalizedPlaylists();
        const container = this.shadowRoot.querySelector('#saved-playlists-container');
        if (playlists.length === 0) {
            container.innerHTML = '<p class="text-gray-400 italic">No playlists saved yet.</p>';
        } else {
            container.innerHTML = playlists.map(p => `
                <div class="playlist-item">
                    <span>${p.name}</span>
                    <div>
                        <button class="load-playlist-btn" data-id="${p.id}">Load</button>
                        <button class="delete-playlist-btn delete" data-id="${p.id}">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
}
customElements.define('saved-playlists', SavedPlaylists);