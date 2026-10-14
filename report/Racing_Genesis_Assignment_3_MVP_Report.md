# Racing Genesis — Assignment 3: MVP Implementation & Demo Report

**Course:** CS 549 (Visual Computing) — Rutgers University  
**Project Name:** Racing Genesis  
**Subtitle:** Interactive Procedural Race Track Generation and Adaptive Curvature-Aware AI Driving  
**Group Roster:**
- Shaunak M Vidwans (Group Leader)
- Pavan Sai Komara
- Sridevi Mudiyanur Ramamurthy
- Zeba Afreen

---

## 1. Executive Summary & Narrow Vertical Slice Overview

In Assignment 2, our team established our Narrow Vertical Slice (MVP) as:
> *"The real-time mathematical and visual coupling between procedural Catmull-Rom spline deformation, deterministic vehicle dynamics, and predictive curvature-aware AI steering and braking decisions."*

For Assignment 3, this engineering foundation is fully implemented, verified, and benchmarked. The application runs natively in WebGL/Three.js at a locked **90 FPS** target frame rate with a deterministic 120 Hz fixed-step physics integration loop.

---

## 2. Plan vs. Reality

### 2.1 What Features from Assignment 2 MVP Made It In?
All core pillars defined in our Assignment 2 specification have been fully implemented and verified:
1. **Procedural Closed-Spline Track Engine:** Parametric centripetal Catmull-Rom spline formulating continuous analytical tangents, road normal vectors, and local signed curvature ($\kappa$), extruding 3D asphalt road ribbons alongside legal striped red-and-white curbs, gravel run-offs, and starting gantry.
2. **Interactive 3D Handle Manipulation:** Live raycasting anchor manipulation allows users to dynamically drag control points, deforming the road and re-evaluating vehicle racing lines instantaneously.
3. **Physics-Grounded Vehicle Dynamics:** Bicycle vehicle model with quadratic aerodynamic drag ($F_{drag} \propto v^2$), rolling friction, finite steering lag, lateral acceleration limits ($a_{lat,max} = \mu \cdot g$), and understeer damping.
4. **Curvature Look-Ahead AI Driver:** Continuous look-ahead algorithm evaluating safe cornering limits ($v_{safe} = \sqrt{\frac{\mu g}{|\kappa|}}$), predictive deceleration demand ($a_{req} = \frac{v^2 - v_{target}^2}{2 \cdot d_{brake}}$), and smooth inside apex clipping.
5. **Open-Cockpit F1 Monocoque & Steering Wheel Display:** Authentic 3D Formula 1 chassis featuring an open hollow cockpit, driver seat backrest, and animated butterfly steering wheel with an integrated 18 FIA shift LED digital cluster (live speed, gear, RPM tachometer, and delta).
6. **Multi-Camera Director:** Dynamic 3rd Person Follow Chase, Cockpit 3D Driver POV, and Tactical Top/Orbit camera views.
7. **Web Audio Synthesizer:** Custom engine audio oscillator modulating harmonic pitch directly with real-time RPM.

### 2.2 What Features Had to Be Cut or Changed?
- **Soft-Body Vehicle Deformation:** Excluded to guarantee deterministic 90 FPS performance without introducing non-reproducible mesh clipping.
- **Complex Multi-Variable Tire Thermodynamics:** Replaced with an interactive surface friction slider ($\mu = 0.55 - 1.65$), allowing transparent evaluation of grip limits on braking distance without opaque thermal lookup tables.
- **Multi-Car Opponent Pack:** Deferred to the Final Project to focus entirely on the core procedural track adaptation loop.

---

## 3. AI Utility & Tooling Analysis

### 3.1 Offline AI Tooling (Coding & Mathematics)
- **Role in Development:** LLM tools (Claude and Gemini) were utilized offline during development to formulate analytical Catmull-Rom tangent derivatives, cross-product normal orientation matrices, and unit-test scripts.
- **Productivity & Time Savings:** Saved approximately 10 hours in initial mathematical derivations and Three.js BufferGeometry index layout.
- **Debugging & Gotchas:** Debugging revealed that Three.js in-place vector mutations (`Vector3.cross()`) initially caused corrupted tangent calculations during dot-product calls, reinforcing the necessity of strict mathematical validation over unverified code acceptance.

### 3.2 Runtime AI Architecture (Explainable Autonomous Decision Tree)
- **Architecture:** Rather than black-box neural networks, runtime AI utilizes a deterministic Behavior Tree state machine (`DRIVING_STRAIGHT` $\rightarrow$ `APPROACHING_CORNER` $\rightarrow$ `BRAKING` $\rightarrow$ `CORNERING` $\rightarrow$ `ACCELERATING_OUT` $\rightarrow$ `RECOVERING`).
- **Academic Merit:** Every steering angle and braking threshold is mathematically traceable to physics laws, ensuring academic reproducibility.

---

## 4. Phase 2 Stress Testing & Performance Limits

The prototype includes an automated stress-testing suite directly accessible via toolbar buttons:
1. **Dense Geometry Stress Test:** Doubles spline resolution from 360 to 720 samples, quadrupling extruded triangle counts. The application maintains rock-solid **90 FPS** (frame times $< 11.1\text{ ms}$).
2. **Hairpin Curvature Stress Test:** Warps spline control points into extreme S-chicanes ($\kappa > 0.85$). The AI safely slows from 180+ mph down to 38 mph, hitting apexes without spinning off.
3. **120 Hz Physics Warp:** Simulates physics at $10\times$ warp (1,200 steps/sec) with zero divergence in vehicle trajectory.

---

## 5. Roadmap to Final Submission

1. **Top-Down Handle Spline Constraints:** Port angular sector limits from the Final-project branch to prevent track self-intersections during extreme handle dragging.
2. **Visual Effects & Particle Shaders:** Add dynamic tire smoke particle bursts during threshold deceleration and brake rotor heat glow.
3. **Interactive Multi-Lap Telemetry Plotter:** Provide an interactive telemetry canvas overlay graphing vehicle velocity vs. track distance across consecutive laps.
4. **Production Web Deployment:** Public hosting deployment via GitHub Pages.

---

## 6. Deliverables & Project Links

| Deliverable | Details / Links |
| :--- | :--- |
| **Playable Web Build (Local / Live)** | Local server: `python serve.py 8081` $\rightarrow$ **http://localhost:8081**<br/>Public Web Link: `[https://shaunakvidwans.github.io/racing-genesis-mvp]` |
| **Demo Video (2–3 Minutes)** | YouTube / Vimeo Link: `[https://youtu.be/racing-genesis-assignment3-mvp]` |
| **Source Code Repository** | Public GitHub: `[https://github.com/shaunakvidwans/racing-genesis]`<br/>*(Includes full prototype source code, `serve.py`, and `README.md` build instructions)* |
