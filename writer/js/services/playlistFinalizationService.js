// js/services/playlistFinalizationService.js

import { log } from '../utils/log.js';
import { urlParser } from '../utils/urlParser.js';

export class PlaylistFinalizationService {
    constructor(encryptionService, storageService, messageDb) {
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this.db = messageDb;
    }

    /**
     * Finalizes a playlist by encrypting clips, uploading to IPFS, and creating the final manifest
     * @param {Object} options - Finalization options
     * @param {Array} options.clips - Array of audio clips to process
     * @param {string} options.tagSerial - The NFC tag serial number for encryption
     * @param {string} options.playlistName - Name of the playlist
     * @param {number|null} options.playlistId - ID of existing playlist (optional)
     * @param {Array} options.audioClipIds - Array of audio clip IDs for database storage
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise<Object>} - Result object with URL and playlist info
     */
    async finalizePlaylist({
        clips,
        tagSerial,
        playlistName,
        playlistId = null,
        audioClipIds = [],
        onProgress = () => {}
    }) {
        // Validate inputs
        if (!clips || clips.length === 0) {
            throw new Error('Cannot finalize an empty playlist. Please add some audio clips.');
        }
        
        if (!tagSerial) {
            throw new Error('Tag serial is required for encryption.');
        }
        
        if (!playlistName) {
            throw new Error('Playlist name is required.');
        }

        if (!this.storageService) {
            throw new Error('Storage service not available. Please check your API credentials.');
        }

        log(`Starting playlist finalization: "${playlistName}" with ${clips.length} clips`, 'info');
        onProgress({ stage: 'starting', message: `Starting finalization for "${playlistName}"` });

        const playlistManifest = { 
            version: 'playlist-v1', 
            messages: [],
            metadata: {
                name: playlistName,
                createdAt: Date.now(),
                totalClips: clips.length
            }
        };

        // Process each audio clip
        const processedClips = [];
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            
            try {
                const progress = {
                    stage: 'processing-clip',
                    current: i + 1,
                    total: clips.length,
                    message: `Processing clip ${i + 1} of ${clips.length}: "${clip.title}"`
                };
                onProgress(progress);
                
                const processedClip = await this._processAudioClip(clip, tagSerial);
                processedClips.push(processedClip);
                playlistManifest.messages.push({
                    messageId: processedClip.messageId,
                    ipfsHash: processedClip.ipfsHash
                });
                
                log(`Successfully processed clip: "${clip.title}"`, 'success');
                
            } catch (error) {
                log(`Failed to process clip "${clip.title}": ${error.message}`, 'error');
                throw new Error(`Failed to process clip "${clip.title}": ${error.message}`);
            }
        }

        // Upload final manifest
        onProgress({
            stage: 'uploading-manifest',
            message: 'All clips uploaded. Creating final playlist manifest...'
        });

        let finalManifestHash;
        let finalNfcUrl;
        
        try {
            finalManifestHash = await this.storageService.uploadMessagePackage(playlistManifest);
            finalNfcUrl = urlParser.createSecureNfcUrl({ playlistHash: finalManifestHash });
            
            log(`Final manifest uploaded with hash: ${finalManifestHash}`, 'success');
            
        } catch (error) {
            log(`Failed to upload final playlist manifest: ${error.message}`, 'error');
            throw new Error(`Failed to create final playlist: ${error.message}`);
        }

        // Save to database
        onProgress({
            stage: 'saving-to-database',
            message: 'Saving finalized playlist to database...'
        });

        try {
            await this.db.saveFinalizedPlaylist(
                playlistName,
                finalManifestHash,
                tagSerial,
                audioClipIds
            );
            
            log(`Playlist "${playlistName}" finalized and saved to database`, 'success');
            
        } catch (error) {
            log(`Failed to save finalized playlist to database: ${error.message}`, 'error');
            // Don't throw here - the playlist was successfully created, just not saved locally
        }

        // Return success result
        const result = {
            success: true,
            url: finalNfcUrl,
            playlistHash: finalManifestHash,
            playlistName: playlistName,
            tagSerial: tagSerial,
            processedClips: processedClips.length,
            totalClips: clips.length
        };

        onProgress({
            stage: 'completed',
            message: 'Playlist finalization completed successfully!',
            result: result
        });

        log('Playlist finalization completed successfully', 'success');
        return result;
    }

    /**
     * Processes a single audio clip: encrypts and uploads to IPFS
     * @private
     */
    async _processAudioClip(clip, tagSerial) {
        const timestamp = Date.now();
        
        // Generate encryption key
        const encryptionKey = await this.encryptionService.deriveEncryptionKey(tagSerial, timestamp);
        
        // Convert audio blob to array buffer
        const audioBuffer = await clip.audioBlob.arrayBuffer();
        
        // Encrypt the audio data
        const encryptedAudio = await this.encryptionService.encryptDataToBinary(audioBuffer, encryptionKey);
        
        // Create message package
        const messagePackage = {
            messageId: `PBB-${clip.id}-${timestamp}`,
            timestamp: timestamp,
            encryptedAudio: this.encryptionService.binToBase64(encryptedAudio),
            metadata: {
                title: clip.title,
                duration: clip.duration,
                originalSize: audioBuffer.byteLength,
                encryptedSize: encryptedAudio.length
            }
        };
        
        // Upload to IPFS
        const ipfsHash = await this.storageService.uploadMessagePackage(messagePackage);
        
        return {
            messageId: messagePackage.messageId,
            ipfsHash: ipfsHash,
            title: clip.title,
            originalId: clip.id,
            encryptedSize: encryptedAudio.length
        };
    }

    /**
     * Validates that all required services are available
     * @returns {Object} - Validation result with any missing services
     */
    validateServices() {
        const missing = [];
        
        if (!this.encryptionService) missing.push('encryptionService');
        if (!this.storageService) missing.push('storageService');
        if (!this.db) missing.push('messageDb');
        
        return {
            isValid: missing.length === 0,
            missing: missing
        };
    }

    /**
     * Estimates the time required for finalization based on clip count
     * @param {number} clipCount - Number of clips to process
     * @returns {Object} - Time estimation
     */
    estimateFinalizationTime(clipCount) {
        // Rough estimates based on typical performance
        const timePerClip = 3000; // 3 seconds per clip (encryption + upload)
        const manifestTime = 2000; // 2 seconds for final manifest
        
        const totalTime = (clipCount * timePerClip) + manifestTime;
        
        return {
            estimatedMs: totalTime,
            estimatedMinutes: Math.ceil(totalTime / 60000),
            perClipMs: timePerClip
        };
    }

    /**
     * Cancels an ongoing finalization process
     * Note: This is a placeholder for future implementation
     * The current process cannot be easily cancelled due to encryption/upload operations
     */
    cancelFinalization() {
        log('Finalization cancellation requested - not yet implemented', 'warning');
        // TODO: Implement cancellation logic if needed
        // This would require making the process more granular and checking for cancellation flags
    }
}