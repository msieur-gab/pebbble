// js/components/writerResults.js

import { log } from '../utils/log.js';
import { eventBus } from '../services/eventBus.js';
import { NFCService } from '../services/nfcService.js';

class WriterResults extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.nfcService = new NFCService();
        this.currentTagSerial = null;
        this.nfcUrl = '';
        
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; padding: 1rem; }
                .results-container {
                    text-align: center;
                    max-width: 500px;
                    margin: 0 auto;
                }
                .success-header {
                    color: var(--success-color);
                    margin-bottom: 1rem;
                }
                .nfc-url-section {
                    background-color: #f9fafb;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1.5rem 0;
                    border: 1px solid #e5e7eb;
                }
                .nfc-url-display {
                    background-color: #1f2937;
                    color: #d1d5db;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    font-family: monospace;
                    font-size: 0.875rem;
                    word-break: break-all;
                    margin: 1rem 0;
                    border: none;
                    outline: none;
                }
                .nfc-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin: 1.5rem 0;
                }
                .btn {
                    padding: 0.75rem 1.5rem;
                    font-weight: 700;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    border: none;
                    transition: all 0.3s ease;
                }
                .btn-primary {
                    background-color: var(--primary-color);
                    color: #ffffff;
                }
                .btn-primary:hover:not(:disabled) {
                    background-color: var(--button-hover);
                }
                .btn-secondary {
                    background-color: #e5e7eb;
                    color: #1f2937;
                }
                .btn-secondary:hover {
                    background-color: #d1d5db;
                }
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .instructions {
                    color: var(--secondary-color);
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }
                .warning-text {
                    color: var(--accent-color);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
            </style>
            <div class="results-container">
                <h3 class="success-header">🎉 Playlist Ready!</h3>
                <p class="instructions">
                    Your playlist has been successfully encrypted and uploaded. 
                    Now write it to your Pebbble tag to complete the process.
                </p>
                
                <div class="nfc-url-section">
                    <h4>Generated URL:</h4>
                    <textarea 
                        id="nfc-url-display" 
                        class="nfc-url-display" 
                        readonly 
                        placeholder="URL will appear here..."
                    ></textarea>
                    <p class="warning-text">
                        ⚠️ Keep this URL safe! It contains your encrypted playlist.
                    </p>
                </div>

                <div class="nfc-actions">
                    <button id="copy-url-btn" class="btn btn-secondary">
                        📋 Copy URL
                    </button>
                    <button id="write-nfc-btn" class="btn btn-primary">
                        📱 Write to Pebbble
                    </button>
                </div>

                <div class="nfc-actions">
                    <button id="back-to-home-btn" class="btn btn-secondary">
                        🏠 Back to Home
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const copyBtn = this.shadowRoot.querySelector('#copy-url-btn');
        const writeBtn = this.shadowRoot.querySelector('#write-nfc-btn');
        const backBtn = this.shadowRoot.querySelector('#back-to-home-btn');
        const urlDisplay = this.shadowRoot.querySelector('#nfc-url-display');

        copyBtn.addEventListener('click', () => this.copyUrlToClipboard());
        writeBtn.addEventListener('click', () => this.initiateNFCWrite());
        backBtn.addEventListener('click', () => this.goBackToHome());

        // Auto-select URL when clicked for easy copying
        urlDisplay.addEventListener('click', () => urlDisplay.select());
    }

    // Public method to set the results data
    setResults(data) {
        this.nfcUrl = data.url || '';
        this.currentTagSerial = data.serial || '';
        this.playlistName = data.playlistName || 'Playlist';
        
        const urlDisplay = this.shadowRoot.querySelector('#nfc-url-display');
        urlDisplay.value = this.nfcUrl;
        
        // Update header with playlist name
        const header = this.shadowRoot.querySelector('.success-header');
        header.textContent = `🎉 "${this.playlistName}" Ready!`;
        
        log(`Writer results loaded for playlist: ${this.playlistName}`, 'success');
    }

    async copyUrlToClipboard() {
        const copyBtn = this.shadowRoot.querySelector('#copy-url-btn');
        
        try {
            await navigator.clipboard.writeText(this.nfcUrl);
            
            // Provide visual feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.backgroundColor = 'var(--success-color)';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '';
            }, 2000);
            
            log('URL copied to clipboard', 'success');
        } catch (error) {
            log('Failed to copy URL to clipboard', 'error');
            
            // Fallback: select the text for manual copying
            const urlDisplay = this.shadowRoot.querySelector('#nfc-url-display');
            urlDisplay.select();
            urlDisplay.setSelectionRange(0, 99999); // For mobile devices
        }
    }

    async initiateNFCWrite() {
        const writeBtn = this.shadowRoot.querySelector('#write-nfc-btn');
        const urlDisplay = this.shadowRoot.querySelector('#nfc-url-display');
        
        if (!this.nfcUrl) {
            log('No URL available to write', 'error');
            return;
        }

        writeBtn.disabled = true;
        writeBtn.textContent = '📱 Tap Pebbble to Verify...';
        
        try {
            await this.nfcService.startReader(async (scannedSerial) => {
                this.nfcService.stopReader();
                
                // Verify this is the same tag that was originally scanned
                if (scannedSerial === this.currentTagSerial) {
                    log('Serial verification successful. Writing URL...', 'success');
                    writeBtn.textContent = '⚡ Writing...';
                    
                    try {
                        await this.nfcService.writeUrl(this.nfcUrl);
                        
                        // Success feedback
                        writeBtn.textContent = '✅ Write Complete!';
                        writeBtn.style.backgroundColor = 'var(--success-color)';
                        urlDisplay.value = '✅ Successfully written to Pebbble!';
                        
                        log('URL successfully written to NFC tag', 'success');
                        
                        // Emit success event
                        eventBus.publish('nfc-write-success', {
                            url: this.nfcUrl,
                            serial: this.currentTagSerial,
                            playlistName: this.playlistName
                        });
                        
                    } catch (writeError) {
                        throw new Error(`Write failed: ${writeError.message}`);
                    }
                    
                } else {
                    throw new Error(`Security verification failed. Expected serial "${this.currentTagSerial}" but got "${scannedSerial}". Please use the correct Pebbble.`);
                }
            });
            
        } catch (error) {
            log(`NFC operation failed: ${error.message}`, 'error');
            
            // Error feedback
            writeBtn.textContent = '❌ Write Failed';
            writeBtn.style.backgroundColor = 'var(--accent-color)';
            urlDisplay.value = `Error: ${error.message}`;
            
            // Reset button after delay
            setTimeout(() => {
                writeBtn.disabled = false;
                writeBtn.textContent = '📱 Write to Pebbble';
                writeBtn.style.backgroundColor = '';
                urlDisplay.value = this.nfcUrl;
            }, 3000);
        }
    }

    goBackToHome() {
        eventBus.publish('navigate-to-home');
        log('Returning to home screen', 'info');
    }

    // Public method to reset the component
    reset() {
        this.nfcUrl = '';
        this.currentTagSerial = null;
        this.playlistName = '';
        
        const urlDisplay = this.shadowRoot.querySelector('#nfc-url-display');
        const writeBtn = this.shadowRoot.querySelector('#write-nfc-btn');
        
        urlDisplay.value = '';
        writeBtn.disabled = false;
        writeBtn.textContent = '📱 Write to Pebbble';
        writeBtn.style.backgroundColor = '';
    }
}

customElements.define('writer-results', WriterResults);