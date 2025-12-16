// components/apiSetupForm.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';

class ApiSetupForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .api-setup-container {
                    padding: 1rem;
                }
                .status-box {
                    padding: 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    margin-bottom: 1.5rem;
                }
                .status-box.warning {
                    background-color: #fffbeb;
                    border: 1px solid #fcd34d;
                    color: #92400e;
                }
                .form-input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #d1d5db;
                    border-radius: 0.5rem;
                    transition: border-color 0.3s ease;
                }
                .form-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                }
                .btn {
                    padding: 0.75rem 1.5rem;
                    font-weight: 700;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    border: none;
                    transition: background-color 0.3s ease;
                }
                .btn-primary {
                    background-color: var(--primary-color);
                    color: #ffffff;
                }
                .btn-primary:hover {
                    background-color: var(--button-hover);
                }
            </style>
            <div class="api-setup-container">
                <div class="status-box warning">
                    <p><span class="font-bold">Note:</span> This app writes messages to a simulated NFC tag. A real app would use the Web NFC API.</p>
                </div>
                <h3>Pinata IPFS Credentials</h3>
                <div class="flex flex-col space-y-4">
                    <input type="text" id="pinata-api-key" placeholder="Pinata API Key" class="form-input">
                    <input type="password" id="pinata-secret" placeholder="Pinata Secret API Key" class="form-input">
                    <button id="set-credentials-btn" class="btn btn-primary">Set Credentials</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelector('#set-credentials-btn').addEventListener('click', () => {
            const apiKey = this.shadowRoot.querySelector('#pinata-api-key').value.trim();
            const secret = this.shadowRoot.querySelector('#pinata-secret').value.trim();
            
            if (apiKey && secret) {
                eventBus.publish('credentials-set', { apiKey, secret });
                log('Pinata credentials set. Ready to create your playlist.', 'success');
            } else {
                log('Please fill in all fields.', 'warning');
            }
        });
    }
    
    setCredentials(apiKey, secret) {
        this.shadowRoot.querySelector('#pinata-api-key').value = apiKey;
        this.shadowRoot.querySelector('#pinata-secret').value = secret;
    }
}

customElements.define('api-setup-form', ApiSetupForm);