/**
 * StorageService - IndexedDB wrapper for offline audio storage
 * Lightweight promise-based API (similar to idb but self-contained)
 */

import { eventBus, Events } from './EventBus.js';

const DB_NAME = 'pebbble-player';
const DB_VERSION = 1;

// Store names
const STORES = {
    AUDIO: 'audio',
    PLAYLISTS: 'playlists',
    PREFERENCES: 'preferences'
};

class StorageService {
    constructor() {
        this.db = null;
        this.deviceMode = 'shared'; // 'personal' or 'shared'
    }

    /**
     * Initialize the database
     */
    async init() {
        // Check saved device mode
        const savedMode = localStorage.getItem('pebbble-device-mode');
        if (savedMode) {
            this.deviceMode = savedMode;
        }

        // Always open IndexedDB for reading cached content
        // We only restrict WRITING based on device mode
        try {
            this.db = await this.openDB();
            eventBus.emit(Events.STORAGE_READY, { mode: this.deviceMode });
        } catch (error) {
            console.error('StorageService: Failed to open database', error);
            eventBus.emit(Events.STORAGE_ERROR, { error });
        }
    }

    /**
     * Open the IndexedDB database
     * @returns {Promise<IDBDatabase>}
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Audio store: { id, playlistId, blob, duration, title, timestamp }
                if (!db.objectStoreNames.contains(STORES.AUDIO)) {
                    const audioStore = db.createObjectStore(STORES.AUDIO, { keyPath: 'id' });
                    audioStore.createIndex('playlistId', 'playlistId', { unique: false });
                }

                // Playlists store: { id, serial, manifest, lastPlayed, downloadedAt }
                if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
                    const playlistStore = db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' });
                    playlistStore.createIndex('serial', 'serial', { unique: false });
                }

                // Preferences store: { key, value }
                if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
                    db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Set device mode (personal/shared)
     * @param {string} mode - 'personal' or 'shared'
     */
    async setDeviceMode(mode) {
        this.deviceMode = mode;
        localStorage.setItem('pebbble-device-mode', mode);

        if (mode === 'personal' && !this.db) {
            await this.init();
        } else if (mode === 'shared') {
            // Clear any stored data when switching to shared
            await this.clearAll();
            this.db = null;
        }

        eventBus.emit(Events.DEVICE_MODE_SET, { mode });
    }

    /**
     * Get device mode
     * @returns {string} 'personal' or 'shared'
     */
    getDeviceMode() {
        return this.deviceMode;
    }

    /**
     * Check if storage is available (personal mode + db ready)
     * @returns {boolean}
     */
    isAvailable() {
        return this.deviceMode === 'personal' && this.db !== null;
    }

    // ==========================================
    // Audio operations
    // ==========================================

    /**
     * Save audio blob
     * @param {string} id - Track ID
     * @param {string} playlistId - Playlist ID
     * @param {Blob} blob - Audio blob
     * @param {Object} metadata - { title, duration }
     */
    async saveAudio(id, playlistId, blob, metadata = {}) {
        if (!this.isAvailable()) return;

        const record = {
            id,
            playlistId,
            blob,
            title: metadata.title || 'Untitled',
            duration: metadata.duration || 0,
            timestamp: Date.now()
        };

        await this.put(STORES.AUDIO, record);
    }

    /**
     * Get audio blob
     * @param {string} id - Track ID
     * @returns {Promise<Blob|null>}
     */
    async getAudio(id) {
        if (!this.isAvailable()) return null;

        const record = await this.get(STORES.AUDIO, id);
        return record ? record.blob : null;
    }

    /**
     * Get all audio for a playlist (works regardless of device mode)
     * @param {string} playlistId - Playlist ID
     * @returns {Promise<Array>}
     */
    async getPlaylistAudio(playlistId) {
        if (!this.db) return [];

        return this.getAllByIndex(STORES.AUDIO, 'playlistId', playlistId);
    }

    // ==========================================
    // Playlist operations
    // ==========================================

