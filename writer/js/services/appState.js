// js/services/appState.js
// UPDATED VERSION with better debug detection

import { eventBus } from './eventBus.js';
import { log } from '../utils/log.js';

class AppState {
    constructor() {
        this.state = {
            currentView: 'apiSetupForm',
            isProcessing: false,
            apiCredentials: { 
                key: null, 
                secret: null,
                isSet: false 
            },
            currentPlaylist: null,
            currentTagSerial: null,
            showFab: false
        };
        
        this.subscribers = new Map();
        
        // Always expose in development (more permissive check)
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'file:' ||
                     window.location.port !== '';
                     
        if (isDev) {
            window.appState = this;
            window.debugAppState = this.getDebugInfo.bind(this);
            console.log('🎉 AppState debug tools available!');
            console.log('Try: window.appState or window.debugAppState()');
        }
        
        log('AppState initialized', 'info');
    }

    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, []);
        }
        this.subscribers.get(key).push(callback);
        
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) callbacks.splice(index, 1);
            }
        };
    }

    get(key) {
        return key ? this.state[key] : this.state;
    }

    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (oldValue !== value) {
            this.notify(key, value, oldValue);
            console.log(`🔄 State: ${key} =`, value);
        }
    }

    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    notify(key, newValue, oldValue) {
        const callbacks = this.subscribers.get(key) || [];
        callbacks.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error(`Error in state subscriber for ${key}:`, error);
            }
        });
        
        eventBus.publish(`state:${key}`, { newValue, oldValue });
    }

    navigateTo(view, data = null) {
        log(`Navigating to: ${view}`, 'info');
        this.set('currentView', view);
        if (data) {
            eventBus.publish(`navigate:${view}`, data);
        }
    }

    startProcessing(message = 'Processing...') {
        this.update({
            isProcessing: true
        });
        eventBus.publish('show-toast', { message, type: 'info' });
    }

    stopProcessing() {
        this.set('isProcessing', false);
    }

    showToast(message, type = 'info') {
        eventBus.publish('show-toast', { message, type });
    }

    setCredentials(apiKey, secret) {
        this.update({
            apiCredentials: {
                key: apiKey,
                secret: secret,
                isSet: !!(apiKey && secret)
            }
        });
    }

    getDebugInfo() {
        const info = {
            state: this.state,
            subscriberCount: Array.from(this.subscribers.entries()).map(([key, callbacks]) => ({
                key,
                count: callbacks.length
            }))
        };
        
        console.table(info.subscriberCount);
        console.log('Current state:', info.state);
        return info;
    }
}

// Export singleton instance
export const appState = new AppState();

// Always log that we're ready
console.log('✅ AppState module loaded successfully');