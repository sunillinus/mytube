# MyTube

A Chrome extension that adds keyboard controls to YouTube's hover preview player and main player.

## Features

- **Seeking**: Skip forward/back with arrow keys or J/L
- **Speed Control**: Adjust playback speed with bracket keys, persists across videos
- **Zoom**: Enlarge hover previews 2.5x for easier viewing
- **Captions**: Toggle closed captions on hover previews
- **Picture-in-Picture**: Pop out any video to a floating window

## Keyboard Shortcuts

### Works on Hover Previews + Main Player

| Key | Action |
|-----|--------|
| `←` / `→` | Skip back/forward 5 seconds |
| `J` / `L` | Skip back/forward 10 seconds |
| `[` / `]` | Decrease/increase speed (0.25x steps) |
| `\` | Reset speed to 1x |
| `M` | Mute/unmute |
| `P` | Picture-in-Picture |

### Hover Previews Only

| Key | Action |
|-----|--------|
| `Space` | Pause/resume |
| `C` | Toggle captions |
| `Z` | Zoom preview 2.5x |
| `Escape` | Close zoom |
| `Backspace` | Reset speed to 1x |

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the extension folder

## How It Works

The extension uses a MutationObserver to detect when YouTube creates video elements for hover previews. It then attaches keyboard event listeners and applies your preferred playback speed automatically.

Speed preferences are saved to Chrome's local storage and persist across browser sessions.

## Permissions

- `storage`: Save playback speed preference
- `youtube.com`: Run on YouTube pages
