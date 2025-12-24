/**
 * EventBus - Simple publish/subscribe pattern for component communication
 * Singleton instance for app-wide event handling
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function to remove
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
    }

    /**
     * Emit an event with optional data
     * @param {string} event - Event name
     * @param {*} data - Data to pass to handlers
     */
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`EventBus: Error in handler for "${event}"`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event (or all events)
     * @param {string} [event] - Optional event name
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

// Export singleton instance
export const eventBus = new EventBus();

// Event name constants for type safety
export const Events = {
    // NFC events
    NFC_ACTIVATE_REQUEST: 'nfc:activateRequest',
    NFC_ACTIVATED: 'nfc:activated',
    NFC_TAG_READ: 'nfc:tagRead',
    NFC_ERROR: 'nfc:error',

    // App flow events
    WELCOME_COMPLETE: 'app:welcomeComplete',
    DEVICE_MODE_SET: 'app:deviceModeSet',
    PLAYLIST_LOADED: 'app:playlistLoaded',

    // Player events
    TRACK_CHANGE: 'player:trackChange',
    PLAY: 'player:play',
    PAUSE: 'player:pause',
    SEEK: 'player:seek',
    TIME_UPDATE: 'player:timeUpdate',
    ENDED: 'player:ended',

    // Playback mode events
    REPEAT_MODE_CHANGE: 'player:repeatModeChange',

    // Timer events
    TIMER_SET: 'timer:set',
    TIMER_TICK: 'timer:tick',
    TIMER_COMPLETE: 'timer:complete',

    // Storage events
    STORAGE_READY: 'storage:ready',
    STORAGE_ERROR: 'storage:error',
    DOWNLOAD_PROGRESS: 'storage:downloadProgress',
    OFFLINE_PLAYLIST_SELECT: 'storage:offlinePlaylistSelect',

    // i18n events
    I18N_READY: 'i18n:ready',
    LANGUAGE_CHANGE: 'i18n:languageChange',

    // UI events
    SHOW_TOAST: 'ui:showToast',

    // Settings panel events
    SETTINGS_OPEN: 'settings:open',

    // Player sheet events
    PLAYER_SHEET_OPEN: 'player:sheetOpen',
    PLAYER_SHEET_EXPAND: 'player:sheetExpand',
    PLAYER_SHEET_COLLAPSE: 'player:sheetCollapse',

    // Tag detection
    TAG_DETECTED: 'app:tagDetected',

    // Onboarding
    ONBOARDING_COMPLETE: 'app:onboardingComplete'
};
