// main.js
// This is the main entry point of the application. It sets up the core event listeners and
// imports the main Web Component `app-writer`, which encapsulates the entire application.

// main.js

import { log } from './js/utils/log.js';
import { config } from './config.js';
// import './js/components/writerApp.js';
import './js/components/mainApp.js';
import './js/components/ui/toast.js'; // Import the new toast component

document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('logContainer');
    if (!config.DEBUG_MODE) {
        logContainer.style.display = 'none';
    } else {
        log('Application initialized. Debug mode is active.', 'info');
    }
});