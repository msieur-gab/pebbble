// js/utils/validationUtils.js

/**
 * Validate text input (not empty, reasonable length)
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} Validation result
 */
export function validateText(text, minLength = 1, maxLength = 100) {
    const trimmed = text?.trim() || '';
    
    if (trimmed.length === 0) {
        return { valid: false, error: 'This field is required' };
    }
    
    if (trimmed.length < minLength) {
        return { valid: false, error: `Must be at least ${minLength} characters` };
    }
    
    if (trimmed.length > maxLength) {
        return { valid: false, error: `Must be less than ${maxLength} characters` };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * Validate playlist data
 * @param {Object} playlist - Playlist data
 * @returns {Object} Validation result
 */
export function validatePlaylist(playlist) {
    const nameResult = validateText(playlist?.name, 1, 50);
    if (!nameResult.valid) {
        return { valid: false, error: `Playlist name: ${nameResult.error}` };
    }
    
    if (!playlist.audioClipIds || playlist.audioClipIds.length === 0) {
        return { valid: false, error: 'Playlist must contain at least one audio clip' };
    }
    
    return { valid: true };
}

/**
 * Validate API credentials
 * @param {string} apiKey - API key
 * @param {string} secret - Secret key
 * @returns {Object} Validation result
 */
export function validateCredentials(apiKey, secret) {
    if (!apiKey || apiKey.trim().length < 10) {
        return { valid: false, error: 'API key is required and must be at least 10 characters' };
    }
    
    if (!secret || secret.trim().length < 20) {
        return { valid: false, error: 'Secret key is required and must be at least 20 characters' };
    }
    
    return { valid: true };
}

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 50);
}