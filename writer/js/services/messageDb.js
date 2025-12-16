// services/messageDb.js

import { Dexie } from 'https://unpkg.com/dexie@3.2.3/dist/modern/dexie.mjs';
import { log } from '../utils/log.js';

export class MessageDb {
    constructor() {
        this.db = new Dexie('PebbblePlaylistDB');
        this.db.version(4).stores({
            settings: 'key, value',
            audioClips: '++id, title, audioBlob, duration, timestamp',
            playlists: '++id, name, description, audioClipIds, timestamp',
            finalizedPlaylists: '++id, name, playlistHash, tagSerial, timestamp, audioClipIds'
        });
        log('IndexedDB initialized with Dexie.js.');
    }

    async saveSetting(key, value) {
        return this.db.settings.put({ key, value });
    }

    async getSetting(key) {
        return this.db.settings.get(key);
    }

    async saveAudioClip(title, audioBlob, duration) {
        return this.db.audioClips.add({
            title,
            audioBlob,
            duration,
            timestamp: Date.now()
        });
    }
    
    async getAudioClip(id) {
        return this.db.audioClips.get(parseInt(id));
    }
    
    async getAllAudioClips() {
        return this.db.audioClips.toArray();
    }
    
    async deleteAudioClip(id) {
        return this.db.audioClips.delete(parseInt(id));
    }
    
    async deleteAllAudioClips() {
        return this.db.audioClips.clear();
    }

    async savePlaylist(playlist) {
        if (playlist.id) {
            return this.db.playlists.update(playlist.id, playlist);
        } else {
            return this.db.playlists.add(playlist);
        }
    }
    
    async getPlaylists() {
        return this.db.playlists.toArray();
    }
    
    async deletePlaylist(id) {
        return this.db.playlists.delete(parseInt(id));
    }

    async getPlaylistById(id) {
        return this.db.playlists.get(parseInt(id));
    }

    async getAudioClipsForPlaylist(playlistId) {
        const playlist = await this.db.playlists.get(parseInt(playlistId));
        if (!playlist || !playlist.audioClipIds) return [];
        return this.db.audioClips.where('id').anyOf(playlist.audioClipIds).toArray();
    }

    async updatePlaylistClipsOrder(playlistId, newOrder) {
        return this.db.playlists.update(playlistId, { audioClipIds: newOrder });
    }

    async saveFinalizedPlaylist(name, playlistHash, tagSerial, audioClipIds) {
        return this.db.finalizedPlaylists.add({
            name,
            playlistHash,
            tagSerial,
            timestamp: Date.now(),
            audioClipIds
        });
    }

    async getFinalizedPlaylists() {
        return this.db.finalizedPlaylists.toArray();
    }

    async getFinalizedPlaylist(id) {
        return this.db.finalizedPlaylists.get(parseInt(id));
    }
    
    async deleteFinalizedPlaylist(id) {
        return this.db.finalizedPlaylists.delete(parseInt(id));
    }
}