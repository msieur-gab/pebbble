// js/utils/domUtils.js

/**
 * Toggle visibility of multiple elements
 * @param {NodeList|Array} elements - Elements to hide
 * @param {Element} showElement - Element to show
 */
export function showOnly(elements, showElement) {
    elements.forEach(el => el?.classList.add('hidden'));
    showElement?.classList.remove('hidden');
}

/**
 * Create a simple button element
 * @param {string} text - Button text
 * @param {string} className - CSS class
 * @param {Function} onClick - Click handler
 * @returns {HTMLButtonElement}
 */
export function createButton(text, className = 'btn', onClick = null) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

/**
 * Create loading state for button
 * @param {HTMLButtonElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 * @returns {Function} Reset function
 */
export function setButtonLoading(button, loadingText = 'Loading...') {
    const originalText = button.textContent;
    const wasDisabled = button.disabled;
    
    button.textContent = loadingText;
    button.disabled = true;
    
    return () => {
        button.textContent = originalText;
        button.disabled = wasDisabled;
    };
}

/**
 * Safely query shadow root
 * @param {Element} element - Element with shadow root
 * @param {string} selector - CSS selector
 * @returns {Element|null}
 */
export function queryShadow(element, selector) {
    return element?.shadowRoot?.querySelector(selector) || null;
}

/**
 * Create empty state message
 * @param {string} message - Message to display
 * @param {string} icon - Emoji icon
 * @returns {HTMLElement}
 */
export function createEmptyState(message, icon = '📭') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <p>${message}</p>
    `;
    return div;
}