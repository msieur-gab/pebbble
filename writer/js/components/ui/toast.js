// js/components/ui/toast.js - Mobile-Friendly

import { eventBus } from '../../services/eventBus.js';

class ToastComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.toastQueue = [];
        this.isShowing = false;
        eventBus.subscribe('show-toast', this.handleShowToast.bind(this));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 5rem;
                    left: 1rem;
                    right: 1rem;
                    z-index: 40;
                    display: flex;
                    flex-direction: column-reverse;
                    align-items: center;
                    pointer-events: none;
                }
                
                .toast {
                    background-color: var(--primary-color);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 0.75rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease-in-out;
                    margin-top: 0.5rem;
                    text-align: center;
                    pointer-events: auto;
                    max-width: 100%;
                    font-size: 0.875rem;
                    line-height: 1.4;
                    cursor: pointer;
                    /* Disable text selection */
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .toast.success { 
                    background-color: var(--success-color); 
                }
                
                .toast.error { 
                    background-color: var(--accent-color); 
                }
                
                .toast.warning { 
                    background-color: var(--warning-color);
                    color: #1f2937;
                }
                
                .toast.info { 
                    background-color: #3b82f6; 
                }
                
                /* Tablet and up: center positioning */
                @media (min-width: 768px) {
                    :host {
                        bottom: 2rem;
                        left: 50%;
                        right: auto;
                        transform: translateX(-50%);
                    }
                    
                    .toast {
                        min-width: 250px;
                        max-width: 400px;
                    }
                }
            </style>
        `;
    }

    handleShowToast(data) {
        this.toastQueue.push(data);
        if (!this.isShowing) {
            this.processQueue();
        }
    }

    processQueue() {
        if (this.toastQueue.length === 0) {
            this.isShowing = false;
            return;
        }

        this.isShowing = true;
        const data = this.toastQueue.shift();
        const toast = document.createElement('div');
        toast.className = `toast show ${data.type || 'info'}`;
        toast.textContent = data.message;
        
        this.shadowRoot.appendChild(toast);

        // Auto-dismiss after duration
        const duration = data.duration || 3000;
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
                this.processQueue();
            }, { once: true });
        }, duration);
        
        // Allow manual dismissal on tap
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
        });
    }
}

customElements.define('toast-component', ToastComponent);