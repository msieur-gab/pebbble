/**
 * NFCService - Web NFC API wrapper for reading Pebbble tags
 */

import { eventBus, Events } from './EventBus.js';

class NFCService {
    constructor() {
        this.reader = null;
        this.isActive = false;
        this.abortController = null;
    }

    /**
     * Check if NFC is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'NDEFReader' in window;
    }

    /**
     * Start the NFC reader
     * @returns {Promise<void>}
     */
    async startReader() {
        if (!this.isSupported()) {
            eventBus.emit(Events.NFC_ERROR, {
                message: 'NFC is not supported on this device'
            });
            throw new Error('NFC not supported');
        }

        if (this.isActive) {
            console.log('NFCService: Reader already active');
            return;
        }

        try {
            this.reader = new NDEFReader();

            this.reader.onreading = (event) => {
                this.handleReading(event);
            };

            this.reader.onreadingerror = (event) => {
                console.error('NFCService: Reading error', event);
                eventBus.emit(Events.NFC_ERROR, {
                    message: 'Failed to read the tag'
                });
            };

            await this.reader.scan();

            this.isActive = true;
            eventBus.emit(Events.NFC_ACTIVATED);

        } catch (error) {
            console.error('NFCService: Failed to start reader', error);

            let message = 'Failed to start NFC reader';
            if (error.name === 'NotAllowedError') {
                message = 'NFC permission denied';
            } else if (error.name === 'NotSupportedError') {
                message = 'NFC is not supported';
            }

            eventBus.emit(Events.NFC_ERROR, { message, error });
            throw error;
        }
    }

    /**
     * Stop the NFC reader
     */
    stopReader() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isActive = false;
        this.reader = null;
    }

    /**
     * Handle NFC reading event
     * @param {NDEFReadingEvent} event
     */
    handleReading(event) {
        const serial = event.serialNumber;
        let url = null;

        // Extract URL from NDEF records
        if (event.message && event.message.records) {
            for (const record of event.message.records) {
                if (record.recordType === 'url') {
                    const decoder = new TextDecoder();
                    url = decoder.decode(record.data);
                    break;
                }
                // Also check for text records that might contain URLs
                if (record.recordType === 'text') {
                    const decoder = new TextDecoder();
                    const text = decoder.decode(record.data);
                    if (text.startsWith('http')) {
                        url = text;
                        break;
                    }
                }
            }
        }

        console.log('NFCService: Tag read', { serial, url });

        eventBus.emit(Events.NFC_TAG_READ, {
            serial: this.formatSerial(serial),
            url,
            raw: event
        });
    }

    /**
     * Format serial number consistently
     * @param {string} serial - Raw serial from NFC
     * @returns {string} Formatted serial (uppercase, colon-separated)
     */
    formatSerial(serial) {
        if (!serial) return null;

        // If already formatted with colons, normalize
        if (serial.includes(':')) {
            return serial.toUpperCase();
        }

        // If it's a hex string without colons, add them
        const hex = serial.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
        return hex.match(/.{1,2}/g)?.join(':') || serial.toUpperCase();
    }

    /**
     * Parse playlist hash from URL
     * @param {string} url - URL from NFC tag
     * @returns {string|null} Playlist hash
     */
    parsePlaylistHash(url) {
        if (!url) return null;

        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.hash.substring(1));
            return params.get('playlistHash');
        } catch (error) {
            console.error('NFCService: Failed to parse URL', error);
            return null;
        }
    }

    /**
     * Check if reader is active
     * @returns {boolean}
     */
    isReaderActive() {
        return this.isActive;
    }
}

// Export singleton instance
export const nfc = new NFCService();
