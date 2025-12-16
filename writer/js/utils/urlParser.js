// utils/urlParser.js
// This utility module handles the creation of the secure NFC URL, ensuring a consistent format.

// export const urlParser = {
//     createSecureNfcUrl({ playlistHash }) {
//         const baseUrl = window.location.origin + window.location.pathname;
//         return `${baseUrl}#playlistHash=${playlistHash}`;
//     }
// };

import { config } from '../../config.js';

export const urlParser = {
    createSecureNfcUrl({ playlistHash }) {
        const baseUrl = config.FORCE_NFC_URL_BASE || (window.location.origin + window.location.pathname);
        return `${baseUrl}#playlistHash=${playlistHash}`;
    }
};