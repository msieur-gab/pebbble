/**
 * CryptoService - Encryption/decryption using Web Crypto API
 * Compatible with Pebbble Writer's encryption scheme
 */

class CryptoService {
    constructor() {
        this.PBKDF2_ITERATIONS = 100000;
    }

    /**
     * Convert colon-separated hex string to Uint8Array (internal)
     * @param {string} hexString - e.g., "04:80:69:42:c0:1c:90"
     * @returns {Uint8Array}
     */
    #hexToBytes(hexString) {
        const hex = hexString.replace(/:/g, '');
        if (hex.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }

        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    }

    /**
     * Convert base64 string to Uint8Array (internal)
     * @param {string} base64 - Base64 string
     * @returns {Uint8Array}
     */
    #base64ToBytes(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Decrypt binary data - IV prepended to ciphertext (internal)
     * @param {Uint8Array} encryptedData - IV (12 bytes) + ciphertext
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<ArrayBuffer>}
     */
    async #decryptBinary(encryptedData, key) {
        const iv = encryptedData.slice(0, 12);
        const ciphertext = encryptedData.slice(12);

        try {
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );
            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed. Wrong key or corrupted data.');
        }
    }

    /**
     * Derive encryption key from serial and timestamp
     * Uses PBKDF2 with serial as salt, timestamp as key material
     * @param {string} serial - NFC tag serial (colon-separated hex)
     * @param {number} timestamp - Message timestamp
     * @returns {Promise<CryptoKey>}
     */
    async deriveKey(serial, timestamp) {
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(timestamp.toString()),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const salt = this.#hexToBytes(serial);

        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        return key;
    }

    /**
     * Decrypt an audio message from a package
     * @param {Object} encryptedPackage - { encryptedAudio, timestamp, ... }
     * @param {string} serial - NFC tag serial
     * @returns {Promise<Blob>} Decrypted audio blob
     */
    async decryptAudioPackage(encryptedPackage, serial) {
        const key = await this.deriveKey(serial, encryptedPackage.timestamp);
        const encryptedBytes = this.#base64ToBytes(encryptedPackage.encryptedAudio);
        const decryptedAudio = await this.#decryptBinary(encryptedBytes, key);
        return new Blob([decryptedAudio], { type: 'audio/webm' });
    }

    /**
     * Decrypt transcript from a package
     * @param {Object} encryptedPackage - { encryptedTranscript, timestamp, ... }
     * @param {string} serial - NFC tag serial
     * @returns {Promise<string>} Decrypted transcript
     */
    async decryptTranscript(encryptedPackage, serial) {
        if (!encryptedPackage.encryptedTranscript) {
            return '';
        }

        const key = await this.deriveKey(serial, encryptedPackage.timestamp);
        const encryptedBytes = this.#base64ToBytes(encryptedPackage.encryptedTranscript);
        const decrypted = await this.#decryptBinary(encryptedBytes, key);
        return new TextDecoder().decode(decrypted);
    }
}

// Export singleton instance
export const cryptoService = new CryptoService();
