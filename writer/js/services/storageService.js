// services/storageService.js
// This file is based on your original storage.js and parent.html code. It handles
// all interactions with the Pinata IPFS API.

// services/storageService.js

import { log } from '../utils/log.js';

export class StorageService {
    constructor(apiKey, secret) {
        this.apiKey = apiKey;
        this.secret = secret;
        this.pinataApiUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
        this.pinataGatewayUrl = 'https://gateway.pinata.cloud/ipfs/';
        this.publicGateways = [
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
        ];
    }

    setCredentials(apiKey, secret) {
        this.apiKey = apiKey;
        this.secret = secret;
    }

    async uploadMessagePackage(messagePackage) {
        log('Uploading encrypted package to IPFS...', 'info');
        const formData = new FormData();
        const jsonString = JSON.stringify(messagePackage);
        const blob = new Blob([jsonString], { type: 'application/json' });
        formData.append('file', blob, 'package.json');
        const metadata = JSON.stringify({ name: 'package.json' });
        formData.append('pinataMetadata', metadata);
        const response = await fetch(this.pinataApiUrl, {
            method: 'POST',
            headers: {
                'pinata_api_key': this.apiKey,
                'pinata_secret_api_key': this.secret
            },
            body: formData
        });
        if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
        const result = await response.json();
        return result.IpfsHash;
    }
}