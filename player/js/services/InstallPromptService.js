/**
 * InstallPromptService - PWA install prompt for iOS and Android
 * Uses Toast to show install prompts
 */

import { eventBus, Events } from './EventBus.js';

class InstallPromptService {
    constructor() {
        this.deferredPrompt = null;
    }

    init() {
        if (this.isStandalone()) return;

        const dismissed = localStorage.getItem('pebbble-install-dismissed');
        if (dismissed) {
            const daysSince = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return;
        }

        if (this.isIOS()) {
            this.showIOSPrompt();
        } else {
            this.setupAndroidPrompt();
        }
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    showIOSPrompt() {
        setTimeout(() => {
            eventBus.emit(Events.SHOW_TOAST, {
                message: 'Install: tap Share then "Add to Home Screen"',
                type: 'info',
                duration: 8000,
                action: {
                    label: 'Got it',
                    callback: () => this.dismiss()
                }
            });
        }, 3000);
    }

    setupAndroidPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;

            setTimeout(() => {
                eventBus.emit(Events.SHOW_TOAST, {
                    message: 'Install Pebbble for offline access',
                    type: 'info',
                    duration: 0,
                    action: {
                        label: 'Install',
                        callback: () => this.install()
                    }
                });
            }, 3000);
        });
    }

    async install() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            eventBus.emit(Events.SHOW_TOAST, {
                message: 'Installing...',
                type: 'success',
                duration: 2000
            });
        }

        this.deferredPrompt = null;
    }

    dismiss() {
        localStorage.setItem('pebbble-install-dismissed', Date.now().toString());
    }
}

export const installPrompt = new InstallPromptService();
