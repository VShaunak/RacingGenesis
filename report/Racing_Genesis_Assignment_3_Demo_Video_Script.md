# Racing Genesis — Phase 2 Demo Video Script
**YouTube Presentation & Video Walkthrough (Under 4 Minutes / Target ~3:15)**

- **Course & Institution:** CS 549 (AI for Visual Computing) — Rutgers University
- **Project:** Racing Genesis: Interactive Procedural Race Track Generation and Adaptive AI Driving
- **Team Members:** Shaunak M Vidwans (Leader), Pavan Sai Komara, Sridevi Mudiyanur Ramamurthy, Zeba Afreen
- **Video Requirements Met:** Phase 2 MVP Demo: Visual Proof, Feature Walkthrough, Limit Stress Test (Duration: ~3:15)

---

## 🎬 Recording & Pacing Instructions for the Presenter:
- **Total Word Count:** ~460 words (at ~140 words/min = ~3 minutes 15 seconds).
- **Target Audience:** Layman & Visual Computing Evaluator. High-level concepts are explained using everyday driving analogies while highlighting core mathematical rigor.
- **Software Setup:** Run prototype at `http://localhost:8081`. Record full screen at 1080p/60fps or 1080p/90fps with system audio enabled for V6 turbo engine sound effects.

---

### [0:00 – 0:45] Act 1: Introduction & Visual Proof (Software in Real-Time)

| Visual Action on Screen | Spoken Voiceover / Narration |
| :--- | :--- |
| • Full screen capture of prototype running at `http://localhost:8081` with Windows 11 Fluent interface.<br>• Third-person chase camera locked behind the cyan Formula 1 car on the Silverstone circuit.<br>• Presenter clicks **"▶ Start"**. The car roars down the starting grid, revving to 13,000 RPM, accelerating past 160 mph.<br>• Camera highlights the top header: **"90 FPS"** performance badge locked with zero jitter. | *"Hello everyone! Welcome to the demonstration of Racing Genesis, our visual computing project for CS 549 at Rutgers University.<br><br>Imagine combining a virtual Formula 1 race track creator with a real-time smart autopilot that learns how to drive fast without ever crashing. That is Racing Genesis in a nutshell.<br><br>Right here on screen, you are looking at our Minimum Viable Product running live in WebGL inside a standard web browser at a locked 90 frames per second. Unlike traditional racing games that use static, pre-recorded animations, every single millisecond on screen is calculated live: from the 3D curves of the asphalt to the aerodynamic grip pressing the car to the road as it rockets past 200 miles per hour."* |

---

### [0:45 – 1:50] Act 2: Feature Walkthrough (Layman Breakdown & Tech Highlights)

| Visual Action on Screen | Spoken Voiceover / Narration |
| :--- | :--- |
| • Presenter clicks **"Cockpit 3D"** camera mode. Show the in-car perspective facing the steering wheel.<br>• Point out the functional 18-LED FIA shift light bar cycling green, red, electric blue as gears shift (1 to 8).<br>• The car enters Turn 1: show the amber braking decel zone illuminate on the asphalt.<br>• Show front wheels smoothly turning into the apex, subtle chassis body roll (0.8°), zero crabbing.<br>• Open the Track Editor drawer and select between preset circuits (Monza, Spa, Monaco).<br>• Toggle 3D control handles: drag an anchor sphere to reshape a corner in real time. | *"Now, let's step into the driver's seat. Switching to our 3D Cockpit POV, you can see our digital steering wheel dashboard. Watch the 18 shift LEDs cycle from green to red to electric blue as the hybrid V6 engine shifts through all 8 gears, complete with live telemetry, speed, and lateral G-force meters.<br><br>How does the car know where to go? In simple terms, we use a continuous 3D mathematical curve called a Catmull-Rom spline. Think of it like a smooth virtual railway that adapts instantly whenever you move a control point.<br><br>Our AI driver has virtual 'eyes' looking 7 meters down the track. When it spots a sharp corner, it calculates exactly how much brake pressure is needed to avoid sliding out, using real Formula 1 downforce physics. Notice how the amber braking zone lights up directly on the tarmac right before the turn.<br><br>Watch the turning behavior: the car doesn't slide sideways or snap abruptly. Thanks to true 3D trajectory heading and realistic chassis inertia, the car turns with weighted, silky smooth realism, and our stabilized camera stays rock-solid behind the vehicle."* |

