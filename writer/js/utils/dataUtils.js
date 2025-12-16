// js/utils/dataUtils.js

/**
 * Deep clone an object (simple version for app data)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(deepClone);
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Sort array by property
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted array
 */
export function sortBy(array, property, ascending = true) {
    return [...array].sort((a, b) => {
        const aVal = a[property];
        const bVal = b[property];
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

/**
 * Group array by property
 * @param {Array} array - Array to group
 * @param {string} property - Property to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, property) {
    return array.reduce((groups, item) => {
        const key = item[property];
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
    }, {});
}

/**
 * Calculate audio library stats
 * @param {Array} clips - Audio clips array
 * @returns {Object} Stats object
 */
export function calculateLibraryStats(clips) {
    const totalClips = clips.length;
    const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration || 0), 0);
    const totalSize = clips.reduce((sum, clip) => sum + (clip.size || 0), 0);
    
    return {
        totalClips,
        totalDuration,
        totalSize,
        averageDuration: totalClips > 0 ? totalDuration / totalClips : 0
    };
}

/**
 * Remove duplicates from array by property
 * @param {Array} array - Array to deduplicate
 * @param {string} property - Property to check for duplicates
 * @returns {Array} Array without duplicates
 */
export function uniqueBy(array, property) {
    const seen = new Set();
    return array.filter(item => {
        const key = item[property];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}