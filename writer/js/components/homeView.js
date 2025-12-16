// js/components/homeView.js - Mobile-Friendly

import { eventBus } from '../services/eventBus.js';
import { log } from '../utils/log.js';
import './playlistsView.js';
import './ui/fab.js';

class HomeViewComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: block; 
                    padding: 1rem;
                    height: 100%;
                }
                
                .home-container { 
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .welcome-section {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }
                
                .welcome-section h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.5rem;
                    color: #1f2937;
                }
                
                .welcome-section p {
                    margin: 0;
                    color: var(--secondary-color);
                }
                
                /* Mobile-first action grid */
                .action-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .action-card {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    text-align: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    /* Better touch target */
                    min-height: 100px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                
                .action-card:active {
                    background: #f3f4f6;
                    transform: scale(0.98);
                    border-color: var(--primary-color);
                }
                
                .action-card h3 {
                    margin: 0.5rem 0;
                    color: #374151;
                    font-size: 1.125rem;
                }
                
                .action-card p {
                    margin: 0;
                    color: var(--secondary-color);
                    font-size: 0.875rem;
                    line-height: 1.4;
                }
                
                .action-icon {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }
                
                .playlists-section {
                    flex: 1;
                    min-height: 0; /* Allow scrolling */
                }
                
                /* Tablet and up: grid layout */
                @media (min-width: 640px) {
                    .action-grid {
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    }
                }
                
                /* Hover effects only on non-touch devices */
                @media (hover: hover) {
                    .action-card:hover {
                        border-color: var(--primary-color);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                }
            </style>
            
            <div class="home-container">
                <section class="welcome-section">
                    <h2>Welcome to Pebbble Writer</h2>
                    <p>What would you like to do?</p>
                </section>
                
                <section class="action-grid">
                    <article class="action-card" id="new-playlist-card">
                        <div class="action-icon">📋</div>
                        <h3>Create Playlist</h3>
                        <p>Build a new playlist with voice recordings and music</p>
                    </article>
                    
                    <article class="action-card" id="new-recording-card">
                        <div class="action-icon">🎤</div>
                        <h3>Record Audio</h3>
                        <p>Create a new voice recording or upload music</p>
                    </article>
                    
                    <article class="action-card" id="audio-library-card">
                        <div class="action-icon">🎵</div>
                        <h3>Audio Library</h3>
                        <p>Manage and organize all your audio clips</p>
                    </article>
                </section>
                
                <section class="playlists-section">
                    <playlists-view></playlists-view>
                </section>
            </div>
            
            <fab-component></fab-component>
        `;
    }

    setupEventListeners() {
        // Action cards
        this.shadowRoot.querySelector('#new-playlist-card').addEventListener('click', () => {
            log('Creating a new playlist...', 'info');
            eventBus.publish('new-playlist-requested');
        });
        
        this.shadowRoot.querySelector('#new-recording-card').addEventListener('click', () => {
            log('Creating a new recording...', 'info');
            eventBus.publish('new-recording-requested');
        });
        
        this.shadowRoot.querySelector('#audio-library-card').addEventListener('click', () => {
            log('Opening audio library...', 'info');
            eventBus.publish('open-audio-library');
        });
    }
}

customElements.define('home-view', HomeViewComponent);