// components/playlistsView.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { MessageDb } from '../services/messageDb.js';

class PlaylistsViewComponent extends HTMLElement {
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
                .playlist-item-card {
                    background-color: #eef2ff;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    min-width: 150px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .playlist-item-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .playlist-card-container {
                    display: flex;
                    gap: 1rem;
                    overflow-x: auto;
                    padding-bottom: 1rem;
                    margin-top: 1rem;
                }
                .no-playlists-message {
                    text-align: center;
                    font-style: italic;
                    color: var(--secondary-color);
                    margin-top: 2rem;
                }
            </style>
            <div class="playlist-manager-container">
                <h3>Saved Playlists</h3>
                <div id="content-container"></div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.querySelector('#content-container').addEventListener('click', async (event) => {
            if (event.target.closest('.playlist-item-card')) {
                const playlistId = event.target.closest('.playlist-item-card').dataset.id;
                const playlist = await this.db.getPlaylistById(playlistId);
                eventBus.publish('open-playlist', { playlist });
            }
        });
    }

    async loadPlaylists() {
        const playlists = await this.db.getPlaylists();
        const container = this.shadowRoot.querySelector('#content-container');
        
        container.innerHTML = ''; // Clear existing content

        if (playlists.length === 0) {
            container.innerHTML = `
                <p class="no-playlists-message">You have not created any playlists yet. Start by creating a new playlist.</p>
            `;
        } else {
            const playlistCardContainer = document.createElement('div');
            playlistCardContainer.className = 'playlist-card-container';
            playlists.forEach(p => {
                const card = document.createElement('div');
                card.className = 'playlist-item-card';
                card.dataset.id = p.id;
                card.innerHTML = `
                    <h4>${p.name}</h4>
                    <p>${new Date(p.timestamp).toLocaleDateString()}</p>
                `;
                playlistCardContainer.appendChild(card);
            });
            container.appendChild(playlistCardContainer);
        }
    }
}
customElements.define('playlists-view', PlaylistsViewComponent);