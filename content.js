// YouTube Hover Preview Enhancer
// Adds seeking, progress bar, and speed controls to hover previews and main player

(function() {
  'use strict';

  // State
  let activeVideo = null;
  let currentSpeed = 1.0;
  let zoomedElement = null;
  const enhancedVideos = new WeakSet();
  const videoOverlays = new WeakMap();

  // Global toast element
  let globalToast = null;
  let globalToastTimeout = null;

  // Constants
  const SPEED_STEP = 0.25;
  const SPEED_MIN = 0.25;
  const SPEED_MAX = 4.0;
  const SEEK_SHORT = 5;
  const SEEK_LONG = 10;
  const TOAST_DURATION = 800;

  // Load saved speed from storage
  function loadSavedSpeed() {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['playbackSpeed'], (result) => {
        if (result.playbackSpeed) {
          currentSpeed = result.playbackSpeed;
        }
      });
    }
  }

  // Save speed to storage
  function saveSpeed(speed) {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ playbackSpeed: speed });
    }
  }

  // Format time as MM:SS or HH:MM:SS
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Check if element is the main YouTube player
  function isMainPlayer(video) {
    return video.closest('#movie_player') !== null;
  }

  // Check if video is a Shorts video (to exclude)
  function isShortsVideo(video) {
    return video.closest('ytd-reel-video-renderer') !== null ||
           video.closest('ytd-shorts') !== null ||
           window.location.pathname.includes('/shorts/');
  }

  // Create global toast element
  function createGlobalToast() {
    if (globalToast) return;
    globalToast = document.createElement('div');
    globalToast.className = 'yth-global-toast';
    document.body.appendChild(globalToast);
  }

  // Zoom state
  let zoomStartTime = 0;

  // Zoom/unzoom hover preview
  function toggleZoom(video) {
    if (zoomedElement) {
      // Unzoom - remove classes and inline styles
      zoomedElement.style.transform = '';
      zoomedElement.classList.remove('yth-zoomed');
      document.querySelectorAll('.yth-zoom-parent').forEach(el => {
        el.classList.remove('yth-zoom-parent');
      });
      zoomedElement = null;
      return;
    }

    // Find the player container to zoom
    const player = video.closest('ytd-player') ||
                   video.closest('.html5-video-player');

    if (player) {
      zoomStartTime = Date.now();

      // Calculate translation to center on viewport
      const rect = player.getBoundingClientRect();
      const playerCenterX = rect.left + rect.width / 2;
      const playerCenterY = rect.top + rect.height / 2;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      const translateX = viewportCenterX - playerCenterX;
      const translateY = viewportCenterY - playerCenterY;

      // Apply transform with translate (to center) and scale
      player.style.transform = `translate(${translateX}px, ${translateY}px) scale(2.5)`;
      player.classList.add('yth-zoomed');
      zoomedElement = player;

      // Also add class to parents to prevent clipping
      let parent = player.parentElement;
      while (parent && parent !== document.body) {
        parent.classList.add('yth-zoom-parent');
        parent = parent.parentElement;
      }
    }
  }

  // Check if we should allow zoom cleanup (prevent immediate cleanup)
  function canCleanupZoom() {
    return Date.now() - zoomStartTime > 500;
  }

  // Show speed toast centered on screen
  function showSpeedToast(speed) {
    createGlobalToast();
    globalToast.textContent = `${speed}x`;
    globalToast.classList.remove('yth-fade-out');
    globalToast.classList.add('yth-visible');

    if (globalToastTimeout) {
      clearTimeout(globalToastTimeout);
    }

    globalToastTimeout = setTimeout(() => {
      globalToast.classList.add('yth-fade-out');
      setTimeout(() => {
        globalToast.classList.remove('yth-visible', 'yth-fade-out');
      }, 300);
    }, TOAST_DURATION);
  }

  // Create progress bar overlay for a video
  function createOverlay(video) {
    const container = video.parentElement;
    if (!container) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'yth-overlay-wrapper';

    const progressContainer = document.createElement('div');
    progressContainer.className = 'yth-progress-container';

    const bufferedBar = document.createElement('div');
    bufferedBar.className = 'yth-progress-buffered';

    const progressBar = document.createElement('div');
    progressBar.className = 'yth-progress-bar';

    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'yth-time-display';

    progressContainer.appendChild(bufferedBar);
    progressContainer.appendChild(progressBar);
    wrapper.appendChild(progressContainer);
    wrapper.appendChild(timeDisplay);

    container.style.position = 'relative';
    container.appendChild(wrapper);

    const overlay = { wrapper, progressBar, bufferedBar, timeDisplay };

    progressContainer.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!video.duration) return;
      const rect = progressContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      video.currentTime = percent * video.duration;
    });

    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const percent = (video.currentTime / video.duration) * 100;
      progressBar.style.width = `${percent}%`;
      timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    });

    video.addEventListener('progress', () => {
      if (!video.duration || !video.buffered.length) return;
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const percent = (bufferedEnd / video.duration) * 100;
      bufferedBar.style.width = `${percent}%`;
    });

    return overlay;
  }

  function updateOverlayVisibility(overlay, visible) {
    if (!overlay) return;
    if (visible) {
      overlay.wrapper.classList.add('yth-visible');
    } else {
      overlay.wrapper.classList.remove('yth-visible');
    }
  }

  // Enhance a video element
  function enhanceVideo(video) {
    if (enhancedVideos.has(video)) return;
    if (isShortsVideo(video)) return;

    enhancedVideos.add(video);
    const isMain = isMainPlayer(video);

    // Create overlay for non-main-player videos
    let overlay = null;
    if (!isMain) {
      overlay = createOverlay(video);
      if (overlay) {
        videoOverlays.set(video, overlay);
      }

      // For hover previews: set as active when video starts playing
      // (YouTube creates these videos when you hover)
      video.addEventListener('playing', () => {
        activeVideo = video;
        if (video.playbackRate !== currentSpeed) {
          video.playbackRate = currentSpeed;
        }
        updateOverlayVisibility(overlay, true);
      });

      video.addEventListener('pause', () => {
        updateOverlayVisibility(overlay, false);
      });

      video.addEventListener('emptied', () => {
        if (activeVideo === video) {
          activeVideo = null;
        }
        // Clear zoom if zoomed (but not immediately after zooming)
        if (zoomedElement && canCleanupZoom()) {
          zoomedElement.classList.remove('yth-zoomed');
          document.querySelectorAll('.yth-zoom-parent').forEach(el => {
            el.classList.remove('yth-zoom-parent');
          });
          zoomedElement = null;
        }
        updateOverlayVisibility(overlay, false);
      });

      // If video is already playing, set it as active
      if (!video.paused) {
        activeVideo = video;
        if (video.playbackRate !== currentSpeed) {
          video.playbackRate = currentSpeed;
        }
      }
    }

    // For main player, apply saved speed on play
    if (isMain) {
      video.addEventListener('play', () => {
        if (video.playbackRate !== currentSpeed) {
          video.playbackRate = currentSpeed;
        }
      });
    }
  }

  // Get the currently active video for keyboard controls
  function getActiveVideo() {
    // If we have an active hover preview (playing or paused), use it
    if (activeVideo && document.contains(activeVideo)) {
      return activeVideo;
    }

    // Otherwise, try to find the main player video
    const mainPlayer = document.querySelector('#movie_player video');
    if (mainPlayer) {
      return mainPlayer;
    }

    return null;
  }

  // Handle keyboard shortcuts
  function handleKeydown(e) {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable) {
      return;
    }

    const video = getActiveVideo();
    if (!video) return;

    let handled = false;
    const key = e.key;
    const isHoverPreview = activeVideo && !isMainPlayer(video);

    switch (key) {
      case 'ArrowLeft':
        video.currentTime = Math.max(0, video.currentTime - SEEK_SHORT);
        handled = true;
        break;

      case 'ArrowRight':
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + SEEK_SHORT);
        handled = true;
        break;

      case 'j':
      case 'J':
        video.currentTime = Math.max(0, video.currentTime - SEEK_LONG);
        handled = true;
        break;

      case 'l':
      case 'L':
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + SEEK_LONG);
        handled = true;
        break;

      case '[':
        currentSpeed = Math.max(SPEED_MIN, Math.round((currentSpeed - SPEED_STEP) * 100) / 100);
        video.playbackRate = currentSpeed;
        saveSpeed(currentSpeed);
        showSpeedToast(currentSpeed);
        handled = true;
        break;

      case ']':
        currentSpeed = Math.min(SPEED_MAX, Math.round((currentSpeed + SPEED_STEP) * 100) / 100);
        video.playbackRate = currentSpeed;
        saveSpeed(currentSpeed);
        showSpeedToast(currentSpeed);
        handled = true;
        break;

      case '\\':
        currentSpeed = 1.0;
        video.playbackRate = currentSpeed;
        saveSpeed(currentSpeed);
        showSpeedToast(currentSpeed);
        handled = true;
        break;

      case 'Backspace':
        // Only handle backspace for hover previews to avoid navigation issues
        if (isHoverPreview) {
          currentSpeed = 1.0;
          video.playbackRate = currentSpeed;
          saveSpeed(currentSpeed);
          showSpeedToast(currentSpeed);
          handled = true;
        }
        break;

      case ' ':
        // Space to pause/play - only for hover previews
        if (isHoverPreview) {
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          handled = true;
        }
        break;

      case 'm':
      case 'M':
        video.muted = !video.muted;
        handled = true;
        break;

      case 'p':
      case 'P':
        if (document.pictureInPictureEnabled && video !== document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(() => {});
          handled = true;
        }
        break;

      case 'c':
      case 'C':
        // Toggle closed captions for hover previews
        if (isHoverPreview) {
          handled = true;
          const player = video.closest('.html5-video-player') ||
                         document.querySelector('.html5-video-player');
          if (player) {
            const captions = player.querySelector('.ytp-caption-window-container') ||
                             player.querySelector('.captions-text') ||
                             player.querySelector('[class*="caption"]');
            if (captions) {
              captions.style.display = captions.style.display === 'none' ? '' : 'none';
            }
          }
        }
        break;

      case 'z':
      case 'Z':
        // Toggle zoom for hover previews
        if (isHoverPreview || zoomedElement) {
          toggleZoom(video);
          handled = true;
        }
        break;

      case 'Escape':
        // Close zoom
        if (zoomedElement) {
          zoomedElement.style.transform = '';
          zoomedElement.classList.remove('yth-zoomed');
          document.querySelectorAll('.yth-zoom-parent').forEach(el => {
            el.classList.remove('yth-zoom-parent');
          });
          zoomedElement = null;
          handled = true;
        }
        break;

    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Observe DOM for new videos
  function observeVideos() {
    const observer = new MutationObserver(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!enhancedVideos.has(video)) {
          enhanceVideo(video);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    document.querySelectorAll('video').forEach(enhanceVideo);
  }

  // Initialize
  function init() {
    loadSavedSpeed();
    createGlobalToast();

    document.addEventListener('keydown', handleKeydown, true);

    if (document.body) {
      observeVideos();
    } else {
      document.addEventListener('DOMContentLoaded', observeVideos);
    }

    // Re-scan on YouTube navigation (SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          document.querySelectorAll('video').forEach(enhanceVideo);
        }, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });

    console.log('YouTube Hover Preview Enhancer loaded');
  }

  init();
})();
