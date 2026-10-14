# Assignment 3 - MVP Prototype & Verification Simulator

This folder contains the **Assignment 3 MVP Interactive Simulator** for **Racing Genesis**. It represents the completed "Narrow Vertical Slice" of the semester project, fulfilling all requirements specified in `Assignment 3_ MVP Development.pdf`.

## Core Features & Advanced Modifications (vs. Assignment 2)

1. **Direct 3D Spline Handle Editing & Sculpting**:
   - Click **"Toggle 3D Edit Handles"** to expose 10 glowing cyan 3D control anchors with ground footprint rings.
   - **Tap & Hold / Click & Drag**: Grab any cyan dot directly and drag it anywhere across the 3D ground plane to mold and sculpt the circuit to your will in real time. The underlying centripetal Catmull-Rom spline, asphalt ribbon, curbs, guardrails, and AI braking vectors update smoothly at 60 FPS.
   - **Pinch to Scale**: On touch screens or trackpads, pinch with two fingers to dynamically expand or contract the circuit scale or orbit zoom.
   - Automatically activates bird's-eye Orbit camera mode for optimal 3D sculpting ergonomics.

2. **Phase 2 Stress Testing Suite (Required by Assignment 3)**:
   - **Dense Geometry Stress**: Doubles sample resolution to 720 samples and renders hundreds of 3D guard rail posts to test WebGL draw-call and vertex throughput at a solid 60 FPS.
   - **Hairpin Curvature Stress**: Forces an aggressive S-chicane hairpin sequence to test whether the AI driver's look-ahead deceleration and bicycle understeer dynamics stably keep the car on track without flying off.
   - **10x Warp Simulation Speed**: Tests fixed 120 Hz physics integration stability under extreme time-scaling (1,200 physics steps/sec).

3. **Multi-Camera Third-Person System**:
   - **3rd Person Chase**: Dynamic follow camera with heading interpolation and speed-dependent FOV widening.
   - **Cockpit / Hood**: Authentic driver eye perspective looking down the track over the animated steering wheel.
   - **Top / Orbit**: Orthographic / tactical overview with mouse drag rotation and scroll zoom.

4. **Bicycle Physics & Curvature Law**:
   - $v_{safe} = \sqrt{\frac{\mu g}{|\kappa|}}$.
   - Lookahead braking demand: $a_{req} = \frac{v^2 - v_{target}^2}{2 \cdot d_{brake}}$.
   - Multi-lap heuristic strategy evaluation: Conservative, Balanced, and Late Brake.

5. **Web Audio Sound Synthesis**:
   - Built-in Web Audio API engine oscillator scaling pitch dynamically with speed and RPM.

---

## How to Run Locally

You can serve this prototype with Python's built-in HTTP server:

```powershell
cd "D:\My files\Rutgers\7-AI for Visual Computing\All assignments\Assignment-3\prototype"
python -m http.server 8081
```

Then open in Google Chrome, Microsoft Edge, or Mozilla Firefox:
👉 **[http://localhost:8081](http://localhost:8081)**
