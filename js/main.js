/**
 * Ahana Aura Virtual Headquarters - Main Application Controller
 * Kriss.ai Architectural Dollhouse Experience:
 * - Unobstructed 3D studio viewport
 * - Wheel scroll-driven room transition
 * - Screen-projected (+) glass hotspot pins
 * - Sleek slide-out room cards
 * - Theme switcher & procedural Web Audio sound
 */

import { AhanaHQScene } from './three-scene.js?v=2.8';
import { soundEngine } from './audio.js?v=2.4';

class AhanaApp {
  constructor() {
    this.activeRoomIndex = 0;
    this.isNavigating = false;
    this.wheelCooldown = false;
    this.themes = ['day', 'sunset', 'night'];
    this.currentThemeIndex = 0;
    window.__ahanaApp = this;

    // 1. Initialize 3D Scene
    this.sceneApp = new AhanaHQScene();

    // 2. DOM Elements
    this.navPills = Array.from(document.querySelectorAll('.nav-pill'));
    this.hotspots = Array.from(document.querySelectorAll('.room-hotspot'));
    this.roomCards = [
      null, // Index 0 is Overview (No card)
      document.getElementById('card-room-1'),
      document.getElementById('card-room-2'),
      document.getElementById('card-room-3'),
      document.getElementById('card-room-4')
    ];

    this.init();
  }

  init() {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // 2. Custom Cursor
    this.setupCustomCursor();

    // 3. Navigation (Pills & Hotspots)
    this.setupNavigation();

    // 4. Mouse Wheel & Touch Swipes
    this.setupWheelAndTouch();

    // 5. Hotspots 3D-to-Screen Projection Loop
    this.setupHotspotsLoop();

    // 6. Lighting Theme Toggle
    this.setupThemeToggle();

    // 7. Audio Toggle
    this.setupAudioToggle();

    // 8. Modals (Booking & ROI Simulator)
    this.setupModals();

    // 8b. About Me Sub-Tabs
    this.setupAboutSubTabs();

    // 8c. AI Concierge Chatbot
    this.setupConciergeChatbot();

    // 8d. Services Strategic Pillars
    this.setupServicesPillars();

    // 8e. Portfolio Projects & PPT Slide Deck Modal
    this.setupPortfolioProjects();
    this.setupPortfolioDroneToast();
    this.setupProjectPPTModal();

    // 9. Initial View State & URL Hash Routing
    this.updateUIForState(0);
    this.checkInitialHash();

    console.log('🏛️ Ahana Aura Studio Dollhouse Initialized.');
  }

