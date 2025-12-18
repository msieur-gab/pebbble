/**
 * IPFSService - Download content from IPFS via public gateways
 */

import { eventBus, Events } from './EventBus.js';

class IPFSService {
    constructor() {
        // Public gateways (no auth needed for reading)
        this.gateways = [
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://gateway.pinata.cloud/ipfs/',
            'https://dweb.link/ipfs/'
        ];

        this.timeout = 30000; // 30 seconds
    }

    /**
     * Download JSON content from IPFS
     * Tries multiple gateways until one succeeds
     * @param {string} hash - IPFS CID/hash
     * @returns {Promise<Object>} Parsed JSON content
     */
    async downloadJSON(hash) {
        let lastError = null;

        for (const gateway of this.gateways) {
            try {
                const url = `${gateway}${hash}`;
                console.log(`IPFSService: Trying ${gateway}`);

                const response = await this.fetchWithTimeout(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log(`IPFSService: Success from ${gateway}`);
                return data;

            } catch (error) {
                console.warn(`IPFSService: Failed from ${gateway}:`, error.message);
                lastError = error;
            }
        }

        throw new Error(`All gateways failed: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Download playlist manifest
     * @param {string} hash - Playlist IPFS hash
     * @returns {Promise<Object>} Playlist manifest
     */
    async downloadPlaylist(hash) {
        eventBus.emit(Events.DOWNLOAD_PROGRESS, {
            stage: 'manifest',
            progress: 0
        });

        const manifest = await this.downloadJSON(hash);

        eventBus.emit(Events.DOWNLOAD_PROGRESS, {
            stage: 'manifest',
            progress: 100
        });

        return manifest;
    }

    /**
     * Download encrypted message package
     * @param {string} hash - Message IPFS hash
     * @returns {Promise<Object>} Encrypted message package
     */
    async downloadMessage(hash) {
        return this.downloadJSON(hash);
    }

    /**
     * Fetch with timeout
     * @param {string} url - URL to fetch
     * @returns {Promise<Response>}
     */
    fetchWithTimeout(url) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('Request timeout'));
            }, this.timeout);

            fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    clearTimeout(timeoutId);
                    resolve(response);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }
}

// Export singleton instance
export const ipfs = new IPFSService();
