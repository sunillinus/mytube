# YouTube Hover Preview Enhancement Extension

## Problem Statement

YouTube's homepage displays a grid of video thumbnails. When hovering over a thumbnail, a preview plays the full video. However, this preview experience is limited:

1. **No seeking** - Cannot skip ahead or back in the video
2. **No visible progress bar** - Progress indicator is inconsistent/hidden
3. **No keyboard controls** - Extensions that add playback speed shortcuts don't work on hover previews

## Goal

Build a Chrome extension that enhances the hover preview player with:
- Seeking capability (skip forward/back)
- Visible progress bar
- Keyboard shortcuts for playback speed control

## Technical Context

- The hover preview uses a standard HTML5 `<video>` element
- It plays the full video, not a truncated preview clip
- The video element should support native HTML5 video API methods:
  - `video.currentTime` (get/set position)
  - `video.duration` (total length)
  - `video.playbackRate` (get/set speed)
- YouTube's DOM is dynamic and uses obfuscated class names

## Requirements

### Phase 1: Core Functionality

#### 1.1 Hover Video Detection
- Detect when a preview video becomes active on YouTube homepage
- Get reference to the underlying `<video>` element
- Handle dynamic DOM changes (MutationObserver recommended)

#### 1.2 Keyboard Shortcuts (when hovering over a preview)
| Key | Action |
|-----|--------|
| `←` / `→` | Skip back/forward 5 seconds |
| `J` / `L` | Skip back/forward 10 seconds |
| `[` / `]` | Decrease/increase playback speed (0.25x increments) |
| `\` or `Backspace` | Reset playback speed to 1x |
| `Space` | Pause/resume |
| `M` | Mute/unmute |

Note: These shortcuts should ONLY activate when the mouse is hovering over a video preview, to avoid conflicts with page scrolling or other functionality.

#### 1.3 Progress Bar Overlay
- Display a thin progress bar at the bottom of the hover preview
- Show current position / duration
- Allow click-to-seek on the progress bar
- Style to be unobtrusive but visible

### Phase 2: Nice-to-Haves

#### 2.1 Speed Indicator
- Show current playback speed briefly when changed (toast/overlay)
- Example: "1.5x" appears for 1 second then fades

#### 2.2 Time Display
- Show current time / total duration somewhere visible
- Could be on the progress bar or as a small overlay

#### 2.3 Picture-in-Picture Shortcut
- Add a hotkey (e.g., `P`) to pop the hover preview into PiP mode
- This gives the user native browser controls in a floating window

#### 2.4 Persistence
- Remember preferred playback speed across previews
- Store in chrome.storage.local

## Technical Implementation Notes

### DOM Detection Strategy

YouTube's class names are obfuscated and may change. Recommended approach:

1. Look for `<video>` elements that appear within thumbnail containers
2. Use structural selectors rather than class names where possible
3. The hover preview video likely appears inside or near `ytd-thumbnail` or similar components
4. Use MutationObserver to detect when videos are added/activated

```javascript
// Pseudocode for detection
const observer = new MutationObserver((mutations) => {
  // Look for video elements that just became visible/active
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (isHoverPreview(video) && !video.dataset.enhanced) {
      enhanceVideo(video);
      video.dataset.enhanced = 'true';
    }
  });
});
```

### Hover State Tracking

Need to track which video (if any) the user is currently hovering over:

```javascript
// Track the currently hovered preview video
let activeHoverVideo = null;

// Add listeners to detect hover entry/exit on video containers
// Update activeHoverVideo accordingly
// Keyboard events should check if activeHoverVideo exists
```

### Progress Bar Injection

```javascript
// Create overlay container positioned relative to video
const overlay = document.createElement('div');
overlay.className = 'yt-hover-enhance-overlay';

// Style with position: absolute, bottom: 0, pointer-events for seeking
// Update progress bar width on video 'timeupdate' event
```

### Content Security Policy Considerations

- YouTube has strict CSP
- Inject styles via content script, not external stylesheets
- All code should be in content scripts, avoid inline handlers

## File Structure

```
youtube-hover-enhance/
├── manifest.json          # V3 manifest
├── content.js             # Main content script
├── styles.css             # Injected styles
├── popup.html             # Optional settings popup
├── popup.js               # Settings logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "YouTube Hover Preview Enhancer",
  "version": "1.0.0",
  "description": "Add seeking, progress bar, and speed controls to YouTube hover previews",
  "permissions": ["storage"],
  "host_permissions": ["*://*.youtube.com/*"],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Testing Checklist

- [ ] Extension loads without errors on YouTube homepage
- [ ] Hover preview videos are correctly detected
- [ ] Keyboard shortcuts work ONLY when hovering over preview
- [ ] Keyboard shortcuts don't interfere with normal YouTube usage
- [ ] Seeking works (arrow keys, J/L)
- [ ] Playback speed adjustment works
- [ ] Progress bar is visible and accurate
- [ ] Click-to-seek works on progress bar
- [ ] Styles don't break on YouTube layout changes
- [ ] Works on youtube.com/feed/subscriptions and similar pages
- [ ] Does not affect the main YouTube player (watch page)

## Edge Cases to Handle

1. **Video ends while hovering** - Reset or handle gracefully
2. **User moves mouse away during seek** - Cancel or complete the seek
3. **Multiple videos visible** - Only enhance the one being hovered
4. **YouTube Shorts** - May have different DOM structure, consider excluding
5. **Main player page** - Extension should not interfere with youtube.com/watch

## Success Criteria

A user should be able to:
1. Hover over any video on YouTube homepage
2. Use arrow keys to skip forward/back
3. Use bracket keys to adjust playback speed
4. See a progress bar showing their position
5. Click on the progress bar to jump to any point
6. Have all this work reliably without breaking anything else
