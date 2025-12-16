/**
 * CryptoService - Encryption/decryption using Web Crypto API
 * Compatible with Pebbble Writer's encryption scheme
 */

class CryptoService {
    constructor() {
        this.PBKDF2_ITERATIONS = 100000;
    }

    /**
     * Convert colon-separated hex string to Uint8Array
     * @param {string} hexString - e.g., "04:80:69:42:c0:1c:90"
     * @returns {Uint8Array}
     */
    hexToBytes(hexString) {
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
     * Derive encryption key from serial and timestamp
     * Uses PBKDF2 with serial as salt, timestamp as key material
     * @param {string} serial - NFC tag serial (colon-separated hex)
     * @param {number} timestamp - Message timestamp
     * @returns {Promise<CryptoKey>}
     */
    async deriveKey(serial, timestamp) {
        // Import timestamp as key material
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(timestamp.toString()),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Convert serial to bytes for use as salt
        const salt = this.hexToBytes(serial);

        // Derive AES-GCM key
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
     * Decrypt binary data (IV prepended to ciphertext)
     * @param {Uint8Array} encryptedData - IV (12 bytes) + ciphertext
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<ArrayBuffer>}
     */
    async decryptBinary(encryptedData, key) {
        // Extract IV (first 12 bytes) and ciphertext
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
     * Decrypt base64-encoded data
     * @param {string} base64Data - Base64-encoded encrypted data
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<ArrayBuffer>}
     */
    async decryptBase64(base64Data, key) {
        const binaryData = this.base64ToBytes(base64Data);
        return this.decryptBinary(binaryData, key);
    }

    /**
     * Decrypt base64 data to string
     * @param {string} base64Data - Base64-encoded encrypted data
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<string>}
     */
    async decryptBase64ToString(base64Data, key) {
        const decrypted = await this.decryptBase64(base64Data, key);
        return new TextDecoder().decode(decrypted);
    }

    /**
     * Convert base64 string to Uint8Array
     * @param {string} base64 - Base64 string
     * @returns {Uint8Array}
     */
    base64ToBytes(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Decrypt an audio message from a package
     * @param {Object} encryptedPackage - { encryptedAudio, timestamp, ... }
     * @param {string} serial - NFC tag serial
     * @returns {Promise<Blob>} Decrypted audio blob
     */
    async decryptAudioPackage(encryptedPackage, serial) {
        // Derive key from serial and timestamp
        const key = await this.deriveKey(serial, encryptedPackage.timestamp);

        // Decrypt audio
        const encryptedBytes = this.base64ToBytes(encryptedPackage.encryptedAudio);
        const decryptedAudio = await this.decryptBinary(encryptedBytes, key);

        // Create blob (assuming webm format, adjust if needed)
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
        return this.decryptBase64ToString(encryptedPackage.encryptedTranscript, key);
    }
}

// Export singleton instance
export const cryptoService = new CryptoService();
