// js/components/mainApp.js - Updated with Audio Library

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { appState } from '../services/appState.js';
import { MessageDb } from '../services/messageDb.js';
import { StorageService } from '../services/storageService.js';
import { audioPlayerService } from '../services/audioPlayerService.js';

// Import all components
import './apiSetupForm.js';
import './homeView.js';
import './playlistsView.js'; 
import './playlistCreator.js';      
import './audioCreator.js';
import './audioLibrary.js';          // NEW: Audio Library component
import './playlistFinalization.js';  
import './writerResults.js';         
import './serialModal.js';           
import './ui/toast.js';
import './ui/fab.js';
import './ui/audioPreview.js';

class MainApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Services
        this.db = new MessageDb();
        this.storageService = null;
        
        this.render();
        this.setupEventHandlers();
        this.setupStateSubscriptions();
        this.initializeApp();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; width: 100%; }
                .view { min-height: 400px; }
                .hidden { display: none !important; }
            </style>
            
            <!-- API Setup -->
            <div id="apiSetupForm" class="view hidden">
                <api-setup-form></api-setup-form>
            </div>
            
            <!-- Main App Views -->
            <div id="mainAppContainer" class="view hidden">
                <home-view class="view hidden" id="homeView"></home-view>
                <playlist-creator class="view hidden" id="playlistCreator"></playlist-creator>
                <audio-creator class="view hidden" id="audioCreator"></audio-creator>
                <audio-library class="view hidden" id="audioLibrary"></audio-library>
                <playlist-finalization class="view hidden" id="playlistFinalization"></playlist-finalization>
            </div>
            
            <!-- Global Components -->
            <toast-component></toast-component>
            <fab-component></fab-component>
            <serial-modal></serial-modal>
        `;
    }

    setupEventHandlers() {
        // API Setup
        eventBus.subscribe('credentials-set', (data) => {
            this.handleCredentialsSet(data);
        });
        
        // Navigation events
        eventBus.subscribe('new-playlist-requested', () => {
            appState.navigateTo('playlistCreator');
        });
        
        eventBus.subscribe('new-recording-requested', () => {
            appState.navigateTo('audioCreator');
        });

        // NEW: Audio library navigation
        eventBus.subscribe('open-audio-library', () => {
            appState.navigateTo('audioLibrary');
        });
        
        eventBus.subscribe('back-to-home', () => {
            appState.navigateTo('homeView');
        });

        eventBus.subscribe('open-playlist', (data) => {
            appState.set('pendingPlaylistData', data.playlist);
            appState.navigateTo('playlistCreator');
        });

        // Playlist operations
        eventBus.subscribe('save-playlist-requested', (data) => {
            this.handleSavePlaylist(data);
        });
        
        eventBus.subscribe('finalize-playlist-requested', () => {
            this.handleFinalizationRequest();
        });

        // Modal events
        eventBus.subscribe('show-serial-modal', () => {
            appState.navigateTo('serialModal');
        });

        eventBus.subscribe('hide-serial-modal', () => {
            if (appState.get('currentView') === 'serialModal') {
                appState.navigateTo('playlistFinalization');
            }
        });

        eventBus.subscribe('modal-close', () => {
            appState.navigateTo('playlistCreator');
        });
    }

    setupStateSubscriptions() {
        appState.subscribe('currentView', (newView) => {
            this.switchToView(newView);
        });
        
        appState.subscribe('apiCredentials', (credentials) => {
            if (credentials.isSet) {
                this.storageService = new StorageService(credentials.key, credentials.secret);
                log('Storage service initialized with credentials', 'success');
            }
        });
    }

    async initializeApp() {
        
        try {
            const apiKey = (await this.db.getSetting('apiKey'))?.value;
            const secret = (await this.db.getSetting('secret'))?.value;
            
            // console.log('📊 Credentials check:', { 
            //     hasApiKey: !!apiKey, 
            //     hasSecret: !!secret 
            // });
    
            if (apiKey && secret) {
                appState.setCredentials(apiKey, secret);
                appState.set('currentView', 'homeView');
                this.switchToView('homeView');  
            } else {
                appState.set('currentView', 'apiSetupForm');
                this.switchToView('apiSetupForm');  
            }
            
            log('MainApp initialized successfully', 'success');
        } catch (error) {
            appState.set('currentView', 'apiSetupForm');
            this.switchToView('apiSetupForm');  
        }
    }

    switchToView(viewName) {
        // console.log('🔄 switchToView called with:', viewName);  

        const views = this.shadowRoot.querySelectorAll('.view');
        views.forEach(view => view.classList.add('hidden'));
        
        const mainContainer = this.shadowRoot.querySelector('#mainAppContainer');
        const serialModal = this.shadowRoot.querySelector('serial-modal');
        
        if (viewName === 'serialModal') {
            serialModal.shadowRoot.querySelector('modal-component').open();
            return;
        } else {
            serialModal.shadowRoot.querySelector('modal-component').close();
        }
        
        let targetView = null;
        
        switch(viewName) {
            case 'apiSetupForm':
                targetView = this.shadowRoot.querySelector('#apiSetupForm');  // CORRECT ID
                break;
                
            case 'homeView':
            case 'playlistCreator':
            case 'audioCreator':
            case 'audioLibrary':           // NEW: Handle audio library view
            case 'playlistFinalization':
                mainContainer.classList.remove('hidden');
                targetView = this.shadowRoot.querySelector(`#${viewName}`);
                break;
                
            default:
                log(`Unknown view: ${viewName}`, 'warning');
                return;
        }
        
        if (targetView) {
            targetView.classList.remove('hidden');
            log(`Switched to view: ${viewName}`, 'info');
            this.setupViewData(viewName, targetView);
        }
    }

    setupViewData(viewName, viewElement) {
        switch(viewName) {
            case 'homeView':
                const playlistsView = viewElement.shadowRoot?.querySelector('playlists-view');
                if (playlistsView) {
                    playlistsView.loadPlaylists();
                }
                break;
                
            case 'playlistCreator':
                const pendingData = appState.get('pendingPlaylistData');
                viewElement.setPlaylistData(pendingData || null);
                appState.set('pendingPlaylistData', null);
                
                if (pendingData) {
                    log(`Opening playlist "${pendingData.name}" for editing.`, 'info');
                } else {
                    log('Starting a new playlist.', 'info');
                }
                break;

            // NEW: Refresh audio library when navigating to it
            case 'audioLibrary':
                viewElement.refresh();
                log('Opened audio library', 'info');
                break;
        }
    }

    async handleCredentialsSet({ apiKey, secret }) {
        try {
            await this.db.saveSetting('apiKey', apiKey);
            await this.db.saveSetting('secret', secret);
            
            appState.setCredentials(apiKey, secret);
            appState.update({
                currentView: 'homeView',
                showFab: true
            });
            
            appState.showToast('Credentials saved successfully!', 'success');
        } catch (error) {
            log('Failed to save credentials', 'error');
            appState.showToast('Failed to save credentials', 'error');
        }
    }

    async handleSavePlaylist(playlistData) {
        try {
            const playlist = {
                name: playlistData.name,
                description: playlistData.description,
                audioClipIds: playlistData.audioClipIds,
                timestamp: Date.now()
            };

            if (playlistData.id) {
                playlist.id = playlistData.id;
            }

            await this.db.savePlaylist(playlist);

            appState.update({
                currentView: 'homeView'
            });
            
            appState.showToast('Playlist saved!', 'success');
        } catch (error) {
            log(`Failed to save playlist: ${error.message}`, 'error');
            appState.showToast('Failed to save playlist', 'error');
        }
    }

    async handleFinalizationRequest() {
        const playlistCreator = this.shadowRoot.querySelector('#playlistCreator');
        
        const playlistData = {
            clips: playlistCreator.currentPlaylistClips,
            name: playlistCreator.shadowRoot.querySelector('#playlistTitle').value,
            id: playlistCreator.currentPlaylistId
        };

        appState.navigateTo('playlistFinalization');
        
        const finalizationComponent = this.shadowRoot.querySelector('#playlistFinalization');
        finalizationComponent.reset();
        finalizationComponent.startFinalization(playlistData, this.storageService);
    }
}

customElements.define('main-app', MainApp);