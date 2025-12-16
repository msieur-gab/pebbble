// services/encryptionService.js
// This file is based on your original encryption.js and parent.html code. It handles
// all encryption and decryption operations.

import { log } from '../utils/log.js';

export class EncryptionService {
    hexToUint8Array(hexString) {
        const hexWithoutColons = hexString.replace(/:/g, '');
        if (hexWithoutColons.length % 2 !== 0) {
            throw new Error('Invalid hex string format.');
        }
        const arrayBuffer = new Uint8Array(hexWithoutColons.length / 2);
        for (let i = 0; i < hexWithoutColons.length / 2; i++) {
            arrayBuffer[i] = parseInt(hexWithoutColons.substring(i * 2, i * 2 + 2), 16);
        }
        return arrayBuffer;
    }
    
    async deriveEncryptionKey(serial, timestamp) {
        log('Deriving encryption key...');
        try {
            const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(timestamp.toString()), 'PBKDF2', false, ['deriveKey']);
            const serialAsBytes = this.hexToUint8Array(serial);
            
            return crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: serialAsBytes, iterations: 100000, hash: 'SHA-256' },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            log(`Error deriving encryption key: ${error.message}`, 'error');
            throw new Error('Failed to derive encryption key.');
        }
    }
    
    async encryptDataToBinary(data, key) {
        log(`Encrypting data to binary, original size: ${data.byteLength} bytes`);
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);
            log(`Data encrypted to binary: ${result.length} bytes`, 'success');
            return result;
        } catch (error) {
            log(`Encryption to binary error: ${error.message}`, 'error');
            throw new Error('Failed to encrypt data to binary.');
        }
    }

    async decryptFromBinary(encryptedData, key) {
        log(`Decrypting binary data, size: ${encryptedData.length} bytes`);
        try {
            const iv = encryptedData.slice(0, 12);
            const encrypted = encryptedData.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            log(`Decryption successful, result size: ${decrypted.byteLength} bytes`, 'success');
            return decrypted;
        } catch (error) {
            log(`Binary decryption error: ${error.message}`, 'error');
            throw new Error('Failed to decrypt binary data.');
        }
    }

    binToBase64(binary) {
        let binaryString = '';
        const len = binary.byteLength;
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(binary[i]);
        }
        return btoa(binaryString);
    }
}