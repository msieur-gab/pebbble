/**
 * DateLockService - Handle date-restricted content availability
 * Tracks when messages become available or expire
 */

import { eventBus } from './EventBus.js';
import { i18n, t } from './I18nService.js';

// Lock status constants
export const LockStatus = {
    LOCKED: 'locked',       // Not yet available
    UNLOCKED: 'unlocked',   // Currently available
    EXPIRED: 'expired'      // No longer available
};

class DateLockService {
    constructor() {
        // Check interval for countdown updates (1 minute)
        this.checkInterval = null;
    }

    /**
     * Start periodic checks for date changes
     * @param {Function} callback - Called when status changes
     */
    startWatching(callback) {
        // Check every minute
        this.checkInterval = setInterval(() => {
            callback();
        }, 60000);
    }

    /**
     * Stop watching
     */
    stopWatching() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check availability status of a message
     * @param {Object} message - { availableFrom, availableTo, ... }
     * @returns {Object} { status, message, daysUntil, daysRemaining }
     */
    checkAvailability(message) {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize to start of day

        const from = message.availableFrom ? this.parseDate(message.availableFrom) : null;
        const to = message.availableTo ? this.parseDate(message.availableTo) : null;

        // No date restrictions
        if (!from && !to) {
            return {
                status: LockStatus.UNLOCKED,
                message: null
            };
        }

        // Check if not yet available
        if (from && now < from) {
            const daysUntil = this.daysBetween(now, from);
            return {
                status: LockStatus.LOCKED,
                message: this.formatLockedMessage(from, daysUntil),
                daysUntil,
                availableFrom: from
            };
        }

        // Check if expired
        if (to && now > to) {
            return {
                status: LockStatus.EXPIRED,
                message: t('dateLock.expired'),
                expiredOn: to
            };
        }

        // Currently available
        const result = {
            status: LockStatus.UNLOCKED,
            message: null
        };

        // Add remaining days if there's an end date
        if (to) {
            const daysRemaining = this.daysBetween(now, to);
            result.message = t('dateLock.availableUntil', {
                date: this.formatDate(to)
            });
            result.daysRemaining = daysRemaining;
            result.availableTo = to;
        }

        return result;
    }

    /**
     * Annotate tracks with their availability status
     * @param {Array} tracks - Array of track objects
     * @returns {Array} Tracks with lockStatus added
     */
    annotatePlaylist(tracks) {
        return tracks.map(track => ({
            ...track,
            lockInfo: this.checkAvailability(track)
        }));
    }

    /**
     * Get the next unlock time from a list of tracks
     * @param {Array} tracks - Array of track objects
     * @returns {Date|null} Next unlock date or null
     */
    getNextUnlock(tracks) {
        const now = new Date();
        let nextUnlock = null;

        for (const track of tracks) {
            const from = track.availableFrom ? this.parseDate(track.availableFrom) : null;

            if (from && from > now) {
                if (!nextUnlock || from < nextUnlock) {
                    nextUnlock = from;
                }
            }
        }

        return nextUnlock;
    }

    /**
     * Parse date string to Date object
     * Supports YYYY-MM-DD format
     * @param {string} dateStr
     * @returns {Date}
     */
    parseDate(dateStr) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    /**
     * Calculate days between two dates
     * @param {Date} from
     * @param {Date} to
     * @returns {number}
     */
    daysBetween(from, to) {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.ceil((to - from) / msPerDay);
    }

    /**
     * Format date for display
     * @param {Date} date
     * @returns {string}
     */
    formatDate(date) {
        const lang = i18n.getLanguage();

        return date.toLocaleDateString(lang, {
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format locked message based on days until available
     * @param {Date} availableDate
     * @param {number} days
     * @returns {string}
     */
    formatLockedMessage(availableDate, days) {
        if (days === 0) {
            // Available later today (edge case)
            return t('dateLock.unlocked');
        } else if (days === 1) {
            return t('dateLock.availableIn', { days: 1 });
        } else if (days <= 7) {
            return t('dateLock.availableIn', { days });
        } else {
            return t('dateLock.availableOn', {
                date: this.formatDate(availableDate)
            });
        }
    }

    /**
     * Check if a specific date is a special occasion
     * Useful for birthday/holiday detection
     * @param {Date} date
     * @returns {Object|null} { type, name } or null
     */
    detectOccasion(date) {
        const month = date.getMonth() + 1; // 1-12
        const day = date.getDate();

        // Common occasions
        const occasions = [
            { month: 12, day: 25, type: 'christmas', name: 'Christmas' },
            { month: 12, day: 24, type: 'christmas_eve', name: 'Christmas Eve' },
            { month: 12, day: 31, type: 'new_year_eve', name: "New Year's Eve" },
            { month: 1, day: 1, type: 'new_year', name: "New Year's Day" },
            { month: 2, day: 14, type: 'valentines', name: "Valentine's Day" },
            { month: 10, day: 31, type: 'halloween', name: 'Halloween' }
        ];

        for (const occasion of occasions) {
            if (occasion.month === month && occasion.day === day) {
                return { type: occasion.type, name: occasion.name };
            }
        }

        return null;
    }

    /**
     * Create a countdown string
     * @param {Date} targetDate
     * @returns {string}
     */
    getCountdown(targetDate) {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) return '';

        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

        if (days > 0) {
            return t('dateLock.availableIn', { days });
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
}

// Export singleton instance
export const dateLock = new DateLockService();
