// js/components/audioLibrary.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { MessageDb } from '../services/messageDb.js';
import './ui/audioPreview.js';

class AudioLibrary extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.db = new MessageDb();
        this.audioClips = [];
        
        this.render();
        this.setupEventListeners();
        this.loadAudioClips();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: block; 
                    padding: 1rem; 
                    height: 100%;
                }
                .audio-library {
                    max-width: 800px;
                    margin: 0 auto;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .header {
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #e5e7eb;
                }
                .library-stats {
                    color: var(--secondary-color);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
                .clips-container {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 0.5rem; /* Space for scrollbar */
                }
                .empty-state {
                    text-align: center;
                    color: var(--secondary-color);
                    font-style: italic;
                    padding: 4rem 2rem;
                    background: #f9fafb;
                    border-radius: 0.75rem;
                    border: 2px dashed #d1d5db;
                }
                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                .back-section {
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
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
                .btn-primary {
                    background-color: var(--primary-color);
                    color: #ffffff;
                }
                .btn-primary:hover {
                    background-color: var(--button-hover);
                }
                
                /* Custom scrollbar for clips container */
                .clips-container::-webkit-scrollbar {
                    width: 8px;
                }
                .clips-container::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .clips-container::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }
                .clips-container::-webkit-scrollbar-thumb:hover {
                    background: #a1a1a1;
                }
                
                /* Loading state */
                .loading {
                    text-align: center;
                    padding: 2rem;
                    color: var(--secondary-color);
                }
            </style>
            
            <div class="audio-library">
                <div class="header">
                    <h2>Audio Library</h2>
                    <p>Manage all your recorded audio clips</p>
                    <div class="library-stats" id="library-stats">
                        Loading...
                    </div>
                </div>
                
                <div class="clips-container" id="clips-container">
                    <div class="loading">Loading your audio clips...</div>
                </div>
                
                <div class="back-section">
                    <button id="add-recording-btn" class="btn btn-primary" style="margin-right: 1rem;">
                        Add New Recording
                    </button>
                    <button id="back-to-home-btn" class="btn btn-secondary">
                        Back to Home
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Handle delete events from audio preview components
        this.shadowRoot.addEventListener('clip-delete', async (e) => {
            await this.handleDeleteClip(parseInt(e.detail.clipId));
        });

        // Navigation buttons
        this.shadowRoot.querySelector('#back-to-home-btn').addEventListener('click', () => {
            eventBus.publish('back-to-home');
        });

        this.shadowRoot.querySelector('#add-recording-btn').addEventListener('click', () => {
            eventBus.publish('new-recording-requested');
        });

        // Listen for new audio clips being created
        eventBus.subscribe('audio-recorded', () => {
            this.loadAudioClips(); // Refresh the list
        });
    }

    async loadAudioClips() {
        try {
            this.audioClips = await this.db.getAllAudioClips();
            this.renderClips();
            this.updateStats();
            log(`Loaded ${this.audioClips.length} audio clips`, 'info');
        } catch (error) {
            log(`Failed to load audio clips: ${error.message}`, 'error');
            this.showError('Failed to load audio clips');
        }
    }

    renderClips() {
        const container = this.shadowRoot.querySelector('#clips-container');
        
        if (this.audioClips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎵</div>
                    <h3>No Audio Clips Yet</h3>
                    <p>Your audio library is empty. Create your first recording to get started!</p>
                </div>
            `;
            return;
        }

        // Sort clips by timestamp (newest first)
        const sortedClips = [...this.audioClips].sort((a, b) => b.timestamp - a.timestamp);
        
        container.innerHTML = '';
        
        sortedClips.forEach(clip => {
            const audioPreview = document.createElement('audio-preview');
            audioPreview.setAttribute('clip-id', clip.id.toString());
            audioPreview.setAttribute('title', clip.title);
            audioPreview.setAttribute('duration', this.formatDuration(clip.duration));
            audioPreview.setAttribute('layout', 'library');
            audioPreview.setAudioBlob(clip.audioBlob);
            
            container.appendChild(audioPreview);
        });
    }

    updateStats() {
        const statsEl = this.shadowRoot.querySelector('#library-stats');
        const totalClips = this.audioClips.length;
        const totalDuration = this.audioClips.reduce((sum, clip) => sum + (clip.duration || 0), 0);
        
        if (totalClips === 0) {
            statsEl.textContent = 'No clips in library';
        } else {
            const totalDurationText = this.formatDuration(totalDuration);
            statsEl.textContent = `${totalClips} clip${totalClips === 1 ? '' : 's'} • Total duration: ${totalDurationText}`;
        }
    }

    async handleDeleteClip(clipId) {
        try {
            // Find the clip to show confirmation
            const clipToDelete = this.audioClips.find(clip => clip.id === clipId);
            if (!clipToDelete) {
                log('Clip not found', 'warning');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete "${clipToDelete.title}"?\n\nThis action cannot be undone.`);
            if (!confirmed) {
                return;
            }

            // Stop audio if this clip is currently playing
            eventBus.publish('stop-audio');

            // Delete from database
            await this.db.deleteAudioClip(clipId);
            
            // Remove from local array
            this.audioClips = this.audioClips.filter(clip => clip.id !== clipId);
            
            // Update UI
            this.renderClips();
            this.updateStats();
            
            log(`Audio clip "${clipToDelete.title}" deleted`, 'success');
            
        } catch (error) {
            log(`Failed to delete audio clip: ${error.message}`, 'error');
        }
    }

    showError(message) {
        const container = this.shadowRoot.querySelector('#clips-container');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    formatDuration(seconds) {
        if (isNaN(seconds) || seconds === Infinity || !seconds) {
            return '0:00';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        } else {
            return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
        }
    }

    // Public method to refresh the library (called when navigating to this view)
    refresh() {
        this.loadAudioClips();
    }

    // Public method to get library stats
    getStats() {
        return {
            totalClips: this.audioClips.length,
            totalDuration: this.audioClips.reduce((sum, clip) => sum + (clip.duration || 0), 0)
        };
    }
}

customElements.define('audio-library', AudioLibrary);