  /* ---------------- URL HASH ROUTING ---------------- */
  checkInitialHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('reception') || hash === '#1') {
      setTimeout(() => this.navigateToRoom(1), 100);
    } else if (hash.includes('about') || hash === '#2') {
      setTimeout(() => this.navigateToRoom(2), 100);
    } else if (hash.includes('service') || hash === '#3') {
      setTimeout(() => this.navigateToRoom(3), 100);
    } else if (hash.includes('portfolio') || hash === '#4') {
      setTimeout(() => this.navigateToRoom(4), 100);
    }
  }

  /* ---------------- TACTILE CURSOR ---------------- */
  setupCustomCursor() {
    const cursor = document.getElementById('tactical-cursor');
    const dot = document.getElementById('tactical-dot');
    if (!cursor || !dot) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    });

    const loop = () => {
      curX += (mouseX - curX) * 0.18;
      curY += (mouseY - curY) * 0.18;
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    const hoverTargets = 'a, button, input, select, textarea, .room-hotspot, .nav-pill';
    document.querySelectorAll(hoverTargets).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('cursor-hover');
        soundEngine.playHover();
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('cursor-hover');
      });
      el.addEventListener('click', () => {
        soundEngine.playClick();
      });
    });
  }

  /* ---------------- NAVIGATION ---------------- */
  setupNavigation() {
    // Brand Logo -> Overview
    const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo) {
      brandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToRoom(0);
      });
    }

    // Top Capsule Nav Pills
    this.navPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const rawIdx = pill.getAttribute('data-room');
        const targetIdx = parseInt(rawIdx, 10);
        if (!isNaN(targetIdx)) {
          this.navigateToRoom(targetIdx);
        }
      });
    });

    // 3D Circular Hotspot Clicks (Direct & Delegated)
    const hotspotsLayer = document.getElementById('hotspots-layer');
    if (hotspotsLayer) {
      hotspotsLayer.addEventListener('click', (e) => {
        const btn = e.target.closest('.room-hotspot');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const rawIdx = btn.getAttribute('data-room');
          const targetIdx = parseInt(rawIdx, 10);
          if (!isNaN(targetIdx)) {
            this.navigateToRoom(targetIdx);
          }
        }
      });
    }

    // Prev / Next Room Buttons on Cards
    document.querySelectorAll('.nav-prev-room, .nav-next-room').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const toIdx = parseInt(btn.getAttribute('data-to'), 10);
        if (!isNaN(toIdx)) {
          this.navigateToRoom(toIdx);
        }
      });
    });
  }

  /* ---------------- MOUSE WHEEL SCROLL & TOUCH ---------------- */
  setupWheelAndTouch() {
    // Helper to detect if any modal or chat window is currently active/open
    const isAnyModalActive = () => {
      const pptModal = document.getElementById('project-ppt-modal');
      if (pptModal && !pptModal.classList.contains('hidden') && pptModal.classList.contains('opacity-100')) {
        return true;
      }
      const chatModal = document.getElementById('concierge-chat-modal');
      if (chatModal && !chatModal.classList.contains('hidden') && chatModal.classList.contains('opacity-100')) {
        return true;
      }
      const bookingModal = document.getElementById('booking-modal');
      if (bookingModal && !bookingModal.classList.contains('hidden')) {
        return true;
      }
      const roiModal = document.getElementById('roi-modal');
      if (roiModal && !roiModal.classList.contains('hidden')) {
        return true;
      }
      return false;
    };

    // Wheel Scroll Navigation
    window.addEventListener('wheel', (e) => {
      // 1. If chat or any modal is open, completely suppress 3D room navigation scroll!
      if (isAnyModalActive()) return;

      // 2. Ignore if scroll originated inside card or modal or input containers
      if (e.target.closest('#concierge-chat-modal') ||
          e.target.closest('#concierge-chat-window') ||
          e.target.closest('.modal-content') ||
          e.target.closest('textarea') ||
          e.target.closest('input') ||
          e.target.closest('.room-info-card')) {
        return;
      }

      if (this.isNavigating || this.wheelCooldown) return;

      if (Math.abs(e.deltaY) > 15) {
        this.wheelCooldown = true;
        setTimeout(() => {
          this.wheelCooldown = false;
        }, 450);

        if (e.deltaY > 0) {
          // Scroll Down -> Next Room
          const nextIdx = (this.activeRoomIndex + 1) % 5;
          this.navigateToRoom(nextIdx);
        } else {
          // Scroll Up -> Previous Room
          const prevIdx = (this.activeRoomIndex - 1 + 5) % 5;
          this.navigateToRoom(prevIdx);
        }
      }
    }, { passive: true });

    // Touch Swipes
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (isAnyModalActive()) return;
      if (e.target.closest('#concierge-chat-modal') ||
          e.target.closest('#concierge-chat-window') ||
          e.target.closest('.modal-content') ||
          e.target.closest('.room-info-card')) return;
      if (e.changedTouches.length === 0) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY;

      if (Math.abs(diffY) > 30 && !this.isNavigating) {
        if (diffY > 0) {
          this.navigateToRoom((this.activeRoomIndex + 1) % 5);
        } else {
          this.navigateToRoom((this.activeRoomIndex - 1 + 5) % 5);
        }
      }
    }, { passive: true });

    // Keyboard (0-4, Arrows, Esc)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (isAnyModalActive() && e.key !== 'Escape') return;

      // PPT Slide Deck Keyboard Controls
      const pptModal = document.getElementById('project-ppt-modal');
      const isPPTOpen = pptModal && !pptModal.classList.contains('hidden') && pptModal.classList.contains('opacity-100');
      if (isPPTOpen) {
        if (e.key === 'Escape') {
          this.closeProjectPPT();
          return;
        } else if (e.key === 'ArrowRight' || e.key === 'Space') {
          e.preventDefault();
          this.nextSlide();
          return;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prevSlide();
          return;
        }
      }

      if (e.key === '0' || e.key === 'Escape') {
        this.navigateToRoom(0);
      } else if (e.key === '1') {
        this.navigateToRoom(1);
      } else if (e.key === '2') {
        this.navigateToRoom(2);
      } else if (e.key === '3') {
        this.navigateToRoom(3);
      } else if (e.key === '4') {
        this.navigateToRoom(4);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        this.navigateToRoom((this.activeRoomIndex + 1) % 5);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        this.navigateToRoom((this.activeRoomIndex - 1 + 5) % 5);
      }
    });
  }

  /* ---------------- DIRECT ROOM TRANSITION ---------------- */
  navigateToRoom(targetIndex) {
    const idx = parseInt(targetIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= 5) return;
    targetIndex = idx;

    if (targetIndex === this.activeRoomIndex && !this.isNavigating) return;

    try {
      soundEngine?.playClick?.();
    } catch(e) {}

    this.isNavigating = true;
    this.activeRoomIndex = targetIndex;

    try {
      // 1. Move 3D Camera & Patrol Drone
      this.sceneApp.navigateToRoom(targetIndex);

      // 2. Synchronize UI Overlays & Cards
      this.updateUIForState(targetIndex);

      // 3. Update URL Hash cleanly
      const roomNames = ['overview', 'reception', 'about', 'services', 'portfolio'];
      window.history.replaceState(null, '', `#${roomNames[targetIndex]}`);
    } catch (err) {
      console.error('Navigation error:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 950);
    }
  }

  /* ---------------- UI STATE UPDATE ---------------- */
  updateUIForState(targetIndex) {
    // 1. Update Top Nav Pills
    this.navPills.forEach((pill) => {
      const roomVal = parseInt(pill.getAttribute('data-room'), 10);
      if (roomVal === targetIndex) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // 2. Toggle 3D Hotspot Pins Layer (Visible only in Overview mode 0)
    const hotspotsLayer = document.getElementById('hotspots-layer');
    if (hotspotsLayer) {
      if (targetIndex === 0) {
        hotspotsLayer.style.display = 'block';
        hotspotsLayer.style.opacity = '1';
        hotspotsLayer.style.pointerEvents = 'auto';
      } else {
        hotspotsLayer.style.display = 'none';
        hotspotsLayer.style.opacity = '0';
        hotspotsLayer.style.pointerEvents = 'none';
      }
    }

    // 3. Slide In / Out Side Room Cards (Rooms 1 to 4)
    for (let r = 1; r <= 4; r++) {
      const card = this.roomCards[r];
      if (!card) continue;

      if (r === targetIndex) {
        card.classList.remove('hidden');
        requestAnimationFrame(() => {
          card.classList.remove('opacity-0', '-translate-x-6', 'pointer-events-none');
          card.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');
        });
      } else {
        card.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');
        card.classList.add('opacity-0', '-translate-x-6', 'pointer-events-none');
        setTimeout(() => {
          if (this.activeRoomIndex !== r) {
            card.classList.add('hidden');
          }
        }, 350);
      }
    }

    // 4. Toast Visibility Management: Strictly isolate toasts per room
    const receptionToast = document.getElementById('reception-welcome-toast');
    const droneToast = document.getElementById('drone-recon-toast');

    if (targetIndex === 1) {
      // Room 1: Reception ONLY
      if (droneToast) {
        droneToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        droneToast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none', 'hidden');
      }
      if (receptionToast) {
        receptionToast.classList.remove('hidden');
        setTimeout(() => {
          if (this.activeRoomIndex === 1) {
            receptionToast.classList.remove('translate-y-4', 'opacity-0', 'pointer-events-none');
            receptionToast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
            try { soundEngine?.playChime?.(); } catch(e) {}
          }
        }, 150);
      }
    } else if (targetIndex === 4) {
      // Room 4: Portfolio ONLY
      if (receptionToast) {
        receptionToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        receptionToast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none', 'hidden');
      }
      if (droneToast) {
        droneToast.classList.remove('hidden');
        setTimeout(() => {
          if (this.activeRoomIndex === 4) {
            droneToast.classList.remove('translate-y-4', 'opacity-0', 'pointer-events-none');
            droneToast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
            try { soundEngine?.playChime?.(); } catch(e) {}
          }
        }, 200);
      }
    } else {
      // All other rooms: hide both toasts completely
      if (receptionToast) {
        receptionToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        receptionToast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none', 'hidden');
      }
      if (droneToast) {
        droneToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        droneToast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none', 'hidden');
      }
    }

    // 6. Sync Active Pillars and Projects on Room Navigation
    if (targetIndex === 3 && typeof this.switchServicePillar === 'function') {
      this.switchServicePillar(this.activeServicePillar || 'strategy');
    }
    if (targetIndex === 4 && typeof this.selectPortfolioProject === 'function') {
      this.selectPortfolioProject(this.activePortfolioProject || 'fintech');
    }
  }

  /* ---------------- 3D PROJECTED HOTSPOTS LOOP ---------------- */
  setupHotspotsLoop() {
    const updatePositions = () => {
      requestAnimationFrame(updatePositions);

      // Only update when in Overview mode
      if (this.activeRoomIndex !== 0) return;

      const projected = this.sceneApp.getProjectedHotspots();
      this.hotspots.forEach((pin, i) => {
        if (projected[i]) {
          const { x, y, isVisible } = projected[i];
          if (isVisible) {
            pin.style.left = `${x}px`;
            pin.style.top = `${y}px`;
            pin.style.display = 'flex';
          } else {
            pin.style.display = 'none';
          }
        }
      });
    };
    requestAnimationFrame(updatePositions);
  }

  /* ---------------- THEME SWITCHER ---------------- */
  setupThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    const label = document.getElementById('theme-label');
    const iconDay = document.querySelector('.theme-icon-day');
    const iconSunset = document.querySelector('.theme-icon-sunset');
    const iconNight = document.querySelector('.theme-icon-night');

    if (!btn) return;

    btn.addEventListener('click', () => {
      this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
      const theme = this.themes[this.currentThemeIndex];

      // Update 3D scene lighting
      this.sceneApp.setTheme(theme);

      // Update body theme class
      document.body.className = `theme-${theme} bg-[var(--bg-color)] text-[var(--text-main)] antialiased overflow-hidden h-full w-full`;

      // Update Icon & Label
      if (label) label.textContent = theme.toUpperCase();

      if (iconDay && iconSunset && iconNight) {
        iconDay.classList.add('hidden');
        iconSunset.classList.add('hidden');
        iconNight.classList.add('hidden');

        if (theme === 'day') iconDay.classList.remove('hidden');
        if (theme === 'sunset') iconSunset.classList.remove('hidden');
        if (theme === 'night') iconNight.classList.remove('hidden');
      }

      showToast(`Studio Lighting: ${theme.toUpperCase()}`);
    });
  }

  /* ---------------- AUDIO CONTROLS ---------------- */
  setupAudioToggle() {
    const soundBtn = document.getElementById('audio-toggle');
    const onIcon = document.querySelector('.audio-on-icon');
    const offIcon = document.querySelector('.audio-off-icon');

    if (!soundBtn) return;

    soundBtn.addEventListener('click', () => {
      const isPlaying = soundEngine.toggleSound();
      if (isPlaying) {
        if (onIcon) onIcon.classList.remove('hidden');
        if (offIcon) offIcon.classList.add('hidden');
        showToast('Atmospheric Studio Sound Active');
      } else {
        if (onIcon) onIcon.classList.add('hidden');
        if (offIcon) offIcon.classList.remove('hidden');
        showToast('Sound Muted');
      }
    });
  }

  /* ---------------- MODALS & ROI SIMULATOR ---------------- */
  setupModals() {
    // 1. Consultation Booking Modal
    const bookingModal = document.getElementById('booking-modal');
    const openBookingBtns = document.querySelectorAll('[data-open-booking]');
    const closeBookingBtn = document.getElementById('close-booking-modal');
    const bookingForm = document.getElementById('modal-booking-form');

    openBookingBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playChime(784);
        bookingModal.classList.remove('hidden');
        bookingModal.classList.add('flex');
      });
    });

    if (closeBookingBtn) {
      closeBookingBtn.addEventListener('click', () => {
        soundEngine.playClick();
        bookingModal.classList.add('hidden');
        bookingModal.classList.remove('flex');
      });
    }

    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('modal-booking-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Dispatching Brief...</span>`;

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>✓ Brief Received • Initializing Outreach</span>`;
          submitBtn.classList.add('bg-emerald-600', 'text-white');
          showToast('Advisory Request Successfully Dispatched!');
          soundEngine.playChime(880);

          setTimeout(() => {
            bookingModal.classList.add('hidden');
            bookingModal.classList.remove('flex');
          }, 1400);
        }, 1000);
      });
    }

    // 2. ROI Simulator Modal
    const roiModal = document.getElementById('roi-modal');
    const openRoiBtns = document.querySelectorAll('[data-open-roi]');
    const closeRoiBtn = document.getElementById('close-roi-modal');

    openRoiBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playChime(659.25);
        roiModal.classList.remove('hidden');
        roiModal.classList.add('flex');
      });
    });

    if (closeRoiBtn) {
      closeRoiBtn.addEventListener('click', () => {
        soundEngine.playClick();
        roiModal.classList.add('hidden');
        roiModal.classList.remove('flex');
      });
    }

    // ROI Calculator logic
    const revSlider = document.getElementById('roi-rev-slider');
    const teamSlider = document.getElementById('roi-team-slider');
    const hoursSlider = document.getElementById('roi-hours-slider');

    const revVal = document.getElementById('roi-rev-val');
    const teamVal = document.getElementById('roi-team-val');
    const hoursVal = document.getElementById('roi-hours-val');

    const outSavings = document.getElementById('roi-annual-savings');
    const outHours = document.getElementById('roi-annual-hours');
    const outRoi = document.getElementById('roi-projected-percent');

    function calculateRoi() {
      if (!revSlider || !teamSlider || !hoursSlider) return;
      const revM = parseFloat(revSlider.value);
      const teamSize = parseInt(teamSlider.value, 10);
      const manualHours = parseInt(hoursSlider.value, 10);

      if (revVal) revVal.textContent = `$${revM}M`;
      if (teamVal) teamVal.textContent = `${teamSize} Staff`;
      if (hoursVal) hoursVal.textContent = `${manualHours} hrs/wk`;

      const savedHoursAnnual = Math.round(teamSize * (manualHours * 0.65) * 48);
      const estimatedSavings = Math.round((savedHoursAnnual * 45) + (revM * 1000000 * 0.08));
      const projectedRoi = Math.min(Math.round((estimatedSavings / 45000) * 10), 1250);

      if (outSavings) outSavings.textContent = `$${(estimatedSavings / 1000).toFixed(0)}k/yr`;
      if (outHours) outHours.textContent = `${savedHoursAnnual.toLocaleString()} hrs`;
      if (outRoi) outRoi.textContent = `${projectedRoi}%`;
    }

    [revSlider, teamSlider, hoursSlider].forEach((el) => {
      if (el) el.addEventListener('input', calculateRoi);
    });
    calculateRoi();
  }

  /* ---------------- ABOUT ME SUB-TABS (STORY, PHILOSOPHY, JOURNEY) ---------------- */
  setupAboutSubTabs() {
    const btnStory = document.getElementById('about-tab-btn-story');
    const btnPhil = document.getElementById('about-tab-btn-phil');
    const btnJourney = document.getElementById('about-tab-btn-journey');

    const contentStory = document.getElementById('about-tab-content-story');
    const contentPhil = document.getElementById('about-tab-content-phil');
    const contentJourney = document.getElementById('about-tab-content-journey');

    const tabs = [
      { key: 'story', btn: btnStory, content: contentStory },
      { key: 'phil', btn: btnPhil, content: contentPhil },
      { key: 'journey', btn: btnJourney, content: contentJourney }
    ];

    this.switchAboutTab = (tabKey) => {
      try { soundEngine?.playClick?.(); } catch(e) {}

      tabs.forEach((t) => {
        if (t.btn) {
          t.btn.className = 'about-subtab-btn flex-1 py-1 rounded-lg text-[#666] hover:text-[#1e1b18] transition-all text-center cursor-pointer relative z-10';
        }
        if (t.content) {
          t.content.classList.add('hidden');
        }
      });

      const target = tabs.find(t => t.key === tabKey || (t.btn && t.btn.id === `about-tab-btn-${tabKey}`));
      if (target) {
        if (target.btn) {
          target.btn.className = 'about-subtab-btn flex-1 py-1 rounded-lg bg-white text-[#1e1b18] font-semibold shadow-sm transition-all text-center cursor-pointer relative z-10';
        }
        if (target.content) {
          target.content.classList.remove('hidden');
        }
      }
    };

    if (window.__ahanaApp) {
      window.__ahanaApp.switchAboutTab = this.switchAboutTab;
    }

    tabs.forEach(({ key, btn }) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchAboutTab(key);
      });
    });
  }

  /* ---------------- AI CONCIERGE CHATBOT ENGINE ---------------- */
  setupConciergeChatbot() {
    const modal = document.getElementById('concierge-chat-modal');
    const backdrop = document.getElementById('concierge-chat-backdrop');
    const windowEl = document.getElementById('concierge-chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const clearBtn = document.getElementById('clear-chat-btn');
    const messagesContainer = document.getElementById('chat-messages-container');
    const inputForm = document.getElementById('chat-input-form');
    const userInput = document.getElementById('chat-user-input');

    const welcomeToast = document.getElementById('reception-welcome-toast');
    const closeToastBtn = document.getElementById('close-welcome-toast-btn');
    const dismissToastBtn = document.getElementById('dismiss-welcome-toast');
    const openFromToastBtn = document.getElementById('open-chat-from-toast');
    const openFromCardBtn = document.getElementById('reception-card-chat-btn');
    const floatingTriggerBtn = document.getElementById('floating-chat-trigger');

    if (!modal) return;

    // Toast Dismiss handlers
    const dismissToast = () => {
      if (welcomeToast) {
        welcomeToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        welcomeToast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none');
        setTimeout(() => {
          if (welcomeToast.classList.contains('opacity-0')) {
            welcomeToast.classList.add('hidden');
          }
        }, 400);
      }
    };
    this.dismissWelcomeToast = dismissToast;
    if (window.__ahanaApp) {
      window.__ahanaApp.dismissWelcomeToast = dismissToast;
    }
    if (closeToastBtn) closeToastBtn.addEventListener('click', dismissToast);
    if (dismissToastBtn) dismissToastBtn.addEventListener('click', dismissToast);

    // Modal Open / Close
    const openChat = () => {
      dismissToast();
      try { soundEngine?.playClick?.(); } catch(e) {}
      modal.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
      modal.classList.add('flex', 'pointer-events-auto', 'opacity-100');

      if (backdrop) {
        backdrop.classList.remove('pointer-events-none', 'opacity-0');
        backdrop.classList.add('pointer-events-auto', 'opacity-100');
      }
      if (windowEl) {
        windowEl.classList.remove('translate-y-8', 'sm:translate-y-4');
        windowEl.classList.add('translate-y-0');
      }
      setTimeout(() => userInput?.focus(), 250);
      if (window.lucide) window.lucide.createIcons();
    };

    const closeChat = () => {
      try { soundEngine?.playClick?.(); } catch(e) {}
      modal.classList.remove('pointer-events-auto', 'opacity-100');
      modal.classList.add('pointer-events-none', 'opacity-0');

      if (backdrop) {
        backdrop.classList.remove('pointer-events-auto', 'opacity-100');
        backdrop.classList.add('pointer-events-none', 'opacity-0');
      }
      if (windowEl) {
        windowEl.classList.remove('translate-y-0');
        windowEl.classList.add('translate-y-8', 'sm:translate-y-4');
      }
      setTimeout(() => {
        if (modal.classList.contains('pointer-events-none')) {
          modal.classList.remove('flex');
          modal.classList.add('hidden');
        }
      }, 300);
    };

    this.openChat = openChat;
    this.closeChat = closeChat;
    if (window.__ahanaApp) {
      window.__ahanaApp.openChat = openChat;
      window.__ahanaApp.closeChat = closeChat;
    }

    if (openFromToastBtn) openFromToastBtn.addEventListener('click', openChat);
    if (openFromCardBtn) openFromCardBtn.addEventListener('click', openChat);
    if (floatingTriggerBtn) floatingTriggerBtn.addEventListener('click', openChat);

    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (backdrop) backdrop.addEventListener('click', closeChat);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) {
        closeChat();
      }
    });

    // Reset Chat
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        try { soundEngine?.playClick?.(); } catch(e) {}
        messagesContainer.innerHTML = `
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 flex-shrink-0">
              <i data-lucide="bot" class="w-4 h-4 text-[#c9a14a]"></i>
            </div>
            <div class="max-w-[85%] p-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#34302c] dark:text-slate-200 space-y-1.5">
              <p class="leading-relaxed">
                Chat reset. I am ready to answer any questions about Ahana Aura's 14+ years AI advisory track record, enterprise methodologies, or help you book a session!
              </p>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Scroll helper
    const scrollToBottom = () => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // Append Message helper
    const appendUserMessage = (text) => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'flex items-start justify-end gap-2.5';
      msgDiv.innerHTML = `
        <div class="max-w-[82%] p-3 rounded-2xl rounded-tr-sm bg-[#1e1b18] text-white shadow-sm">
          <p class="leading-relaxed">${escapeHtml(text)}</p>
        </div>
      `;
      messagesContainer.appendChild(msgDiv);
      scrollToBottom();
    };

    const appendTypingIndicator = () => {
      const typingDiv = document.createElement('div');
      typingDiv.id = 'chat-typing-indicator';
      typingDiv.className = 'flex items-start gap-2.5';
      typingDiv.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 flex-shrink-0">
          <i data-lucide="bot" class="w-4 h-4 text-[#c9a14a]"></i>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#c9a14a] animate-bounce"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#c9a14a] animate-bounce [animation-delay:0.2s]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#c9a14a] animate-bounce [animation-delay:0.4s]"></span>
        </div>
      `;
      messagesContainer.appendChild(typingDiv);
      scrollToBottom();
      if (window.lucide) window.lucide.createIcons();
    };

    const removeTypingIndicator = () => {
      const el = document.getElementById('chat-typing-indicator');
      if (el) el.remove();
    };

    const appendAIMessage = (htmlContent) => {
      removeTypingIndicator();
      const msgDiv = document.createElement('div');
      msgDiv.className = 'flex items-start gap-2.5';
      msgDiv.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 flex-shrink-0">
          <i data-lucide="bot" class="w-4 h-4 text-[#c9a14a]"></i>
        </div>
        <div class="max-w-[85%] p-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#34302c] dark:text-slate-200 space-y-2">
          ${htmlContent}
        </div>
      `;
      messagesContainer.appendChild(msgDiv);
      scrollToBottom();
      if (window.lucide) window.lucide.createIcons();

      // Bind dynamic book buttons if present
      msgDiv.querySelectorAll('[data-open-booking]').forEach((btn) => {
        btn.addEventListener('click', () => {
          closeChat();
          const bookingModal = document.getElementById('booking-modal');
          if (bookingModal) {
            bookingModal.classList.remove('hidden');
            bookingModal.classList.add('flex');
          }
        });
      });

      // Bind dynamic 3D room teleportation buttons
      msgDiv.querySelectorAll('[data-teleport-room]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetRoom = parseInt(btn.getAttribute('data-teleport-room'), 10);
          closeChat();
          if (typeof this.navigateToRoom === 'function') {
            this.navigateToRoom(targetRoom);
          } else {
            document.querySelector(`.nav-pill[data-room="${targetRoom}"]`)?.click();
          }
        });
      });
    };

    // Knowledge Engine Responder
    const generateAIResponse = (query) => {
      const q = query.toLowerCase();

      if (q.includes('who') || q.includes('about') || q.includes('ahana') || q.includes('background') || q.includes('experience')) {
        return `
          <p class="leading-relaxed">
            <strong>Ahana Aura</strong> is a premier <strong>AI & Business Transformation Advisor</strong>, CEO Advisor, and Innovation Strategist with over <strong>14+ years of executive experience</strong>.
          </p>
          <p class="leading-relaxed">
            She has generated <strong>₹3Cr+</strong> in enterprise revenue, scaled systems impacting <strong>19,000+ users</strong>, and completed <strong>50+ enterprise transformation projects</strong>.
          </p>
          <div class="pt-1 flex gap-2">
            <button class="px-2.5 py-1 rounded-lg bg-[#1e1b18] text-white text-[10px] font-mono cursor-pointer hover:bg-[#c9a14a] transition-colors" data-teleport-room="2">
              ✦ Teleport to Strategy Sanctum →
            </button>
          </div>
        `;
      }

      if (q.includes('service') || q.includes('offer') || q.includes('what do') || q.includes('capability') || q.includes('can she do')) {
        return `
          <p class="leading-relaxed">Ahana Aura advises organizations across 4 core transformation disciplines:</p>
          <ul class="space-y-1 list-disc pl-4 text-[11px]">
            <li><strong>C-Suite AI Strategy</strong>: Architecting deterministic multi-year roadmaps and executive alignment.</li>
            <li><strong>Autonomous AI Workflows</strong>: Replacing repetitive enterprise bottlenecks with autonomous agent swarms.</li>
            <li><strong>Deterministic ROI Engineering</strong>: Ensuring EBITDA expansion and sub-90 day payback.</li>
            <li><strong>Zero-to-Scale Systems</strong>: Scaling venture-backed startups and new corporate divisions.</li>
          </ul>
          <div class="pt-1">
            <button class="px-2.5 py-1 rounded-lg bg-[#1e1b18] text-white text-[10px] font-mono cursor-pointer hover:bg-[#c9a14a] transition-colors" data-teleport-room="3">
              ✦ Teleport to Services Lab →
            </button>
          </div>
        `;
      }

      if (q.includes('book') || q.includes('call') || q.includes('consult') || q.includes('contact') || q.includes('email') || q.includes('schedule') || q.includes('meeting')) {
        return `
          <p class="leading-relaxed">
            You can book a <strong>Strategic Advisory Consultation</strong> directly with Ahana Aura. Direct channel: <a href="mailto:advisor@ahanaaura.com" class="font-mono text-[#c9a14a] font-bold underline">advisor@ahanaaura.com</a> (&lt;24h response SLA).
          </p>
          <button data-open-booking class="w-full py-2 rounded-xl bg-[#1e1b18] text-white text-xs font-semibold cursor-pointer shadow-md flex items-center justify-center gap-1.5 mt-1 hover:bg-[#c9a14a] transition-colors">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#c9a14a]"></i>
            <span>Open Booking Request Form</span>
          </button>
        `;
      }

      if (q.includes('retainer') || q.includes('price') || q.includes('cost') || q.includes('fee') || q.includes('engagement') || q.includes('model')) {
        return `
          <p class="leading-relaxed">
            Ahana Aura works with selective C-Suite partners across 3 high-impact engagement models:
          </p>
          <div class="space-y-1 text-[11px] pt-1">
            <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <strong>1. Diagnostic Sprint (2 Weeks)</strong>: Rapid audit of bottlenecks, data architecture, and AI opportunity matrix.
            </div>
            <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <strong>2. Executive Advisory Retainer</strong>: Monthly board & C-Suite strategic steering, AI governance, and talent vetting.
            </div>
            <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <strong>3. Full Transformation Engagement</strong>: End-to-end autonomous systems deployment with shared upside KPIs.
            </div>
          </div>
        `;
      }

      if (q.includes('impact') || q.includes('metric') || q.includes('result') || q.includes('roi') || q.includes('case study') || q.includes('portfolio')) {
        return `
          <p class="leading-relaxed">
            Verified client outcomes from Ahana Aura's engagements include:
          </p>
          <ul class="space-y-1 list-disc pl-4 text-[11px]">
            <li><strong>₹3Cr+ Enterprise Value Generated</strong> across venture and enterprise clients.</li>
            <li><strong>19,000+ Corporate Operators Impacted</strong> by autonomous workflow automation.</li>
            <li><strong>45% Operational Speed Improvement</strong> in e-commerce fulfillment and customer ops.</li>
            <li><strong>85% Net Revenue Retention (NRR)</strong> for healthcare SaaS AI transformation.</li>
          </ul>
          <button class="px-2.5 py-1 rounded-lg bg-[#1e1b18] text-white text-[10px] font-mono cursor-pointer mt-1 hover:bg-[#c9a14a] transition-colors" data-teleport-room="4">
            ✦ Teleport to Portfolio Sector →
          </button>
        `;
      }

      if (q.includes('philosophy') || q.includes('values') || q.includes('principles') || q.includes('belief')) {
        return `
          <p class="leading-relaxed">
            Ahana's practice is anchored by 4 foundational pillars:
          </p>
          <ul class="space-y-1 text-[11px] list-disc pl-4 pt-1">
            <li><strong>Purpose-Driven Innovation</strong>: Tech must serve tangible EBITDA growth, never hype.</li>
            <li><strong>Excellence in Execution</strong>: <em>&ldquo;Strategy without flawless execution is just wishful thinking.&rdquo;</em></li>
            <li><strong>Continuous Learning</strong>: Daily AI adaptation to maintain insurmountable market moats.</li>
            <li><strong>Measurable Impact</strong>: Every single engagement is tied to verifiable unit economics.</li>
          </ul>
        `;
      }

      // Conversational fallback
      return `
        <p class="leading-relaxed">
          Thank you for reaching out. Ahana Aura specializes in converting enterprise complexity into autonomous high-margin systems.
        </p>
        <p class="leading-relaxed">
          Would you like to review her <strong>advisory services</strong>, run the <strong>ROI simulator</strong>, or submit a confidential advisory brief?
        </p>
        <div class="flex gap-2 pt-1">
          <button data-open-booking class="px-2.5 py-1 rounded-lg bg-[#1e1b18] text-white text-[10px] cursor-pointer">Book Advisory</button>
          <button class="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] cursor-pointer" onclick="document.querySelector('[data-open-roi]')?.click();">ROI Simulator</button>
        </div>
      `;
    };

    // Form submit handler
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = userInput.value.trim();
      if (!query) return;

      userInput.value = '';
      appendUserMessage(query);
      appendTypingIndicator();

      const typingDuration = 600 + Math.random() * 400;
      setTimeout(() => {
        try { soundEngine?.playChime?.(); } catch(e) {}
        const responseHtml = generateAIResponse(query);
        appendAIMessage(responseHtml);
      }, typingDuration);
    });

    // Quick chips click handlers
    document.querySelectorAll('.chat-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.replace('✦', '').trim();
        appendUserMessage(text);
        appendTypingIndicator();

        setTimeout(() => {
          try { soundEngine?.playChime?.(); } catch(e) {}
          const responseHtml = generateAIResponse(text);
          appendAIMessage(responseHtml);
        }, 700);
      });
    });
  }

  /* ---------------- SERVICES STRATEGIC PILLARS ENGINE ---------------- */
  setupServicesPillars() {
    this.activeServicePillar = 'strategy';

    const pillars = {
      strategy: {
        title: 'AI Strategy & Executive Roadmap',
        subtitle: 'From board vision to deterministic 12-month engineering delivery.',
        deliverables: [
          '12-Month Deterministic Tech & LLM Roadmap',
          'Vendor-Agnostic Model & GPU Infrastructure Audit',
          'Enterprise IP Moat & Data Governance Framework'
        ],
        metrics: [
          { label: 'Time-to-Production', val: '3.4x Faster' },
          { label: 'Compute Waste Eliminated', val: '-45% Drag' }
        ],
        syncStatus: '● 3D Lab: Screen 1 Neural Topology • Cyan Holo-Core'
      },
      automation: {
        title: 'Autonomous Workflows & Swarm Engineering',
        subtitle: 'Deploying self-healing multi-agent swarms that eliminate operational drag.',
        deliverables: [
          'Production Multi-Agent Swarm Orchestration',
          'Deterministic Tool Verification & Error Recovery',
          'ERP, CRM & Core Legacy Database Integration'
        ],
        metrics: [
          { label: 'Repetitive Labor Cut', val: '70% Saved' },
          { label: 'Workflow Execution SLA', val: '< 200ms' }
        ],
        syncStatus: '● 3D Lab: Screen 2 Real-Time Telemetry • Emerald Holo-Core'
      },
      caio: {
        title: 'Fractional Chief AI Officer (CAIO)',
        subtitle: 'Direct executive leadership for CEOs & Boards navigating AI transformation.',
        deliverables: [
          'Weekly C-Suite & Board Strategic Steering',
          'AI Engineering Leadership & Talent Vetting',
          'Enterprise Security, Compliance & Ethical AI Moats'
        ],
        metrics: [
          { label: 'Enterprise Track Record', val: '14+ Years' },
          { label: 'Corporate Impact', val: '10K+ Users' }
        ],
        syncStatus: '● 3D Lab: Screen 1 Governance Flow • Amber Gold Holo-Core'
      },
      revenue: {
        title: 'Demand & Revenue Scaling Engines',
        subtitle: 'Algorithmic pricing, customer intelligence & margin optimization.',
        deliverables: [
          'Dynamic Pricing & Checkout Conversion Engines',
          'Predictive Customer Retention & Churn Scoring',
          'Automated High-LTV Demand Architecture'
        ],
        metrics: [
          { label: 'Direct Value Generated', val: '₹1Cr+ Scale' },
          { label: 'Revenue Velocity', val: '+250% Growth' }
        ],
        syncStatus: '● 3D Lab: Screen 2 Demand Dashboard • Royal Violet Holo-Core'
      }
    };

    this.switchServicePillar = (pillarKey) => {
      if (!pillars[pillarKey]) return;
      this.activeServicePillar = pillarKey;
      try { soundEngine?.playClick?.(); } catch(e) {}

      // Update Tab Styles
      ['strategy', 'automation', 'caio', 'revenue'].forEach((k) => {
        const btn = document.getElementById(`service-tab-btn-${k}`);
        if (!btn) return;
        if (k === pillarKey) {
          btn.className = 'service-pill-btn flex-1 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#1e1b18] dark:text-white font-semibold shadow-sm transition-all text-center cursor-pointer text-[11px]';
        } else {
          btn.className = 'service-pill-btn flex-1 py-1 rounded-lg text-[#666] dark:text-slate-400 hover:text-[#1e1b18] transition-all text-center cursor-pointer text-[11px]';
        }
      });

      // Render Dynamic Pillar Card Content
      const cont = document.getElementById('service-content-container');
      if (cont) {
        const p = pillars[pillarKey];
        cont.innerHTML = `
          <div class="space-y-1">
            <h4 class="font-display font-bold text-sm text-[#1e1b18] dark:text-white">${p.title}</h4>
            <p class="font-sans text-[11px] text-[#635d55] dark:text-slate-300 italic">${p.subtitle}</p>
          </div>

          <div class="space-y-1.5 pt-1">
            ${p.deliverables.map(d => `
              <div class="flex items-center gap-2 text-[11px] font-sans text-slate-700 dark:text-slate-200">
                <span class="w-3.5 h-3.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                <span>${d}</span>
              </div>
            `).join('')}
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1.5">
            ${p.metrics.map(m => `
              <div class="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
                <div class="font-mono font-bold text-[#c9a14a] text-xs">${m.val}</div>
                <div class="text-[9px] text-slate-500 uppercase tracking-wider">${m.label}</div>
              </div>
            `).join('')}
          </div>

          <div class="pt-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>${p.syncStatus}</span>
          </div>
        `;
      }

      // Sync 3D Scene Holo-Core & Screens
      if (typeof this.sceneApp?.setServicesPillar === 'function') {
        this.sceneApp.setServicesPillar(pillarKey);
      }
    };

    if (window.__ahanaApp) {
      window.__ahanaApp.switchServicePillar = this.switchServicePillar;
    }
  }

  /* ---------------- PORTFOLIO PROJECTS ENGINE ---------------- */
  setupPortfolioProjects() {
    this.activePortfolioProject = 'fintech';

    this.selectPortfolioProject = (projectKey) => {
      this.activePortfolioProject = projectKey;
      try { soundEngine?.playClick?.(); } catch(e) {}

      // Update project list buttons in Card 4
      const btns = document.querySelectorAll('.portfolio-item-btn');
      btns.forEach((btn) => {
        const pk = btn.getAttribute('data-project');
        if (pk === projectKey) {
          btn.className = 'portfolio-item-btn w-full p-2.5 rounded-xl border border-[#c9a14a] bg-white/90 dark:bg-slate-800/90 flex justify-between items-center transition-all cursor-pointer text-left shadow-sm active-project';
        } else {
          btn.className = 'portfolio-item-btn w-full p-2.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 hover:border-slate-300 flex justify-between items-center transition-all cursor-pointer text-left';
        }
      });

      // Update dropdown in PPT modal if open
      const pptSelect = document.getElementById('ppt-project-select');
      if (pptSelect && pptSelect.value !== projectKey) {
        pptSelect.value = projectKey;
      }

      // Update 3D bars & monitors
      if (typeof this.sceneApp?.setPortfolioProject === 'function') {
        this.sceneApp.setPortfolioProject(projectKey);
      }

      // Re-render current slide if PPT modal is open
      if (typeof this.renderCurrentSlide === 'function') {
        this.renderCurrentSlide();
      }
    };

    if (window.__ahanaApp) {
      window.__ahanaApp.selectPortfolioProject = this.selectPortfolioProject;
    }
  }

  /* ---------------- PORTFOLIO DRONE TOAST CONTROLLER ---------------- */
  setupPortfolioDroneToast() {
    this.dismissDroneToast = () => {
      const toast = document.getElementById('drone-recon-toast');
      if (toast) {
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        toast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none');
        setTimeout(() => {
          if (toast.classList.contains('opacity-0')) {
            toast.classList.add('hidden');
          }
        }, 400);
      }
    };

    if (window.__ahanaApp) {
      window.__ahanaApp.dismissDroneToast = this.dismissDroneToast;
    }
  }

  /* ---------------- EXECUTIVE PPT SLIDE DECK PRESENTATION MODAL ---------------- */
  setupProjectPPTModal() {
    this.currentSlideIndex = 0;

    // Rich Presentation Deck Data for all 4 enterprise case studies
    const projectDecks = {
      fintech: {
        tag: 'CASE STUDY 01 // FINTECH HIGH-GROWTH',
        title: 'Autonomous Credit Underwriting & Real-Time Risk Engine',
        slides: [
          {
            category: '1. Executive Context & Challenge',
            headline: 'Scaling Underwriting from Days to Sub-Seconds without Credit Default Regression',
            challengePoints: [
              'Manual credit underwriting took 72 hours per loan application, driving a 42% applicant drop-off rate.',
              'Customer Acquisition Cost ($180 CAC) ballooned due to friction in risk decisioning.',
              'Data silos across 4 legacy databases prevented automated risk assessment.'
            ],
            mandate: 'Ahana Aura was brought in to architect a deterministic ML risk pipeline and real-time inference engine with sub-800ms SLA and zero credit loss regression.',
            metrics: [
              { label: 'Legacy Underwriting SLA', val: '72 Hours', alert: 'Critical' },
              { label: 'Applicant Drop-Off', val: '42%', alert: 'High Friction' },
              { label: 'Data Moat Readiness', val: '22%', alert: 'Siloed' }
            ]
          },
          {
            category: '2. Solution Architecture & Engineering',
            headline: 'Deterministic Real-Time Risk Inference & Automated Document RAG Pipeline',
            steps: [
              { title: 'Step 1: Document Extraction Agent', desc: 'High-speed OCR & document parsing with 99.4% precision on financial disclosures.' },
              { title: 'Step 2: Vector Embedding & Anomaly Scorer', desc: 'Real-time embedding vectorization cross-referenced against fraud clusters in 14ms.' },
              { title: 'Step 3: Multi-Agent Reasoning Swarm', desc: 'Consensus engine verifying credit eligibility against board-defined risk boundaries.' },
              { title: 'Step 4: Deterministic Action Engine', desc: 'SOC2 compliant automated loan disbursement trigger with complete audit trail.' }
            ],
            techStack: ['PyTorch', 'vLLM', 'TensorRT', 'FastAPI', 'Qdrant VectorDB', 'Kubernetes']
          },
          {
            category: '3. Verified Impact & Board ROI',
            headline: '+250% Revenue Acceleration & -65% Reduction in Acquisition Drag',
            bigStats: [
              { stat: '+250%', label: 'Revenue Growth in 6 Months' },
              { stat: '-65%', label: 'Customer Acquisition Cost ($180 → $63)' },
              { stat: '< 800ms', label: 'Underwriting Decision SLA (from 72h)' }
            ],
            quote: 'Ahana Aura transformed our underwriting velocity from an operational liability into our primary market moat. We scaled loan disbursements 3.5x with zero additional risk officers.',
            author: 'Chief Executive Officer, Scaler FinTech'
          },
          {
            category: '4. Enterprise Playbook & Scalability Moats',
            headline: 'Engineered for Long-Term Defense & Autonomous Governance',
            takeaways: [
              { title: 'Deterministic Guardrails Beat Raw Prompting', desc: 'Hand-crafted algorithmic constraints reduced hallucination risk to absolute 0.00%.' },
              { title: 'Latency is a Direct Conversion Moat', desc: 'Every 100ms shaved from the decision latency generated +4.2% higher checkout completion.' },
              { title: 'Autonomous Observability', desc: 'Continuous telemetry prevented model drift across 1.2M transactions over 12 months.' },
              { title: 'Complete IP Ownership', desc: '100% of the trained models and pipeline remain enterprise-owned with zero vendor lock-in.' }
            ]
          }
        ]
      },
      ecommerce: {
        tag: 'CASE STUDY 02 // GLOBAL ENTERPRISE COMMERCE',
        title: 'Autonomous Supply Chain & Algorithmic Pricing Engine',
        slides: [
          {
            category: '1. Executive Context & Challenge',
            headline: 'Dynamic Demand Optimization across 45,000 SKUs with High Market Volatility',
            challengePoints: [
              'Static manual pricing models resulted in inventory stockouts during demand spikes.',
              'Competitor repricing eroded gross margins by 18% across key consumer electronics categories.',
              'Warehousing logistics struggled with delayed restocking signals.'
            ],
            mandate: 'Architect an autonomous supply chain and pricing intelligence system capable of real-time inventory adjustments and margin protection.',
            metrics: [
              { label: 'Repricing Delay', val: '24 Hours', alert: 'Slow' },
              { label: 'Gross Margin Leakage', val: '18%', alert: 'Critical' },
              { label: 'Stockout Frequency', val: '14.5%', alert: 'High' }
            ]
          },
          {
            category: '2. Solution Architecture & Engineering',
            headline: 'Self-Balancing Inventory Routing & Elastic Demand Prediction',
            steps: [
              { title: 'Step 1: Real-Time Demand Ingestion', desc: 'Continuous stream analytics ingesting competitor pricing, supply costs, and traffic velocity.' },
              { title: 'Step 2: Reinforcement Learning Prig Engine', desc: 'Elastic pricing model maximizing gross dollar contribution without hurting brand equity.' },
              { title: 'Step 3: Autonomous Purchase Order Dispatcher', desc: 'Auto-replenishing inventory across regional fulfillment nodes.' },
              { title: 'Step 4: Margin Protection Guardrails', desc: 'Hard-coded floor pricing constraints ensuring profitability under all market swings.' }
            ],
            techStack: ['Ray Train', 'Apache Flink', 'PostgreSQL', 'Redis Cluster', 'GCP Vertex AI']
          },
          {
            category: '3. Verified Impact & Board ROI',
            headline: '₹2Cr Operating Cost Reduction & +45% Supply Chain Velocity',
            bigStats: [
              { stat: '₹2Cr+', label: 'Net Annual Operating Savings' },
              { stat: '+45%', label: 'Order-to-Fulfillment Speed' },
              { stat: '+31%', label: 'Gross Margin Expansion on High-Velocity SKUs' }
            ],
            quote: 'Ahana restructured our supply chain from a reactive cost center into an intelligent, high-margin revenue engine.',
            author: 'Chief Operating Officer, Global E-Commerce Group'
          },
          {
            category: '4. Enterprise Playbook & Scalability Moats',
            headline: 'Decentralized Edge Intelligence & Sustainable Margins',
            takeaways: [
              { title: 'Data Frequency Trumps Model Complexity', desc: 'Moving from batch processing to real-time event streaming delivered 80% of margin gains.' },
              { title: 'Algorithmic Guardrails', desc: 'Dynamic margin constraints prevented destructive race-to-the-bottom price wars.' },
              { title: 'Resilient Multi-Node Architecture', desc: 'System survived Black Friday traffic spikes of 180,000 requests/minute without downtime.' },
              { title: 'Autonomous Supplier Integration', desc: 'API connectivity eliminated 1,200 hours of manual procurement paperwork annually.' }
            ]
          }
        ]
      },
      health: {
        tag: 'CASE STUDY 03 // HEALTHTECH ENTERPRISE',
        title: 'Clinical Workflow Automation & Patient Retention RAG',
        slides: [
          {
            category: '1. Executive Context & Challenge',
            headline: 'Eliminating Physician Documentation Burden and Churn in Chronic Care',
            challengePoints: [
              'Physicians spent 4.2 hours daily on clerical charting and EHR transcription.',
              'Patient follow-up non-compliance resulted in a 35% churn rate in chronic care therapy.',
              'Strict HIPAA compliance made standard commercial LLM APIs unusable.'
            ],
            mandate: 'Deploy a private, zero-data-retention clinical assistant that automates EHR charting and increases continuous patient engagement.',
            metrics: [
              { label: 'Doctor Charting Time', val: '4.2 hrs/day', alert: 'Severe Burnout' },
              { label: 'Patient Therapy Churn', val: '35%', alert: 'High' },
              { label: 'HIPAA Readiness', val: 'Strict Tier 1', alert: 'Mandatory' }
            ]
          },
          {
            category: '2. Solution Architecture & Engineering',
            headline: 'Air-Gapped Private Clinical LLM with Zero Data Retention',
            steps: [
              { title: 'Step 1: Ambient Clinical Audio Summarizer', desc: 'Zero-retention voice transcription tuned to medical terminology and pharmacology.' },
              { title: 'Step 2: EHR Structured Synthesizer', desc: 'Converts consultation transcript into HL7/FHIR compliant clinical notes in 4 seconds.' },
              { title: 'Step 3: Patient Care Follow-Up Agent', desc: 'Predictive SMS & WhatsApp check-in agent tailored to individual care protocols.' },
              { title: 'Step 4: Compliance & Audit Shield', desc: 'Private VPC deployment with full end-to-end cryptographic audit trails.' }
            ],
            techStack: ['Whisper-Medical', 'Fine-Tuned Med-LLM', 'AWS GovCloud', 'FHIR API', 'LangGraph']
          },
          {
            category: '3. Verified Impact & Board ROI',
            headline: '10,000+ Active Patients Scaled with 85% Net Retention Rate',
            bigStats: [
              { stat: '10K+', label: 'Patients Managed Autonomously' },
              { stat: '85%', label: 'Annual Net Retention Rate (NRR)' },
              { stat: '-2.5 hrs', label: 'Doctor Administrative Time Saved Daily' }
            ],
            quote: 'Ahana Aura gave our clinicians their time back. Our doctors are happier, and our patient retention reached an all-time high of 85%.',
            author: 'Chief Medical Officer, HealthTech Scaleup'
          },
          {
            category: '4. Enterprise Playbook & Scalability Moats',
            headline: 'Trust, Compliance & Deterministic Safety in Regulated AI',
            takeaways: [
              { title: 'Air-Gapped Privacy is Table Stakes', desc: 'Zero-data retention architecture enabled rapid enterprise hospital network procurement.' },
              { title: 'Ambient Intelligence Beats Dashboards', desc: 'Doctors adopted the system because they never had to open a new software tab.' },
              { title: 'Predictive Empathy', desc: 'Automated follow-up care reminders reduced critical patient relapse by 44%.' },
              { title: 'Scalable Institutional Trust', desc: 'Audited by external cybersecurity firms with 100% compliance pass.' }
            ]
          }
        ]
      },
      saas: {
        tag: 'CASE STUDY 04 // ENTERPRISE DEVELOPER SAAS',
        title: 'Multi-Agent Support & Engineering Copilot Swarm',
        slides: [
          {
            category: '1. Executive Context & Challenge',
            headline: 'Scaling Developer Support for 500,000 API Engineers without Linear Headcount',
            challengePoints: [
              'Technical support volume exploded 400% following international platform release.',
              'Engineering spent 25% of sprint cycles answering Tier 3 technical integration tickets.',
              'Documentation was fragmented across 8 versions, confusing developers.'
            ],
            mandate: 'Build an autonomous multi-agent engineering copilot capable of resolving complex API integration tickets and generating working code snippets.',
            metrics: [
              { label: 'Ticket Volume Spike', val: '+400%', alert: 'Overwhelmed' },
              { label: 'Engineering Drag', val: '25% Sprints', alert: 'Lost Velocity' },
              { label: 'First Response Time', val: '14.5 Hours', alert: 'High CSAT Risk' }
            ]
          },
          {
            category: '2. Solution Architecture & Engineering',
            headline: 'Deterministic Code-Executing Swarm with Sandboxed Test Verification',
            steps: [
              { title: 'Step 1: Semantic Issue Classifier', desc: 'Decomposes developer bug reports into code, environment, and auth parameters.' },
              { title: 'Step 2: Version-Aware Documentation RAG', desc: 'Hybrid dense/sparse vector search across 500,000 pages of SDK code and changelogs.' },
              { title: 'Step 3: Sandboxed Code Runner', desc: 'Executes proposed code fix in isolated WebAssembly container before replying.' },
              { title: 'Step 4: Autonomous PR & Ticket Resolution', desc: 'Dispatches complete answer with verified reproducible sample.' }
            ],
            techStack: ['Python', 'WasmEdge', 'Llama-3-70B', 'FastAPI', 'ChromaDB', 'GitHub API']
          },
          {
            category: '3. Verified Impact & Board ROI',
            headline: '80% Autonomous Resolution Rate & 99.4% Developer CSAT',
            bigStats: [
              { stat: '80%', label: 'Tickets Resolved with Zero Human Intervention' },
              { stat: '99.4%', label: 'Developer Satisfaction (CSAT)' },
              { stat: '45 sec', label: 'Average Resolution Time (from 14.5 hours)' }
            ],
            quote: 'Ahana Aura built an AI support swarm that answers complex developer questions faster and more accurately than human engineers could.',
            author: 'VP of Product, Cloud API Unicorn'
          },
          {
            category: '4. Enterprise Playbook & Scalability Moats',
            headline: 'Executing Code in Real Time is the Ultimate Support Moat',
            takeaways: [
              { title: 'Never Guess Code Output', desc: 'Testing every generated code block in sandboxed Wasm containers eliminated hallucinations.' },
              { title: 'Feedback Flywheel', desc: 'Frequent failed queries automatically generated new documentation articles daily.' },
              { title: 'Developer Delight', desc: 'Response times under 60 seconds drove exponential referral growth among developers.' },
              { title: 'Uncoupled Growth', desc: 'Userbase doubled while customer support overhead remained completely flat.' }
            ]
          }
        ]
      }
    };

    this.renderCurrentSlide = () => {
      const deck = projectDecks[this.activePortfolioProject] || projectDecks.fintech;
      const slide = deck.slides[this.currentSlideIndex] || deck.slides[0];

      // 1. Update Top Bar Metadata
      const tagEl = document.getElementById('ppt-project-tag');
      const counterEl = document.getElementById('ppt-slide-counter');
      const titleEl = document.getElementById('ppt-project-title');
      const progressBar = document.getElementById('ppt-slide-progress-bar');

      if (tagEl) tagEl.textContent = deck.tag;
      if (counterEl) counterEl.textContent = `Slide 0${this.currentSlideIndex + 1} of 04`;
      if (titleEl) titleEl.textContent = deck.title;
      if (progressBar) {
        progressBar.style.width = `${((this.currentSlideIndex + 1) / 4) * 100}%`;
      }

      // 2. Update Segmented Category Tabs
      const tabs = document.querySelectorAll('.ppt-tab-btn');
      tabs.forEach((tab, idx) => {
        if (idx === this.currentSlideIndex) {
          tab.className = 'ppt-tab-btn px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer bg-[#1e1b18] text-white font-bold shadow-sm dark:bg-[#c9a14a] dark:text-[#181614]';
        } else {
          tab.className = 'ppt-tab-btn px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-[#635d55] hover:text-[#1e1b18] dark:text-[#a8a199] dark:hover:text-white font-medium';
        }
      });

      // 3. Update Slide Stepper Pills
      const stepBtns = document.querySelectorAll('#ppt-indicator-dots button');
      stepBtns.forEach((btn, idx) => {
        if (idx === this.currentSlideIndex) {
          btn.className = 'ppt-indicator-step text-[10px] font-mono font-bold px-3 py-0.5 rounded-full transition-all bg-[#c9a14a] text-slate-950 shadow-xs cursor-pointer ring-2 ring-[#c9a14a]/30';
        } else {
          btn.className = 'ppt-indicator-step text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full transition-all bg-[#e8dfd3] dark:bg-[#38332c] text-[#787168] hover:text-[#1e1b18] dark:hover:text-white cursor-pointer';
        }
      });

      // 4. Render Rich Slide Canvas
      const viewport = document.getElementById('ppt-slide-viewport');
      if (!viewport) return;

      if (this.currentSlideIndex === 0) {
        // Slide 1: Challenge (Executive Briefing & Friction Audit)
        viewport.innerHTML = `
          <div class="space-y-6 animate-slide-up">
            <div class="border-b border-[#e8dfd3] dark:border-[#38332c] pb-4">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span class="text-[11px] font-mono uppercase tracking-wider text-[#9e7629] dark:text-[#c9a14a] font-bold">Phase 01 // Executive Context & Strategic Challenge</span>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">AUDITED FRICTION</span>
              </div>
              <h2 class="font-display font-black text-2xl sm:text-3xl text-[#1e1b18] dark:text-white leading-tight tracking-tight">${slide.headline}</h2>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
              <div class="lg:col-span-7 space-y-4">
                <div class="bg-white/80 dark:bg-[#1f1b17]/80 border border-[#e8dfd3] dark:border-[#38332c] rounded-2xl p-5 shadow-xs space-y-3">
                  <div class="flex items-center justify-between border-b border-[#f0e8dc] dark:border-[#332c25] pb-2.5">
                    <h4 class="text-xs font-mono uppercase tracking-wider text-[#787168] dark:text-[#a8a199] font-bold flex items-center gap-2">
                      <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-500"></i>
                      Identified Enterprise Bottlenecks:
                    </h4>
                    <span class="text-[10px] font-mono text-[#8f6a1e] font-semibold">3 Critical Drag Vectors</span>
                  </div>
                  <div class="space-y-2.5">
                    ${slide.challengePoints.map((p, idx) => `
                      <div class="flex items-start gap-3 p-3 rounded-xl bg-[#faf6f0] dark:bg-[#26211c] border border-[#f0e8dc] dark:border-[#332c25] text-xs text-[#4a443c] dark:text-[#ded5c7] leading-relaxed font-sans">
                        <span class="w-5 h-5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">0${idx + 1}</span>
                        <span>${p}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="p-5 rounded-2xl bg-gradient-to-r from-[#faf6f0] via-[#f7f0e4] to-[#faf6f0] dark:from-[#241f1a] dark:via-[#2a241f] dark:to-[#241f1a] border-l-4 border-[#c9a14a] border-y border-r border-[#e8dfd3] dark:border-[#38332c] shadow-xs space-y-2">
                  <div class="flex items-center gap-2">
                    <i data-lucide="compass" class="w-4 h-4 text-[#c9a14a]"></i>
                    <span class="text-[11px] font-mono text-[#8f6a1e] dark:text-[#c9a14a] font-bold uppercase tracking-wider">Ahana Aura Strategic Advisory Mandate</span>
                  </div>
                  <p class="text-xs sm:text-sm text-[#2b2723] dark:text-[#ede4dc] leading-relaxed font-sans font-medium">
                    “${slide.mandate}”
                  </p>
                </div>
              </div>

              <div class="lg:col-span-5 space-y-3">
                <div class="flex items-center justify-between pb-1">
                  <h4 class="text-xs font-mono uppercase tracking-wider text-[#787168] dark:text-[#a8a199] font-bold flex items-center gap-2">
                    <i data-lucide="gauge" class="w-3.5 h-3.5 text-[#c9a14a]"></i>
                    Baseline Drag Metrics:
                  </h4>
                  <span class="text-[10px] font-mono text-slate-400">Pre-Deployment</span>
                </div>
                <div class="space-y-3">
                  ${slide.metrics.map(m => `
                    <div class="p-4 rounded-2xl bg-white dark:bg-[#1f1b17] border border-[#e8dfd3] dark:border-[#38332c] hover:border-[#c9a14a]/40 transition-all shadow-xs flex items-center justify-between group">
                      <div class="space-y-0.5">
                        <div class="text-[10px] text-[#787168] dark:text-[#a8a199] uppercase font-mono font-semibold tracking-wider">${m.label}</div>
                        <div class="text-2xl font-black font-mono text-[#1e1b18] dark:text-white tracking-tight">${m.val}</div>
                      </div>
                      <div class="text-right">
                        <span class="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold inline-flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          ${m.alert}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentSlideIndex === 1) {
        // Slide 2: Solution Architecture (4-Phase Engineering Pipeline)
        viewport.innerHTML = `
          <div class="space-y-6 animate-slide-up">
            <div class="border-b border-[#e8dfd3] dark:border-[#38332c] pb-4">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-[#c9a14a]"></span>
                <span class="text-[11px] font-mono uppercase tracking-wider text-[#9e7629] dark:text-[#c9a14a] font-bold">Phase 02 // Solution Architecture & Systems Design</span>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#c9a14a]/15 text-[#8f6a1e] dark:text-[#c9a14a] border border-[#c9a14a]/25">PRODUCTION VERIFIED</span>
              </div>
              <h2 class="font-display font-black text-2xl sm:text-3xl text-[#1e1b18] dark:text-white leading-tight tracking-tight">${slide.headline}</h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              ${slide.steps.map((st, i) => `
                <div class="p-5 rounded-2xl bg-white dark:bg-[#1f1b17] border border-[#e8dfd3] dark:border-[#38332c] hover:border-[#c9a14a] hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between shadow-xs">
                  <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c9a14a] to-amber-200 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="px-2 py-0.5 rounded-md bg-[#c9a14a]/15 text-[#8f6a1e] dark:text-[#c9a14a] text-[10px] font-mono font-bold">PHASE 0${i + 1}</span>
                      <span class="text-[10px] font-mono text-[#8a8276]">${(i + 1) * 25}% COMPLETE</span>
                    </div>
                    <h4 class="text-xs sm:text-sm font-bold text-[#1e1b18] dark:text-white font-sans leading-snug pt-1">${st.title}</h4>
                    <p class="text-xs text-[#554f46] dark:text-[#ded5c7] font-sans leading-relaxed pt-1">${st.desc}</p>
                  </div>
                  <div class="mt-4 pt-3 border-t border-[#f0e8dc] dark:border-[#2e2720] flex items-center justify-between text-[10px] font-mono text-[#8f6a1e] dark:text-[#c9a14a] font-semibold">
                    <span>Active Pipeline</span>
                    <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="p-4 rounded-2xl bg-[#faf6f0] dark:bg-[#1f1b17] border border-[#e8dfd3] dark:border-[#38332c] flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div class="flex items-center gap-2">
                <i data-lucide="layers" class="w-4 h-4 text-[#c9a14a]"></i>
                <span class="text-xs font-mono uppercase tracking-wider text-[#787168] dark:text-[#a8a199] font-bold">Audited Production Technology Stack:</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                ${slide.techStack.map(tech => `
                  <span class="px-3 py-1.5 rounded-xl bg-white dark:bg-[#28221c] border border-[#ded5c6] dark:border-[#3a332a] text-[#1e1b18] dark:text-white font-mono text-xs font-semibold shadow-xs flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#c9a14a]"></span>
                    ${tech}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } else if (this.currentSlideIndex === 2) {
        // Slide 3: Impact & Board ROI (Hero Metrics Showcase)
        const labels = ['Primary Revenue / Efficiency Multiplier', 'Operational Unit Economics Shift', 'Velocity & SLA Acceleration'];
        const pills = ['▲ VERIFIED GAIN', '▼ DRAG REDUCED', '⚡ SPEED LEAP'];

        viewport.innerHTML = `
          <div class="space-y-6 animate-slide-up">
            <div class="border-b border-[#e8dfd3] dark:border-[#38332c] pb-4">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-[11px] font-mono uppercase tracking-wider text-[#9e7629] dark:text-[#c9a14a] font-bold">Phase 03 // Verified Commercial Impact & Board ROI</span>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">AUDITED ROI</span>
              </div>
              <h2 class="font-display font-black text-2xl sm:text-3xl text-[#1e1b18] dark:text-white leading-tight tracking-tight">${slide.headline}</h2>
            </div>

            <!-- 3 Hero Metric Cards with Top Gold Bar & Accent Badges -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              ${slide.bigStats.map((bs, idx) => `
                <div class="p-6 rounded-2xl bg-gradient-to-b from-white to-[#fcfaf6] dark:from-[#221e1a] dark:to-[#1c1815] border border-[#e8dfd3] dark:border-[#38322a] hover:border-[#c9a14a] hover:shadow-lg transition-all relative overflow-hidden group shadow-sm flex flex-col justify-between">
                  <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c9a14a] via-amber-300 to-[#9e7629]"></div>
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-[10px] font-mono text-[#787168] dark:text-[#a8a199] font-bold uppercase tracking-wider">${labels[idx] || 'Verified Metric'}</span>
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">${pills[idx] || 'CONFIRMED'}</span>
                    </div>
                    <div class="text-4xl sm:text-5xl font-mono font-black text-[#1e1b18] dark:text-[#c9a14a] tracking-tight group-hover:scale-105 transition-transform duration-300 origin-left py-1">${bs.stat}</div>
                    <div class="text-xs sm:text-sm text-[#4a443c] dark:text-[#ded5c7] font-sans font-medium leading-relaxed mt-2">${bs.label}</div>
                  </div>
                  <div class="mt-4 pt-3 border-t border-[#f0e8dc] dark:border-[#2e2720] flex items-center justify-between text-[10px] font-mono text-[#8f6a1e] dark:text-[#c9a14a]">
                    <span>Continuous Telemetry</span>
                    <span class="font-bold">100% Deterministic</span>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Executive C-Suite Testimonial Dossier -->
            <div class="p-6 rounded-2xl bg-gradient-to-r from-[#faf6f0] via-[#fdfbf7] to-[#faf6f0] dark:from-[#221e19] dark:via-[#26211c] dark:to-[#221e19] border border-[#e8dfd3] dark:border-[#38322a] relative shadow-sm space-y-3">
              <div class="text-4xl text-[#c9a14a] font-serif leading-none opacity-40 select-none absolute top-4 left-5">“</div>
              <p class="text-sm sm:text-base text-[#2b2723] dark:text-[#ede4dc] italic leading-relaxed font-sans pl-6 relative z-10 font-medium">
                ${slide.quote}
              </p>
              <div class="flex items-center justify-between pt-2 border-t border-[#ece3d5] dark:border-[#332b23] flex-wrap gap-2">
                <div class="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  <i data-lucide="shield-check" class="w-4 h-4"></i>
                  <span>Verified Enterprise C-Suite Testimonial</span>
                </div>
                <div class="text-right">
                  <span class="text-xs sm:text-sm font-mono font-bold text-[#1e1b18] dark:text-white">— ${slide.author}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentSlideIndex === 3) {
        // Slide 4: Enterprise Playbook & Scalability Moats
        viewport.innerHTML = `
          <div class="space-y-6 animate-slide-up">
            <div class="border-b border-[#e8dfd3] dark:border-[#38332c] pb-4">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <span class="text-[11px] font-mono uppercase tracking-wider text-[#9e7629] dark:text-[#c9a14a] font-bold">Phase 04 // Executive Playbook & Scalability Moats</span>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">BOARD PLAYBOOK</span>
              </div>
              <h2 class="font-display font-black text-2xl sm:text-3xl text-[#1e1b18] dark:text-white leading-tight tracking-tight">${slide.headline}</h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              ${slide.takeaways.map((tw, idx) => `
                <div class="p-5 rounded-2xl bg-white dark:bg-[#1f1b17] border border-[#e8dfd3] dark:border-[#38332c] hover:border-[#c9a14a] hover:shadow-md transition-all space-y-2 relative overflow-hidden group shadow-xs">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <span class="w-7 h-7 rounded-xl bg-[#c9a14a]/15 text-[#8f6a1e] dark:text-[#c9a14a] text-xs font-mono font-bold flex items-center justify-center border border-[#c9a14a]/25">0${idx + 1}</span>
                      <h4 class="text-xs sm:text-sm font-bold text-[#1e1b18] dark:text-white font-sans">${tw.title}</h4>
                    </div>
                    <span class="text-[10px] font-mono text-[#8a8276] uppercase">Strategic Moat</span>
                  </div>
                  <p class="text-xs sm:text-sm text-[#554f46] dark:text-[#ded5c7] leading-relaxed font-sans pl-9">${tw.desc}</p>
                  <div class="pt-2 pl-9">
                    <span class="px-2 py-0.5 rounded-md bg-[#faf6f0] dark:bg-[#28221c] border border-[#e8dfd3] dark:border-[#38322a] text-[10px] font-mono text-[#8f6a1e] dark:text-[#c9a14a] font-semibold">
                      ✦ Core Defensive Moat
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

    this.openProjectPPT = (projectKey) => {
      if (projectKey) {
        this.selectPortfolioProject(projectKey);
      }
      this.currentSlideIndex = 0;
      this.renderCurrentSlide();

      const modal = document.getElementById('project-ppt-modal');
      const backdrop = document.getElementById('project-ppt-backdrop');
      if (modal && backdrop) {
        modal.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        backdrop.classList.remove('pointer-events-none');
        backdrop.classList.add('pointer-events-auto');
        try { soundEngine?.playChime?.(); } catch(e) {}
      }
    };

    this.closeProjectPPT = () => {
      const modal = document.getElementById('project-ppt-modal');
      const backdrop = document.getElementById('project-ppt-backdrop');
      if (modal && backdrop) {
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('pointer-events-auto');
        backdrop.classList.add('pointer-events-none');
        setTimeout(() => {
          modal.classList.add('hidden');
        }, 300);
      }
    };

    this.goToSlide = (slideIdx) => {
      if (slideIdx < 0 || slideIdx >= 4) return;
      this.currentSlideIndex = slideIdx;
      try { soundEngine?.playClick?.(); } catch(e) {}
      this.renderCurrentSlide();
    };

    this.nextSlide = () => {
      this.goToSlide((this.currentSlideIndex + 1) % 4);
    };

    this.prevSlide = () => {
      this.goToSlide((this.currentSlideIndex - 1 + 4) % 4);
    };

    if (window.__ahanaApp) {
      window.__ahanaApp.openProjectPPT = this.openProjectPPT;
      window.__ahanaApp.closeProjectPPT = this.closeProjectPPT;
      window.__ahanaApp.goToSlide = this.goToSlide;
      window.__ahanaApp.nextSlide = this.nextSlide;
      window.__ahanaApp.prevSlide = this.prevSlide;
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  let toast = document.getElementById('hq-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hq-toast';
    toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-[#1e1b18] text-white text-xs font-mono tracking-wider shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 -translate-y-2';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('opacity-0', '-translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-2');
  }, 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  new AhanaApp();
});
