/**
 * Toast - Simple notification component
 * Listens to EventBus SHOW_TOAST events and displays messages
 */

import { eventBus, Events } from '../services/EventBus.js';

class Toast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.queue = [];
        this.currentToast = null;
        this.unsubscribers = [];
    }

    connectedCallback() {
        this.render();
        this.unsubscribers.push(
            eventBus.on(Events.SHOW_TOAST, (data) => this.show(data))
        );
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    show({ message, type = 'info', duration = 4000, action = null }) {
        const toast = { message, type, duration, action, id: Date.now() };

        if (this.currentToast) {
            this.queue.push(toast);
        } else {
            this.displayToast(toast);
        }
    }

    displayToast(toast) {
        this.currentToast = toast;
        const container = this.shadowRoot.getElementById('toast');

        container.className = `toast toast--${toast.type}`;
        container.innerHTML = `
            <span class="toast__message">${toast.message}</span>
            ${toast.action ? `<button class="toast__action">${toast.action.label}</button>` : ''}
            <button class="toast__dismiss" aria-label="Dismiss">×</button>
        `;

        // Action button
        const actionBtn = container.querySelector('.toast__action');
        if (actionBtn && toast.action?.callback) {
            actionBtn.onclick = () => {
                toast.action.callback();
                this.dismiss();
            };
        }

        // Dismiss button
        container.querySelector('.toast__dismiss').onclick = () => this.dismiss();

        // Show
        requestAnimationFrame(() => container.classList.add('toast--visible'));

        // Auto-dismiss
        if (toast.duration > 0) {
            this.timeout = setTimeout(() => this.dismiss(), toast.duration);
        }
    }

    dismiss() {
        if (this.timeout) clearTimeout(this.timeout);

        const container = this.shadowRoot.getElementById('toast');
        container.classList.remove('toast--visible');

        setTimeout(() => {
            this.currentToast = null;
            if (this.queue.length > 0) {
                this.displayToast(this.queue.shift());
            }
        }, 300);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    pointer-events: none;
                }

                .toast {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.875rem 1rem;
                    background: #333;
                    color: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    font-size: 0.9rem;
                    max-width: 90vw;
                    opacity: 0;
                    transform: translateY(1rem);
                    transition: opacity 0.3s, transform 0.3s;
                    pointer-events: auto;
                }

                .toast--visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                .toast--success { background: #166534; }
                .toast--error { background: #991b1b; }
                .toast--warning { background: #92400e; }
                .toast--info { background: #1e40af; }

                .toast__message {
                    flex: 1;
                    line-height: 1.4;
                }

                .toast__action {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: #fff;
                    padding: 0.375rem 0.75rem;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.8rem;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .toast__action:hover {
                    background: rgba(255,255,255,0.3);
                }

                .toast__dismiss {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.7);
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0 0.25rem;
                    line-height: 1;
                }

                .toast__dismiss:hover {
                    color: #fff;
                }

                @media (prefers-reduced-motion: reduce) {
                    .toast { transition: opacity 0.15s; transform: none; }
                    .toast--visible { transform: none; }
                }
            </style>
            <div id="toast" class="toast"></div>
        `;
    }
}

customElements.define('toast-notification', Toast);

export default Toast;
