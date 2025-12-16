// services/nfcService.js
// This file encapsulates the Web NFC API interactions, handling both reading and writing.

import { log } from '../utils/log.js';

export class NFCService {
    constructor() {
        this.reader = null;
        this.writer = null;
        this.readerActive = false;
    }

    isSupported() {
        return {
            read: 'NDEFReader' in window,
            write: 'NDEFWriter' in window || ('NDEFReader' in window && typeof NDEFReader.prototype.write === 'function')
        };
    }

    async startReader(onTagRead) {
        if (!this.isSupported().read) {
            throw new Error('Web NFC read is not supported on this device.');
        }
        if (this.readerActive) {
            log('NFC reader is already active.', 'warning');
            return;
        }

        log('Starting NFC reader...', 'info');
        try {
            this.reader = new NDEFReader();
            this.reader.onreading = (event) => {
                const serial = event.serialNumber;
                let url = null;
                if (event.message && event.message.records) {
                    for (const record of event.message.records) {
                        if (record.recordType === 'url') {
                            const decoder = new TextDecoder();
                            url = decoder.decode(record.data);
                            break;
                        }
                    }
                }
                onTagRead(serial, url);
            };

            this.reader.onreadingerror = (e) => {
                log(`NFC reading error: ${e.message}`, 'error');
                this.readerActive = false;
            };

            await this.reader.scan();
            this.readerActive = true;
            log('NFC reader activated. Tap a Peeble to scan.', 'success');
        } catch (e) {
            log(`Failed to start NFC reader: ${e.message}`, 'error');
            this.readerActive = false;
            throw e;
        }
    }
    
    async stopReader() {
         if (this.reader && this.readerActive) {
            this.readerActive = false;
            log('NFC reader stopped.', 'info');
         }
    }


    async writeUrl(url) {
        if (!this.isSupported().write) {
            throw new Error('Web NFC write is not supported on this device.');
        }

        log(`Attempting to write URL to NFC tag: ${url}`, 'info');
        try {
            if ('NDEFWriter' in window) {
                 this.writer = new NDEFWriter();
                 await this.writer.write({
                    records: [{ recordType: "url", data: url }]
                 });
            } else if ('NDEFReader' in window && typeof NDEFReader.prototype.write === 'function') {
                const reader = new NDEFReader();
                await reader.write({
                    records: [{ recordType: "url", data: url }]
                });
            }
            log('URL successfully written to NFC tag.', 'success');
        } catch (e) {
            log(`Failed to write to NFC tag: ${e.message}`, 'error');
            throw e;
        }
    }
}