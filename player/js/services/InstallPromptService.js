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
        console.log('[InstallPrompt] Initializing...');
        console.log('[InstallPrompt] Standalone:', this.isStandalone());
        console.log('[InstallPrompt] iOS:', this.isIOS());

        if (this.isStandalone()) {
            console.log('[InstallPrompt] Already installed, skipping');
            return;
        }

        const dismissed = localStorage.getItem('pebbble-install-dismissed');
        if (dismissed) {
            const daysSince = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
            console.log('[InstallPrompt] Dismissed', daysSince.toFixed(1), 'days ago');
            if (daysSince < 7) return;
        }

        if (this.isIOS()) {
            console.log('[InstallPrompt] Showing iOS prompt in 3s...');
            this.showIOSPrompt();
        } else {
            console.log('[InstallPrompt] Setting up Android prompt listener...');
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
