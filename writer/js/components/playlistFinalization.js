// js/components/playlistFinalization.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { EncryptionService } from '../services/encryptionService.js';
import { StorageService } from '../services/storageService.js';
import { MessageDb } from '../services/messageDb.js';
import { urlParser } from '../utils/urlParser.js';
import './writerResults.js';

class PlaylistFinalization extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Services
        this.db = new MessageDb();
        this.encryptionService = new EncryptionService();
        this.storageService = null;
        
        // State
        this.currentPlaylistClips = [];
        this.currentPlaylistName = '';
        this.currentPlaylistId = null;
        this.currentTagSerial = null;
        
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; padding: 1rem; }
                .processing-container {
                    text-align: center;
                    max-width: 500px;
                    margin: 0 auto;
                }
                .process-status {
                    padding: 1.5rem;
                    border-radius: 0.5rem;
                    background-color: var(--info-bg);
                    color: var(--info-text);
                    margin: 1rem 0;
                    font-size: 1.1rem;
                }
                .process-status.error {
                    background-color: var(--error-bg);
                    color: var(--error-text);
                }
                .progress-info {
                    color: var(--secondary-color);
                    font-size: 0.9rem;
                    margin-top: 0.5rem;
                }
                .btn {
                    padding: 0.75rem 1.5rem;
                    font-weight: 700;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    border: none;
                    transition: background-color 0.3s ease;
                }
                .btn-secondary {
                    background-color: #e5e7eb;
                    color: #1f2937;
                }
                .btn-secondary:hover {
                    background-color: #d1d5db;
                }
                .hidden { display: none; }
            </style>
            
            <div id="processing-view" class="processing-container">
                <h3>Finalizing Playlist</h3>
                <div id="process-status" class="process-status">
                    <p id="status-message">Preparing to finalize playlist...</p>
                    <div id="progress-info" class="progress-info hidden">
                        <span id="progress-text"></span>
                    </div>
                </div>
                <button id="cancel-btn" class="btn btn-secondary hidden">Cancel</button>
            </div>
            
            <writer-results id="results-view" class="hidden"></writer-results>
        `;
    }

    setupEventListeners() {
        // Listen for serial number from modal
        eventBus.subscribe('serial-received', (serial) => {
            this.handleSerialReceived(serial);
        });

        // Cancel button
        this.shadowRoot.querySelector('#cancel-btn').addEventListener('click', () => {
            this.handleCancel();
        });

        // From results view
        eventBus.subscribe('navigate-to-home', () => {
            eventBus.publish('back-to-home');
        });
    }

    // Public method to start finalization
    async startFinalization(playlistData, storageService) {
        this.currentPlaylistClips = playlistData.clips || [];
        this.currentPlaylistName = playlistData.name || 'Untitled Playlist';
        this.currentPlaylistId = playlistData.id || null;
        this.storageService = storageService;

        if (this.currentPlaylistClips.length === 0) {
            this.showError('Cannot finalize an empty playlist. Please add some audio clips.');
            return;
        }

        if (!this.storageService) {
            this.showError('Storage service not available. Please check your API credentials.');
            return;
        }

        // Request serial number via modal
        this.updateStatus(`Ready to finalize "${this.currentPlaylistName}"`);
        eventBus.publish('show-serial-modal');
    }

    async handleSerialReceived(serial) {
        this.currentTagSerial = serial;
        eventBus.publish('hide-serial-modal');
        
        // Start the finalization process
        await this.runFinalization();
    }

    async runFinalization() {
        const statusEl = this.shadowRoot.querySelector('#status-message');
        const progressEl = this.shadowRoot.querySelector('#progress-info');
        const progressTextEl = this.shadowRoot.querySelector('#progress-text');
        
        try {
            this.updateStatus(`Starting finalization for "${this.currentPlaylistName}"`);
            progressEl.classList.remove('hidden');

            // Create playlist manifest
            const playlistManifest = { 
                version: 'playlist-v1', 
                messages: [] 
            };

            // Process each audio clip
            for (let i = 0; i < this.currentPlaylistClips.length; i++) {
                const message = this.currentPlaylistClips[i];
                
                progressTextEl.textContent = `Processing clip ${i + 1} of ${this.currentPlaylistClips.length}: "${message.title}"`;
                
                try {
                    const timestamp = Date.now();
                    const encryptionKey = await this.encryptionService.deriveEncryptionKey(this.currentTagSerial, timestamp);
                    const audioBuffer = await message.audioBlob.arrayBuffer();
                    const encryptedAudio = await this.encryptionService.encryptDataToBinary(audioBuffer, encryptionKey);
                    
                    const messagePackage = {
                        messageId: `PBB-${message.id}`,
                        timestamp: timestamp,
                        encryptedAudio: this.encryptionService.binToBase64(encryptedAudio),
                        metadata: { title: message.title }
                    };
                    
                    const ipfsHash = await this.storageService.uploadMessagePackage(messagePackage);
                    playlistManifest.messages.push({ 
                        messageId: messagePackage.messageId, 
                        ipfsHash: ipfsHash 
                    });
                    
                    log(`Uploaded clip "${message.title}" (ID: ${message.id})`, 'success');
                    
                } catch (err) {
                    log(`Failed to process message "${message.title}": ${err.message}`, 'error');
                    throw new Error(`Failed to upload clip "${message.title}". Please check your internet connection and Pinata credentials.`);
                }
            }
            
            // Upload final manifest
            if (playlistManifest.messages.length > 0) {
                this.updateStatus('All clips uploaded. Creating final playlist manifest...');
                
                const finalManifestHash = await this.storageService.uploadMessagePackage(playlistManifest);
                const finalNfcUrl = urlParser.createSecureNfcUrl({ playlistHash: finalManifestHash });
                
                // Save to database
                const audioClipIds = this.currentPlaylistClips.map(c => c.id);
                await this.db.saveFinalizedPlaylist(
                    this.currentPlaylistName, 
                    finalManifestHash, 
                    this.currentTagSerial, 
                    audioClipIds
                );
                
                log(`Playlist "${this.currentPlaylistName}" finalized and saved.`, 'success');
                
                // Show results
                this.showResults(finalNfcUrl);
                
            } else {
                throw new Error('No clips were successfully processed.');
            }
            
        } catch (err) {
            log(`Finalization failed: ${err.message}`, 'error');
            this.showError(err.message || 'An error occurred during finalization.');
        }
    }

    showResults(nfcUrl) {
        const processingView = this.shadowRoot.querySelector('#processing-view');
        const resultsView = this.shadowRoot.querySelector('#results-view');
        
        processingView.classList.add('hidden');
        resultsView.classList.remove('hidden');
        
        // Configure results component
        resultsView.setResults({
            url: nfcUrl,
            serial: this.currentTagSerial,
            playlistName: this.currentPlaylistName
        });
    }

    updateStatus(message) {
        const statusEl = this.shadowRoot.querySelector('#status-message');
        statusEl.textContent = message;
    }

    showError(message) {
        const statusEl = this.shadowRoot.querySelector('#process-status');
        statusEl.className = 'process-status error';
        statusEl.querySelector('#status-message').textContent = message;
        
        const progressEl = this.shadowRoot.querySelector('#progress-info');
        progressEl.classList.add('hidden');
        
        // Show cancel/back button
        const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
        cancelBtn.classList.remove('hidden');
        cancelBtn.textContent = 'Back to Playlist';
    }

    handleCancel() {
        eventBus.publish('back-to-home');
    }

    // Reset component state
    reset() {
        const processingView = this.shadowRoot.querySelector('#processing-view');
        const resultsView = this.shadowRoot.querySelector('#results-view');
        const statusEl = this.shadowRoot.querySelector('#process-status');
        const progressEl = this.shadowRoot.querySelector('#progress-info');
        const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
        
        processingView.classList.remove('hidden');
        resultsView.classList.add('hidden');
        statusEl.className = 'process-status';
        progressEl.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        
        this.currentPlaylistClips = [];
        this.currentPlaylistName = '';
        this.currentPlaylistId = null;
        this.currentTagSerial = null;
    }
}

customElements.define('playlist-finalization', PlaylistFinalization);