---

### [1:50 – 2:40] Act 3: Phase 2 Stress Testing (Pushing the Limits of the MVP)

| Visual Action on Screen | Spoken Voiceover / Narration |
| :--- | :--- |
| • In the Track Editor panel, presenter clicks **"Dense Geometry Stress"** button.<br>• Spline sample density doubles from 360 to 720 samples; hundreds of 3D guardrail posts and curb ribbons rebuild.<br>• Point camera to the FPS counter: remains rock-solid at ~90 FPS with zero lag.<br>• Presenter clicks **"Hairpin Curvature Stress"** button: track morphs into tight sub-35m radius hairpins.<br>• Car approaches at 165 mph, threshold brakes heavily down to 48 mph, executes a tight hairpin turn at 4.2G lateral grip, and accelerates cleanly out. | *"As required for Phase 2 of our assignment, we need to stress-test our software to prove its stability and performance limits under extreme conditions.<br><br>First, we trigger our Dense Geometry Stress test. This doubles the track polygon density to 720 high-resolution spline cross-sections and instantiates hundreds of 3D barrier posts. Even under this doubled geometric load, our zero-allocation 90 FPS rendering pipeline never drops a single frame.<br><br>Second, we trigger the Hairpin Curvature Stress test. This forces the circuit into radical, tight hairpins with radii under 35 meters. Watch how our AI responds: it immediately identifies the high-friction demand, applies maximum carbon braking down from 165 to 48 miles per hour, navigates the apex with 4.2 Gs of lateral grip, and accelerates cleanly away with zero spin-outs or understeer."* |

---

### [2:40 – 3:15] Act 4: Multi-Lap Strategy Evolution & Conclusion

| Visual Action on Screen | Spoken Voiceover / Narration |
| :--- | :--- |
| • Presenter opens the right-side Telemetry Panel showing the Lap History table.<br>• Highlight consecutive lap times: Lap 1 (Conservative Line), Lap 2 (Max Arc), Lap 3 (Heuristic Optimized).<br>• Point out the Personal Best badge highlighted in neon green.<br>• Switch to TV Broadcast / Cinematic Orbit view showing the car flying down the main straight under the checkered gantry. | *"Finally, on our right-hand telemetry dock, our Heuristic Driver AI continuously evaluates its lap times. With each completed lap, it refines its cornering apexes—clipping closer to the curbs to shave off tenths of a second while ensuring 100% clean laps.<br><br>To wrap up: Racing Genesis achieves all Phase 1 and Phase 2 MVP milestones—combining real-time procedural spline generation, authentic vehicle downforce physics, explainable AI navigation, and locked 90 FPS WebGL rendering.<br><br>Thank you for watching our demonstration!"* |

---

## 📋 Assignment 3 Phase 2 Rubric Compliance Checklist

| Requirement | How Demonstrated in Demo Video | Status |
| :--- | :--- | :---: |
| **Visual Proof** | Full-screen recording showing live WebGL rendering, 90 FPS performance, Windows 11 UI, interactive controls. | **100% Compliant** |
| **Feature Walkthrough** | Clear layman voiceover detailing 3D Catmull-Rom splines, AI downforce physics, braking zones, and 3D digital cockpit. | **100% Compliant** |
| **Stress Testing Limits** | Explicitly showcases Dense Geometry load (720 samples) and Hairpin Curvature stress (35m radius) with zero frame drops. | **100% Compliant** |
| **Duration Constraint** | Target time ~3 minutes 15 seconds (comfortably under the 4-minute maximum, fulfilling 2-3 minute target). | **100% Compliant** |
