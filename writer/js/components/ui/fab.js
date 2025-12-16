// js/components/ui/fab.js
// FIXED: Your original logic with mobile-friendly styles

import { eventBus } from '../../services/eventBus.js';
import { appState } from '../../services/appState.js';

class FabComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isMenuOpen = false;
        this.render();
        this.setupEventListeners();
        this.setupAppStateSubscription();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    z-index: 10;
                    display: none; /* The FAB is now hidden by default */
                }
                .fab-menu-container {
                    display: none;
                    flex-direction: column;
                    align-items: flex-end;
                    transition: all 0.3s ease;
                }
                .fab-menu-container.open {
                    display: flex;
                }
                .fab-btn {
                    width: 3.5rem;
                    height: 3.5rem;
                    border-radius: 9999px;
                    background-color: var(--primary-color);
                    color: white;
                    font-size: 1.5rem;
                    line-height: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s ease;
                    order: 2; /* FAB goes to bottom */
                    /* Disable text selection */
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .fab-btn:active {
                    transform: scale(0.95);
                }
                .menu-option {
                    font-size: 0.875rem;
                    padding: 0.75rem 1rem;
                    color: #374151;
                    background-color: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    margin-bottom: 0.75rem;
                    display: none;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                    cursor: pointer;
                    white-space: nowrap;
                    order: 1; /* Menu items go to top */
                    /* Disable text selection */
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .menu-option.visible {
                    display: block;
                    opacity: 1;
                    transform: translateX(0);
                    pointer-events: auto;
                }
                .menu-option:active {
                    background-color: #f3f4f6;
                    transform: scale(0.95);
                }
                .main-fab {
                    background-color: var(--primary-color);
                }
                
                /* Tablet and up */
                @media (min-width: 768px) {
                    :host {
                        bottom: 2rem;
                        right: 2rem;
                    }
                    .fab-btn {
                        width: 4rem;
                        height: 4rem;
                        font-size: 2.5rem;
                    }
                    .menu-option {
                        font-size: 1rem;
                        padding: 0.5rem 1rem;
                        margin-bottom: 0.5rem;
                    }
                    .fab-btn:hover {
                        transform: scale(1.1);
                    }
                    .menu-option:hover {
                        background-color: #f9fafb;
                        border-color: var(--primary-color);
                    }
                }
            </style>
            <div class="fab-menu-container" id="fab-menu-container">
                <button class="menu-option" id="new-recording-btn">New Recording</button>
                <button class="menu-option" id="new-playlist-btn">New Playlist</button>
                <button class="fab-btn main-fab" id="main-fab">+</button>
            </div>
        `;
    }
    
    // EXACT copy from your original fab.js
    setupEventListeners() {
        const mainFab = this.shadowRoot.querySelector('#main-fab');
        const newRecordingBtn = this.shadowRoot.querySelector('#new-recording-btn');
        const newPlaylistBtn = this.shadowRoot.querySelector('#new-playlist-btn');

        mainFab.addEventListener('click', () => {
            this.toggleMenu();
        });

        newRecordingBtn.addEventListener('click', () => {
            eventBus.publish('new-recording-requested');
            this.toggleMenu();
        });
        
        newPlaylistBtn.addEventListener('click', () => {
            eventBus.publish('new-playlist-requested');
            this.toggleMenu();
        });
    }

    // Your original appState integration
    setupAppStateSubscription() {
        appState.subscribe('currentView', (newView) => {
            const container = this.shadowRoot.querySelector('#fab-menu-container');
            if (newView === 'homeView') {
                container.style.display = 'flex';
                this.style.display = 'block';
            } else {
                container.style.display = 'none';
                this.isMenuOpen = false;
                this.toggleMenu(false);
                this.style.display = 'none';
            }
        });
    }

    // EXACT copy from your original fab.js
    toggleMenu(forceState = null) {
        this.isMenuOpen = forceState !== null ? forceState : !this.isMenuOpen;
        const container = this.shadowRoot.querySelector('#fab-menu-container');
        const options = this.shadowRoot.querySelectorAll('.menu-option');

        if (this.isMenuOpen) {
            container.classList.add('open');
            options.forEach(option => option.classList.add('visible'));
            this.shadowRoot.querySelector('#main-fab').textContent = '×';
        } else {
            container.classList.remove('open');
            options.forEach(option => option.classList.remove('visible'));
            this.shadowRoot.querySelector('#main-fab').textContent = '+';
        }
    }
}
customElements.define('fab-component', FabComponent);