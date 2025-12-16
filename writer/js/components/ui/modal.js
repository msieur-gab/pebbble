// components/modal.js

import { eventBus } from '../../services/eventBus.js';

class ModalComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 20;
                    display: none; /* Initially hidden */
                }
                .modal.visible {
                    display: flex;
                }
                .modal-content {
                    background-color: white;
                    padding: 2rem;
                    border-radius: 1rem;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    width: 90%;
                    max-width: 400px;
                }
            </style>
            <div class="modal" id="modal-container">
                <div class="modal-content">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.querySelector('#modal-container').addEventListener('click', (e) => {
            if (e.target.id === 'modal-container') {
                this.close();
            }
        });
    }

    open() {
        this.shadowRoot.querySelector('#modal-container').classList.add('visible');
    }

    close() {
        this.shadowRoot.querySelector('#modal-container').classList.remove('visible');
        eventBus.publish('modal-closed');
    }
}
customElements.define('modal-component', ModalComponent);