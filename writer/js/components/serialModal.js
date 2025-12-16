// js/components/serialModal.js

import { eventBus } from '../services/eventBus.js';
import { log } from '../utils/log.js';
import { NFCService } from '../services/nfcService.js';
import './ui/modal.js';

class SerialModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.nfcService = new NFCService();
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .text-center { text-align: center; }
                .space-y-4 > * + * { margin-top: 1rem; }
                .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
                
                .btn { padding: 0.75rem 1.5rem; font-weight: 700; border-radius: 0.5rem; cursor: pointer; border: none; transition: background-color 0.3s ease; }
                .btn-primary { background-color: var(--primary-color); color: #ffffff; }
                .btn-primary:hover { background-color: var(--button-hover); }
                .btn-secondary { background-color: #e5e7eb; color: #1f2937; }
                .btn-secondary:hover { background-color: #d1d5db; }
                .btn:disabled { opacity: 0.6; cursor: not-allowed; }
                
                .form-input { width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 0.5rem; transition: border-color 0.3s ease; }
                .form-input:focus { outline: none; border-color: var(--primary-color); }
            </style>
            <modal-component id="serial-modal-content">
                <div class="modal-content text-center space-y-4">
                    <h3>Set Pebbble Serial</h3>
                    <p>Scan a Pebbble or enter the serial number manually to finalize your playlist.</p>
                    <button id="modal-scan-serial-btn" class="btn btn-primary">Scan Pebbble (NFC)</button>
                    <div class="my-6 text-gray-400">-- OR --</div>
                    <input type="text" id="modal-manual-serial-input" placeholder="Enter Pebbble Serial Manually" class="form-input">
                    <button id="modal-manual-serial-btn" class="btn btn-secondary">Set Serial Manually</button>
                    <button id="modal-cancel-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </modal-component>
        `;
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelector('#modal-cancel-btn').addEventListener('click', () => {
            eventBus.publish('modal-close');
        });

        this.shadowRoot.querySelector('#modal-scan-serial-btn').addEventListener('click', () => {
            this.handleScanRequest();
        });

        this.shadowRoot.querySelector('#modal-manual-serial-btn').addEventListener('click', () => {
            const serial = this.shadowRoot.querySelector('#modal-manual-serial-input').value.trim();
            this.handleManualSerial(serial);
        });
    }

    async handleScanRequest() {
        const scanBtn = this.shadowRoot.querySelector('#modal-scan-serial-btn');
        scanBtn.disabled = true;
        scanBtn.textContent = 'Tap a Pebbble to scan...';

        try {
            await this.nfcService.startReader((serial) => {
                this.nfcService.stopReader();
                if (serial) {
                    log(`NFC tag scanned: ${serial}`, 'success');
                    eventBus.publish('serial-received', serial);
                } else {
                    log('No serial number found on the tag.', 'warning');
                    scanBtn.textContent = 'No serial found - try again';
                    setTimeout(() => {
                        scanBtn.disabled = false;
                        scanBtn.textContent = 'Scan Pebbble (NFC)';
                    }, 2000);
                }
            });
        } catch (e) {
            log(`NFC scan failed: ${e.message}`, 'error');
            scanBtn.textContent = 'Scan failed - try manual entry';
            setTimeout(() => {
                scanBtn.disabled = false;
                scanBtn.textContent = 'Scan Pebbble (NFC)';
            }, 2000);
        }
    }

    handleManualSerial(serial) {
        if (!serial) {
            log('Please enter a valid serial number.', 'warning');
            return;
        }
        log(`Manual serial entered: ${serial}`, 'info');
        eventBus.publish('serial-received', serial);
    }
}

customElements.define('serial-modal', SerialModal);