    /**
     * Save playlist metadata
     * @param {string} id - Playlist ID (IPFS hash)
     * @param {string} serial - NFC tag serial
     * @param {Object} manifest - Playlist manifest
     */
    async savePlaylist(id, serial, manifest) {
        if (!this.isAvailable()) return;

        const record = {
            id,
            serial,
            manifest,
            lastPlayed: Date.now(),
            downloadedAt: Date.now()
        };

        await this.put(STORES.PLAYLISTS, record);
    }

    /**
     * Get playlist by ID (works regardless of device mode)
     * @param {string} id - Playlist ID
     * @returns {Promise<Object|null>}
     */
    async getPlaylist(id) {
        if (!this.db) return null;

        return this.get(STORES.PLAYLISTS, id);
    }

    /**
     * Update last played timestamp
     * @param {string} id - Playlist ID
     */
    async updateLastPlayed(id) {
        if (!this.isAvailable()) return;

        const playlist = await this.getPlaylist(id);
        if (playlist) {
            playlist.lastPlayed = Date.now();
            await this.put(STORES.PLAYLISTS, playlist);
        }
    }

    /**
     * Get all cached playlists (works regardless of device mode)
     * @returns {Promise<Array>} Array of playlist records sorted by lastPlayed
     */
    async getAllPlaylists() {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.PLAYLISTS, 'readonly');
            const store = tx.objectStore(STORES.PLAYLISTS);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                // Sort by lastPlayed descending (most recent first)
                const playlists = request.result.sort((a, b) =>
                    (b.lastPlayed || 0) - (a.lastPlayed || 0)
                );
                resolve(playlists);
            };
        });
    }

    /**
     * Delete a playlist and its audio
     * @param {string} id - Playlist ID
     */
    async deletePlaylist(id) {
        if (!this.isAvailable()) return;

        // Delete all audio for this playlist
        const audioRecords = await this.getPlaylistAudio(id);
        for (const record of audioRecords) {
            await this.delete(STORES.AUDIO, record.id);
        }

        // Delete playlist metadata
        await this.delete(STORES.PLAYLISTS, id);
    }

    // ==========================================
    // Preferences operations
    // ==========================================

    /**
     * Save a preference
     * @param {string} key - Preference key
     * @param {*} value - Preference value
     */
    async setPreference(key, value) {
        if (!this.isAvailable()) {
            // Fall back to localStorage for shared mode
            localStorage.setItem(`pebbble-pref-${key}`, JSON.stringify(value));
            return;
        }

        await this.put(STORES.PREFERENCES, { key, value });
    }

    /**
     * Get a preference
     * @param {string} key - Preference key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>}
     */
    async getPreference(key, defaultValue = null) {
        if (!this.isAvailable()) {
            const stored = localStorage.getItem(`pebbble-pref-${key}`);
            return stored ? JSON.parse(stored) : defaultValue;
        }

        const record = await this.get(STORES.PREFERENCES, key);
        return record ? record.value : defaultValue;
    }

    // ==========================================
    // Generic operations
    // ==========================================

    /**
     * Get record by key
     * @param {string} storeName - Store name
     * @param {string} key - Record key
     * @returns {Promise<*>}
     */
    get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Put record
     * @param {string} storeName - Store name
     * @param {Object} record - Record to store
     */
    put(storeName, record) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(record);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Delete record by key
     * @param {string} storeName - Store name
     * @param {string} key - Record key
     */
    delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Get all records by index
     * @param {string} storeName - Store name
     * @param {string} indexName - Index name
     * @param {*} value - Index value
     * @returns {Promise<Array>}
     */
    getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Clear all data
     */
    async clearAll() {
        if (!this.db) return;

        const tx = this.db.transaction([STORES.AUDIO, STORES.PLAYLISTS, STORES.PREFERENCES], 'readwrite');

        await Promise.all([
            new Promise((resolve, reject) => {
                const req = tx.objectStore(STORES.AUDIO).clear();
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            }),
            new Promise((resolve, reject) => {
                const req = tx.objectStore(STORES.PLAYLISTS).clear();
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            }),
            new Promise((resolve, reject) => {
                const req = tx.objectStore(STORES.PREFERENCES).clear();
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            })
        ]);
    }
}

// Export singleton instance
export const storage = new StorageService();
