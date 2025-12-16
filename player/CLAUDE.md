# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pebbble Player is a Progressive Web App for playing secure, encrypted voice message playlists stored on IPFS using NFC tags. The **physical NFC tag acts as the decryption key** - messages can only be decrypted using the unique serial number from the original Pebbble tag.

This is the **player-only** repository. The companion writer app lives at `pebbble-write`.

## Architecture

The application uses a modular architecture with vanilla Web Components (Shadow DOM), event-driven communication, and zero external JavaScript dependencies.

### Technology Stack
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, no frameworks
- **Web Components** - Shadow DOM encapsulation
- **IndexedDB** - Offline storage via native wrapper
- **Service Worker** - PWA caching
- **Web NFC API** - Tag reading
- **Web Crypto API** - AES-256-GCM decryption
- **Media Session API** - Lock screen controls

### Services (`js/services/`)

| Service | Purpose |
|---------|---------|
| `EventBus.js` | Pub/sub communication between components |
| `I18nService.js` | Internationalization (en, fr, zh, es) with auto-detection |
| `StorageService.js` | IndexedDB wrapper with personal/shared device modes |
| `NFCService.js` | Web NFC API wrapper for tag reading |
| `CryptoService.js` | PBKDF2 key derivation + AES-GCM decryption |
| `IPFSService.js` | Multi-gateway IPFS fetching with fallback |
| `AudioService.js` | Playback control + Media Session integration |
| `DateLockService.js` | Recurring annual date-locked content |

### Components (`js/components/`)

| Component | Element | Purpose |
|-----------|---------|---------|
| `PeeblePlayer.js` | `<pebbble-player>` | Main app shell, screen state machine |
| `NfcPrompt.js` | `<nfc-prompt>` | NFC activation with animated rings |
| `MagicStoneWelcome.js` | `<magic-stone-welcome>` | Welcome animation screen |
| `DeviceModeSelector.js` | `<device-mode-selector>` | Personal vs shared device choice |
| `PlaylistView.js` | `<playlist-view>` | Track list with lock indicators |
| `PlayerControls.js` | `<player-controls>` | Play/pause, prev/next, progress |
| `StoneCanvas.js` | `<stone-canvas>` | Animated stone visualization |
| `PlaybackModes.js` | `<playback-modes>` | Repeat mode toggle |
| `SleepTimer.js` | `<sleep-timer>` | Timer to stop playback |
| `LanguageSelector.js` | `<language-selector>` | Language dropdown |

### Application Flow

```
NFC_PROMPT → WELCOME → DEVICE_MODE → LOADING → PLAYER
```

1. User taps "Activate NFC" to request permissions
2. User scans Pebbble tag (reads URL + serial number)
3. Welcome screen shows "You have a magic stone!"
4. User selects device mode (personal saves locally, shared is memory-only)
5. App fetches playlist from IPFS, decrypts with tag serial
6. Player UI displays with tracks, controls, and stone animation

## File Structure

```
pebbble-play-main/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── CLAUDE.md               # This file
├── css/
│   ├── base.css            # Reset, custom properties, typography
│   ├── components.css      # Component styles
│   └── animations.css      # Keyframes and animation utilities
├── js/
│   ├── app.js              # Application entry point
│   ├── services/
│   │   ├── EventBus.js
│   │   ├── I18nService.js
│   │   ├── StorageService.js
│   │   ├── NFCService.js
│   │   ├── CryptoService.js
│   │   ├── IPFSService.js
│   │   ├── AudioService.js
│   │   └── DateLockService.js
│   ├── components/
│   │   ├── PeeblePlayer.js
│   │   ├── NfcPrompt.js
│   │   ├── MagicStoneWelcome.js
│   │   ├── DeviceModeSelector.js
│   │   ├── PlaylistView.js
│   │   ├── PlayerControls.js
│   │   ├── StoneCanvas.js
│   │   ├── PlaybackModes.js
│   │   ├── SleepTimer.js
│   │   └── LanguageSelector.js
│   └── i18n/
│       ├── en.json
│       ├── fr.json
│       ├── zh.json
│       └── es.json
└── assets/
    └── icons/              # PWA icons
```

## Development

### Running Locally

Serve with any HTTP server (HTTPS required for NFC):

```bash
python3 -m http.server 8000
# or
npx serve .
```

For NFC testing, use Chrome on Android with a valid HTTPS certificate or localhost.

### Adding Translations

1. Add keys to `js/i18n/en.json`
2. Add translations to other language files
3. Use `t('key.path')` or `t('key.path', { param: value })` in components

### Creating New Components

```javascript
import { eventBus, Events } from '../services/EventBus.js';
import { t } from '../services/I18nService.js';

class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.unsubscribers = [];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.SOME_EVENT, (data) => {
                // Handle event
            })
        );
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>/* scoped styles */</style>
            <div>${t('my.translation.key')}</div>
        `;
    }
}

customElements.define('my-component', MyComponent);
export default MyComponent;
```

### Event Bus Usage

```javascript
import { eventBus, Events } from './services/EventBus.js';

// Emit events
eventBus.emit(Events.PLAY);
eventBus.emit(Events.TRACK_CHANGE, { track, index });

// Subscribe (returns unsubscribe function)
const unsub = eventBus.on(Events.PLAY, (data) => { });

// Cleanup
unsub();
```

## Security Model

1. **Decryption key**: NFC tag's unique serial number (never stored or transmitted)
2. **Key derivation**: PBKDF2 with 100,000 iterations, serial as salt
3. **Encryption**: AES-256-GCM with 12-byte IV prepended to ciphertext
4. **Storage modes**:
   - **Personal**: Audio cached in IndexedDB for offline playback
   - **Shared**: Memory-only, cleared on close (for shared devices like schools)

## Storage Modes

### Personal Device
- Full IndexedDB persistence
- Audio files cached locally
- Preferences saved
- Works offline after initial load

### Shared Device
- No IndexedDB usage
- Audio kept in memory only
- Cleared when app closes
- Suitable for classroom/library devices

## Date-Locked Content

Tracks can have recurring annual date windows (e.g., Christmas messages available Dec 20-27 every year):

```javascript
// DateLockService checks availability
const status = dateLock.checkAvailability(track.dateLock);
// Returns: { status: 'available'|'upcoming'|'past', message: '...' }
```

## NFC Tag Format

Pebbble tags contain URLs with hash parameters:

```
https://play.pebbble.app/#playlistHash=Qm...
```

The `playlistHash` points to an IPFS manifest containing encrypted message references.

## IPFS Gateways

The app tries multiple gateways with fallback:
1. ipfs.io
2. cloudflare-ipfs.com
3. gateway.pinata.cloud
4. dweb.link

## PWA Features

- Installable on mobile devices
- Offline support via service worker
- Media Session API for lock screen controls
- App manifest with theme colors and icons
