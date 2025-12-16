// js/services/audioPlayerService.js
// Simple, bulletproof audio service

import { eventBus } from './eventBus.js';
import { log } from '../utils/log.js';

class AudioPlayerService {
    constructor() {
        this.audioElement = new Audio();
        this.currentUrl = null;
        this.currentPlayingId = null;
        
        this.setupEventListeners();
        this.startStateMonitor();
    }

    setupEventListeners() {
        // Handle audio ending naturally
        this.audioElement.addEventListener('ended', () => {
            log('Audio playback ended.', 'info');
            const endedId = this.currentPlayingId;
            this.currentPlayingId = null;
            
            if (endedId) {
                eventBus.publish('audio-state-changed', { 
                    id: endedId, 
                    isPlaying: false 
                });
            }
        });

        // Handle play requests
        eventBus.subscribe('play-audio', (data) => {
            this.play(data.id, data.audioBlob);
        });

        // Handle pause requests  
        eventBus.subscribe('pause-audio', (data) => {
            if (this.currentPlayingId === data.id) {
                this.pause();
            }
        });

        // Handle stop requests
        eventBus.subscribe('stop-audio', () => {
            this.stop();
        });

        // Stop on navigation
        eventBus.subscribe('back-to-home', () => this.stop());
        eventBus.subscribe('new-playlist-requested', () => this.stop());
        eventBus.subscribe('new-recording-requested', () => this.stop());
        eventBus.subscribe('open-playlist', () => this.stop());
    }

    // Monitor actual audio state and sync components
    startStateMonitor() {
        setInterval(() => {
            if (this.currentPlayingId) {
                const actuallyPlaying = !this.audioElement.paused && !this.audioElement.ended;
                
                // If we think something is playing but it's not, fix it
                if (!actuallyPlaying) {
                    const stoppedId = this.currentPlayingId;
                    this.currentPlayingId = null;
                    
                    eventBus.publish('audio-state-changed', { 
                        id: stoppedId, 
                        isPlaying: false 
                    });
                }
            }
        }, 500); // Check twice per second
    }

    play(id, audioBlob) {
        if (!audioBlob) {
            log('No audio data to play.', 'warning');
            return;
        }

        // If same track is playing, pause it
        if (this.currentPlayingId === id && !this.audioElement.paused) {
            this.pause();
            return;
        }

        // Stop any currently playing track
        const previousId = this.currentPlayingId;
        if (previousId && previousId !== id) {
            this.audioElement.pause();
            eventBus.publish('audio-state-changed', { 
                id: previousId, 
                isPlaying: false 
            });
        }

        // Clean up old URL
        if (this.currentUrl) {
            URL.revokeObjectURL(this.currentUrl);
        }

        // Setup new audio
        this.currentUrl = URL.createObjectURL(audioBlob);
        this.audioElement.src = this.currentUrl;
        this.currentPlayingId = id;

        // Play it
        this.audioElement.play()
            .then(() => {
                log(`Started playing audio ID: ${id}`, 'info');
                eventBus.publish('audio-state-changed', { 
                    id: id, 
                    isPlaying: true 
                });
            })
            .catch(error => {
                log(`Failed to play audio: ${error.message}`, 'error');
                this.currentPlayingId = null;
                eventBus.publish('audio-state-changed', { 
                    id: id, 
                    isPlaying: false 
                });
            });
    }

    pause() {
        if (this.currentPlayingId && !this.audioElement.paused) {
            const pausedId = this.currentPlayingId;
            this.audioElement.pause();
            this.currentPlayingId = null;
            
            log('Audio playback paused.', 'info');
            eventBus.publish('audio-state-changed', { 
                id: pausedId, 
                isPlaying: false 
            });
        }
    }

    stop() {
        if (this.currentPlayingId) {
            const stoppedId = this.currentPlayingId;
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.currentPlayingId = null;
            
            eventBus.publish('audio-state-changed', { 
                id: stoppedId, 
                isPlaying: false 
            });
        }
        log('Audio playback stopped.', 'info');
    }

    // Public method to check if specific track is playing
    isPlaying(id) {
        return this.currentPlayingId === id && 
               !this.audioElement.paused && 
               !this.audioElement.ended;
    }

    // Public method to get current playing ID
    getCurrentlyPlaying() {
        return this.currentPlayingId;
    }
}

export const audioPlayerService = new AudioPlayerService();