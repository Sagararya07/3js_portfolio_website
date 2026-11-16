# Ahana Aura — 3D Virtual Headquarters (Architectural Dollhouse)

An interactive, award-winning 3D architectural dollhouse experience built for **Ahana Aura** ([ahanaaura.com](https://ahanaaura.com/)) using **Three.js WebGL**, matching the structural excellence of the reference project ([next-gen-office](file:///c:/Users/Sagar%20R/OneDrive/Documents/prompt%20animation%20website/next-gen-office/) & [kriss.ai](https://kriss.ai/)).

---

## 🌟 What's New & Upgraded

### 1. Seamless Mouse Wheel & Touch Navigation
* **Mouse Wheel Scroll**: Scrolling the mouse wheel down seamlessly advances to the next room (`Overview → Reception → About Me → Services → Portfolio Projects → Overview`). Scrolling up returns to the previous room with cooldown debouncing.
* **Touch & Keyboard Controls**: Supports touch swipes, arrow keys `[↑ / ↓ / ← / →]`, number keys `[0-4]`, and `[Esc]`.

### 2. Full 3D Rotation & Continuous Kinetic Animation
* **Continuous Turntable & Floating Motion**: In Overview mode, the entire building gently breathes with a sinusoidal floating motion and subtle rotational turntable orbit.
* **Interactive 360° Mouse Drag**: In Overview mode, clicking and dragging on the canvas allows free 360° turntable rotation to view the building from any angle.
* **Dynamic Camera Arc Transitions**: Moving between rooms triggers a smooth cubic ease-in-out arc interpolation.
* **Autonomous AI Patrol Drone**: 4-rotor gold-and-obsidian companion drone flies with physics-based bank tilt and spotlight to inspect the active room.
* **In-Room Kinetic Animations**:
  * **Reception**: Spinning golden "AA" crystal monogram with dual rotating astrolabe rings; rising steam particles from coffee cup.
  * **About Me**: Rotating 3D holographic client network globe with glowing city nodes (Bangalore, Singapore, London, NY); spinning kinetic brass gyroscope.
  * **Services**: Central holographic hexagonal projector with rotating 3D core and 6 orbiting service nodes (`PF`, `SV`, `BS`, `MF`, `DP`, `GP`); animated flashing server rack LEDs; articulated robotic arm.
  * **Portfolio Projects**: Oscillating 3D bar chart bars, rotating holographic warehouse cube, and concentric diagnostic rings.

### 3. Crystal-Clear Visibility & Architectural Lighting
* **Travertine Inset Flooring**: Floors are rendered in light architectural travertine stone (`#e2dad2`), ensuring all walnut desks, leather chairs, and props contrast with razor-sharp clarity.
* **Multi-Tier Lighting**:
  * High-intensity ambient light (`0.95`).
  * Powerful directional sunlight (`2.6`) casting soft architectural shadows.
  * Directional rim light (`1.4`) highlighting silhouettes.
  * Four dedicated warm golden interior downlights (`3.2+` intensity) illuminating the interior of each room.
* **Zero Visual Obstruction**: The front facade of the building is completely open with low glass railings so no walls block the view of furniture and props.

### 4. Reference Project UI Architecture
* **Top Glass Capsule**: Monogram logo, 5 room navigation pills (`Home`, `Reception`, `About Me`, `Services`, `Portfolio Projects`), lighting stage toggles, and audio button.
* **Hero Headline Overlay (State 0)**: Centered floating executive card in Overview mode with CTA buttons and scroll hints.
* **4 Floating Room Information Cards (States 1 to 4)**: Dedicated sector cards with live status badges, metric counters, actionable buttons, and Prev/Next room navigation.
* **Modals**:
  * Strategic Advisory Consultation Booking Modal (with form validation).
  * Dynamic Enterprise Transformation ROI Simulator.

---

## 🏃‍♂️ How to Run Locally

```powershell
cd "c:\Users\Sagar R\OneDrive\Documents\prompt animation website\ahanaportfolio"
python -m http.server 8000
```

Open **`http://localhost:8000/`** (or `http://localhost:8000/ahanaportfolio/`) in your browser.
