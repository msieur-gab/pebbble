// js/utils/audioUtils.js

/**
 * Format duration from seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1:23", "1:23:45")
 */
export function formatDuration(seconds) {
    if (isNaN(seconds) || seconds === Infinity || !seconds) {
        return '0:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    }
}

/**
 * Validate audio file type
 * @param {File} file - File to validate
 * @returns {boolean} True if valid audio file
 */
export function isValidAudioFile(file) {
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'];
    return file && validTypes.some(type => file.type.includes(type.split('/')[1]));
}

/**
 * Get audio duration from file
 * @param {File|Blob} audioBlob - Audio file/blob
 * @returns {Promise<number>} Duration in seconds
 */
export function getAudioDuration(audioBlob) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            resolve(audio.duration || 0);
            URL.revokeObjectURL(audio.src);
        };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(audioBlob);
    });
}

/**
 * Generate unique clip ID
 * @returns {string} Unique ID
 */
export function generateClipId() {
    return `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.2 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}