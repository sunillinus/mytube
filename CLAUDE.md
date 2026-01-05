# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyTube is a Chrome extension (Manifest V3) that adds keyboard controls and enhancements to YouTube's hover preview player and main player.

## Tech Stack

- Vanilla JavaScript (no framework)
- CSS3 for overlays and styling
- Chrome Extension Manifest V3

## Build Commands

```bash
# No build step required
# Load the extension folder directly as unpacked extension at chrome://extensions/
```

## Development Workflow

After making changes:
1. Go to chrome://extensions/
2. Click the refresh icon on the extension card
3. Reload the YouTube page to test

## Architecture

### Key Files
- `content.js` - Main content script with all functionality
- `styles.css` - Overlay and UI styling
- `manifest.json` - Extension configuration

### State Management
- `activeVideo` - Currently focused video element
- `currentSpeed` - Playback speed (persisted to chrome.storage)
- `zoomedElement` - Currently zoomed preview element
- `enhancedVideos: WeakSet` - Tracks which videos have been enhanced
- `videoOverlays: WeakMap` - Maps videos to their overlay elements

### Key Functions
- `enhanceVideo(video)` - Adds controls and listeners to a video element
- `handleKeydown(event)` - Keyboard shortcut dispatcher
- `toggleZoom(video)` - Zooms/unzooms hover preview
- `createOverlay(video)` - Creates progress bar and time display overlay
- `showGlobalToast(message)` - Shows speed change feedback

### Detection Logic
- `isMainPlayer(video)` - Checks if video is the main YouTube player
- `isShortsVideo(video)` - Excludes YouTube Shorts from enhancement
- Uses MutationObserver to detect dynamically created video elements

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `←`/`→` | Seek ±5s | Both |
| `J`/`L` | Seek ±10s | Both |
| `[`/`]` | Speed ±0.25x | Both |
| `\` | Reset speed to 1x | Both |
| `M` | Mute/unmute | Both |
| `P` | Picture-in-Picture | Both |
| `Space` | Pause/resume | Hover preview |
| `C` | Toggle captions | Hover preview |
| `Z` | Zoom 2.5x | Hover preview |
| `Escape` | Exit zoom | Hover preview |

## Design Decisions

- Speed persists across videos via chrome.storage.local
- Excludes YouTube Shorts (different player architecture)
- WeakSet/WeakMap used to avoid memory leaks with video elements
- Global toast element reused for all speed notifications
- Overlay wrapper pattern for progress bar positioning
