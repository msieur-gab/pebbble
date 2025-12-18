/**
 * Toast - Simple notification component
 * Listens to EventBus SHOW_TOAST events and displays messages
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';

class Toast extends LitElement {
    static properties = {
        currentToast: { state: true },
        visible: { state: true }
    };

    static styles = css`
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
    `;

    constructor() {
        super();
        this.queue = [];
        this.currentToast = null;
        this.visible = false;
        this.timeout = null;
        this.unsubscribers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        this.unsubscribers.push(
            eventBus.on(Events.SHOW_TOAST, (data) => this.show(data))
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        if (this.timeout) clearTimeout(this.timeout);
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
        this.visible = false;

        // Show after a frame for animation
        requestAnimationFrame(() => {
            this.visible = true;
        });

        // Auto-dismiss
        if (toast.duration > 0) {
            this.timeout = setTimeout(() => this.dismiss(), toast.duration);
        }
    }

    dismiss() {
        if (this.timeout) clearTimeout(this.timeout);
        this.visible = false;

        setTimeout(() => {
            this.currentToast = null;
            if (this.queue.length > 0) {
                this.displayToast(this.queue.shift());
            }
        }, 300);
    }

    handleAction() {
        if (this.currentToast?.action?.callback) {
            this.currentToast.action.callback();
        }
        this.dismiss();
    }

    render() {
        if (!this.currentToast) {
            return html`<div class="toast"></div>`;
        }

        const { message, type, action } = this.currentToast;

        return html`
            <div class="toast toast--${type} ${this.visible ? 'toast--visible' : ''}">
                <span class="toast__message">${message}</span>
                ${action ? html`
                    <button class="toast__action" @click=${this.handleAction}>
                        ${action.label}
                    </button>
                ` : ''}
                <button class="toast__dismiss" aria-label="Dismiss" @click=${this.dismiss}>×</button>
            </div>
        `;
    }
}

customElements.define('toast-notification', Toast);

export default Toast;
