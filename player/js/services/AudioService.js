/**
 * AudioService - Audio playback management with Media Session API
 */

import { eventBus, Events } from './EventBus.js';

// Minimal silent MP3 data URI for unlocking audio playback
// This is a valid ~176 byte silent MP3 that satisfies browser autoplay requirements
const SILENT_MP3 = 'data:audio/mpeg;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQxBkAAADSAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

// Repeat modes
export const RepeatMode = {
    OFF: 'off',
    ONE: 'one',
    ALL: 'all'
};

class AudioService {
    constructor() {
        this.audio = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.repeatMode = RepeatMode.OFF;
        this.isPlaying = false;
        this.wakeLock = null;
        this.unlocked = false;

        // Bind methods for event listeners
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handleEnded = this.handleEnded.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize with audio element
     * @param {HTMLAudioElement} audioElement
     */
    init(audioElement) {
        this.audio = audioElement;

        // Set up event listeners
        this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
        this.audio.addEventListener('ended', this.handleEnded);
        this.audio.addEventListener('error', this.handleError);
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            eventBus.emit(Events.PLAY);
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            eventBus.emit(Events.PAUSE);
        });

        // Set up Media Session API if available
        this.setupMediaSession();

        // Listen for user interaction to unlock audio
        eventBus.on(Events.NFC_ACTIVATED, () => this.unlock());
        eventBus.on(Events.WELCOME_COMPLETE, () => this.unlock());
    }

    /**
     * Unlock audio playback (call on user interaction)
     * Browsers require user gesture before allowing audio.play()
     * Uses a silent MP3 to ensure the unlock works even with no source loaded
     * @returns {Promise<boolean>} True if unlock succeeded
     */
    async unlock() {
        if (this.unlocked) return true;

        // Store original source to restore after unlock
        const originalSrc = this.audio.src;

        try {
            // Set silent audio source - this is crucial for unlock to work
            this.audio.src = SILENT_MP3;

            // Play and immediately pause to unlock
            await this.audio.play();
            this.audio.pause();
            this.audio.currentTime = 0;
            this.unlocked = true;
            console.log('🔊 Audio unlocked');

            // Restore original source (if any)
            if (originalSrc && !originalSrc.startsWith('data:')) {
                this.audio.src = originalSrc;
            } else {
                this.audio.removeAttribute('src');
            }

            return true;
        } catch (error) {
            console.warn('AudioService: Unlock failed', error);
            return false;
        }
    }

    /**
     * Set up Media Session API for lock screen / notification controls
     */
    setupMediaSession() {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) {
                this.seek(details.seekTime);
            }
        });
    }

    /**
     * Update Media Session metadata
     * @param {Object} track - { title, artist, album, artwork }
     */
    updateMediaSession(track) {
        if (!('mediaSession' in navigator)) return;

        // Default artwork for lock screen display
        const defaultArtwork = [
            { src: '/assets/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/assets/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ];

        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Pebbble Message',
            artist: track.artist || 'Pebbble',
            album: track.album || 'Messages',
            artwork: track.artwork || defaultArtwork
        });
    }

    /**
     * Load a playlist of tracks
     * @param {Array} tracks - Array of { id, title, audioUrl, duration, ... }
     * @returns {Promise} Resolves when first track is ready
     */
    async loadPlaylist(tracks) {
        this.playlist = tracks;
        this.currentIndex = 0;

        if (tracks.length > 0) {
            await this.loadTrack(0);
        }

        eventBus.emit(Events.PLAYLIST_LOADED, {
            tracks,
            count: tracks.length
        });
    }

    /**
     * Update playlist without interrupting current playback
     * Used when additional tracks are added while playing
     * @param {Array} tracks - Updated array of tracks
     */
    updatePlaylist(tracks) {
        this.playlist = tracks;
    }

    /**
     * Load a specific track by index
     * @param {number} index
     * @returns {Promise} Resolves when audio is ready to play
     */
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return Promise.resolve();

        const track = this.playlist[index];
        this.currentIndex = index;

        return new Promise((resolve) => {
            // Wait for audio to be ready
            const onCanPlay = () => {
                this.audio.removeEventListener('canplay', onCanPlay);
                resolve();
            };
            this.audio.addEventListener('canplay', onCanPlay);

            this.audio.src = track.audioUrl;
            this.audio.load();

            this.updateMediaSession(track);

            eventBus.emit(Events.TRACK_CHANGE, {
                track,
                index,
                total: this.playlist.length
            });
        });
    }

    /**
     * Play current track
     */
    async play() {
        if (!this.audio.src) return;

        try {
            await this.audio.play();
        } catch (error) {
            console.error('AudioService: Play failed', error);
        }
    }

    /**
     * Pause current track
     */
    pause() {
        this.audio.pause();
    }

    /**
     * Seek to position
     * @param {number} time - Time in seconds
     */
    seek(time) {
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
        eventBus.emit(Events.SEEK, { time: this.audio.currentTime });
    }

    /**
     * Seek by percentage
     * @param {number} percent - 0 to 100
     */
    seekPercent(percent) {
        const time = (percent / 100) * (this.audio.duration || 0);
        this.seek(time);
    }

    /**
     * Go to next track
     */
    async next() {
        let nextIndex = this.currentIndex + 1;

        if (nextIndex >= this.playlist.length) {
            if (this.repeatMode === RepeatMode.ALL) {
                nextIndex = 0;
            } else {
                // End of playlist
                this.pause();
                this.audio.currentTime = 0;
                eventBus.emit(Events.ENDED, { reason: 'playlist_end' });
                return;
            }
        }

        await this.loadTrack(nextIndex);
        this.play();
    }

    /**
     * Go to previous track
     */
    async previous() {
        // If more than 3 seconds in, restart current track
        if (this.audio.currentTime > 3) {
            this.seek(0);
            return;
        }

        let prevIndex = this.currentIndex - 1;

        if (prevIndex < 0) {
            if (this.repeatMode === RepeatMode.ALL) {
                prevIndex = this.playlist.length - 1;
            } else {
                prevIndex = 0;
            }
        }

        await this.loadTrack(prevIndex);
        this.play();
    }

    /**
     * Play specific track by index
     * @param {number} index
     */
    async playTrack(index) {
        await this.loadTrack(index);
        this.play();
    }

    /**
     * Set repeat mode
     * @param {string} mode - RepeatMode value
     */
    setRepeatMode(mode) {
        this.repeatMode = mode;
        this.audio.loop = (mode === RepeatMode.ONE);

        eventBus.emit(Events.REPEAT_MODE_CHANGE, { mode });
    }

    /**
     * Cycle through repeat modes
     */
    cycleRepeatMode() {
        const modes = [RepeatMode.OFF, RepeatMode.ONE, RepeatMode.ALL];
        const currentIndex = modes.indexOf(this.repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        this.setRepeatMode(nextMode);
    }

    /**
     * Handle time update event
     */
    handleTimeUpdate() {
        eventBus.emit(Events.TIME_UPDATE, {
            currentTime: this.audio.currentTime,
            duration: this.audio.duration || 0,
            percent: this.audio.duration
                ? (this.audio.currentTime / this.audio.duration) * 100
                : 0
        });
    }

    /**
     * Handle track ended event
     */
    handleEnded() {
        if (this.repeatMode === RepeatMode.ONE) {
            // Loop is handled by audio.loop property
            return;
        }

        this.next();
    }

    /**
     * Handle audio error
     * @param {Event} event
     */
    handleError(event) {
        console.error('AudioService: Playback error', event);
        eventBus.emit(Events.ENDED, {
            reason: 'error',
            error: this.audio.error
        });
    }

    /**
     * Get current state
     * @returns {Object}
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentTime: this.audio?.currentTime || 0,
            duration: this.audio?.duration || 0,
            currentIndex: this.currentIndex,
            currentTrack: this.playlist[this.currentIndex] || null,
            repeatMode: this.repeatMode,
            playlistLength: this.playlist.length
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.audio) {
            this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.audio.removeEventListener('ended', this.handleEnded);
            this.audio.removeEventListener('error', this.handleError);
            this.audio.src = '';
        }

        // Revoke any object URLs
        this.playlist.forEach(track => {
            if (track.audioUrl && track.audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(track.audioUrl);
            }
        });

        this.playlist = [];
    }
}

// Export singleton instance
export const audio = new AudioService();
