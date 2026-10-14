# Racing Genesis — Assignment 3: MVP Development Submission Package

**Course**: AI for Visual Computing (CS 535)  
**Project**: Racing Genesis: Physics-Driven Procedural F1 Racing Simulation    
**Submission Date**: October 13 2026  

---

## 📁 Package Organization

This folder contains all artifacts required by **Assignment 3: MVP Development** as outlined in [`Assignment 3_ MVP Development.pdf`](./assignment_document/Assignment%203_%20MVP%20Development.pdf):

```
submissionAssignment3/
├── README.md                                  # Submission overview and execution guide
├── assignment_document/                       # Original assignment specifications
│   └── Assignment 3_ MVP Development.pdf      # Course assignment description PDF
├── prototype/                                 # Phase 1: Interactive 3D WebGL MVP prototype
│   ├── index.html                             # Main HTML interface & HUD
│   ├── app.js                                 # Simulation core (90 FPS, Catmull-Rom track, physics, particle system)
│   ├── style.css                              # Glassmorphic telemetry styling & responsive layout
│   ├── serve.py                               # Zero-cache local Python HTTP server
│   ├── three.module.js                        # Bundled Three.js ES module (self-contained, offline-ready)
│   └── README.md                              # Technical architecture and controls
└── report/                                    # Phase 2 & Phase 3: Deliverables & documentation
    ├── Racing_Genesis_Assignment_3_MVP_Report.pdf          # Strict 2-Page Executive Report (PDF)
    ├── Racing_Genesis_Assignment_3_MVP_Report.docx         # Professional Word Document format (.docx)
    ├── Racing_Genesis_Assignment_3_MVP_Report.md           # Markdown version of report
    ├── Racing_Genesis_Assignment_3_Demo_Video_Script.docx  # Demo Video (Phase 2) Script with visual cues (.docx)
    └── Racing_Genesis_Assignment_3_Demo_Video_Script.md    # Demo Video Script in Markdown (.md)
```

---

## 🚀 How to Run the Prototype

1. Open PowerShell or a terminal in the `prototype/` directory:
   ```powershell
   cd "prototype"
   python serve.py 8081
   ```
2. Open your web browser to:
   ```
   http://localhost:8081
   ```
3. **Controls**:
   - `W` / `Up Arrow`: Accelerate (Pacejka tire model + aerodynamic drag)
   - `S` / `Down Arrow`: Brake / Reverse
   - `A` / `D` or `Left` / `Right`: Progressive steering with dynamic centering
   - `C`: Cycle camera views (**Cockpit POV with live steering wheel digital dash** vs. **Chase Cam**)
   - `Space`: Reset car to track centerline
   - `Tab`: Toggle telemetry HUD overlay
   - `UI Stress Test Slider`: Dynamically scale tire particle emissions (0 to 1,500 particles) to benchmark GPU/CPU performance.

---

## 📋 Deliverables Summary & Assignment Compliance

| Requirement | Artifact File | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Phase 1: Working Prototype** | [`prototype/`](./prototype/) | ✅ Complete | Runs at smooth 90 FPS; spline-based track; custom Pacejka slip curve; real-time dynamic shadows; open-cockpit view with animated digital steering display; no external CDN dependencies. |
| **Phase 2: Demo Video Script** | [`report/Racing_Genesis_Assignment_3_Demo_Video_Script.docx`](./report/Racing_Genesis_Assignment_3_Demo_Video_Script.docx) | ✅ Complete | Structured 2.5-minute script covering Visual Proof, Feature Walkthrough, and Particle Stress Test. |
| **Phase 3: Written Report (1-2 pages)** | [`report/Racing_Genesis_Assignment_3_MVP_Report.pdf`](./report/Racing_Genesis_Assignment_3_MVP_Report.pdf) | ✅ Complete | Formatted precisely to 2 pages via ReportLab; covers Plan vs. Reality, AI Utility reflection, and Roadmap to Final. |
| **Phase 3: Word Document** | [`report/Racing_Genesis_Assignment_3_MVP_Report.docx`](./report/Racing_Genesis_Assignment_3_MVP_Report.docx) | ✅ Complete | Styled Word document matching the PDF submission. |
| **Assignment Brief** | [`assignment_document/Assignment 3_ MVP Development.pdf`](./assignment_document/Assignment%203_%20MVP%20Development.pdf) | ✅ Preserved | Exact course requirement specification reference. |
