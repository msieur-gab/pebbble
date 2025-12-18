/**
 * I18nService - Internationalization service
 * Handles language detection, loading translations, and text interpolation
 */

import { eventBus, Events } from './EventBus.js';

class I18nService {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
        this.supportedLanguages = ['en', 'fr', 'zh', 'es'];
        this.defaultLanguage = 'en';
        this.isReady = false;
    }

    /**
     * Initialize i18n with auto-detection
     */
    async init() {
        // Try to get saved preference
        const savedLang = localStorage.getItem('pebbble-language');

        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
        } else {
            // Auto-detect from browser
            this.currentLanguage = this.detectLanguage();
        }

        await this.loadTranslations(this.currentLanguage);
    }

    /**
     * Detect browser language and map to supported language
     * @returns {string} Language code
     */
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();

        if (this.supportedLanguages.includes(langCode)) {
            return langCode;
        }

        return this.defaultLanguage;
    }

    /**
     * Load translations for a language
     * @param {string} lang - Language code
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`./js/i18n/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);

            this.translations = await response.json();
            this.currentLanguage = lang;
            this.isReady = true;

            // Update document language
            document.documentElement.lang = lang;

            // Notify listeners
            eventBus.emit(Events.LANGUAGE_CHANGE, { language: lang });

        } catch (error) {
            console.error('I18nService: Failed to load translations', error);

            // Fallback to English if not already
            if (lang !== this.defaultLanguage) {
                await this.loadTranslations(this.defaultLanguage);
            }
        }
    }

    /**
     * Change language
     * @param {string} lang - Language code
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`I18nService: Unsupported language "${lang}"`);
            return;
        }

        localStorage.setItem('pebbble-language', lang);
        await this.loadTranslations(lang);
    }

    /**
     * Get translation by key path (dot notation)
     * @param {string} key - Key path like "welcome.title"
     * @param {Object} [params] - Interpolation parameters
     * @returns {string} Translated string
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Only warn if translations are loaded (avoid spam before init)
                if (this.isReady) {
                    console.warn(`I18nService: Missing translation for "${key}"`);
                }
                return key; // Return key as fallback
            }
        }

        if (typeof value !== 'string') {
            if (this.isReady) {
                console.warn(`I18nService: Translation for "${key}" is not a string`);
            }
            return key;
        }

        // Interpolate parameters
        return this.#interpolate(value, params);
    }

    /**
     * Interpolate parameters into a string (internal)
     * Supports {param} syntax
     * @param {string} str - String with placeholders
     * @param {Object} params - Parameters to interpolate
     * @returns {string} Interpolated string
     */
    #interpolate(str, params) {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return key in params ? params[key] : match;
        });
    }

    /**
     * Get current language code
     * @returns {string} Language code
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get all supported languages
     * @returns {Array<{code: string, name: string}>} Supported languages
     */
    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'fr', name: 'Français' },
            { code: 'zh', name: '中文' },
            { code: 'es', name: 'Español' }
        ];
    }
}

// Export singleton instance
export const i18n = new I18nService();

// Shorthand for translations
export const t = (key, params) => i18n.t(key, params);
