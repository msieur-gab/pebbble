// config.js

/**
 * Global configuration settings for the Pebbble Playlist Writer app.
 *
 * @description
 * This file centralizes configuration parameters, making it easy to manage
 * settings for different environments (e.g., development, production).
 *
 * @param {boolean} DEBUG_MODE - If true, the live log console will be visible.
 * @param {string|null} FORCE_NFC_URL_BASE - A specific base URL for NFC tags. If set to null,
 * the app's current origin and path will be used (e.g., https://example.com/index.html).
 * If set to a custom URL (e.g., 'https://mycustomurl.page/'), that URL will be used.
 * @param {string|null} PINATA_API_KEY - The Pinata API key for development/testing.
 * If not set, the user must enter credentials in the UI.
 * @param {string|null} PINATA_SECRET - The Pinata API secret for development/testing.
 * If not set, the user must enter credentials in the UI.
 */
export const config = {
    // General Settings
    DEBUG_MODE: false,

    // NFC URL Settings
    FORCE_NFC_URL_BASE: 'https://msieur-gab.github.io/peeble/kid.html',

    // API Credentials (set to null for production, or hardcode for dev)
    PINATA_API_KEY: 'YOUR_PINATA_API_KEY_HERE',
    PINATA_SECRET: 'YOUR_PINATA_SECRET_HERE'
};