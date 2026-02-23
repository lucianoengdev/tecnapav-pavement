# TECNAPAV Pavement Design App — Design Brainstorm

## Context
A professional engineering web application for flexible pavement restoration design following DNER-PRO 269/94 (TECNAPAV method). Users are civil engineers and road infrastructure professionals. The app processes FWD deflection data, traffic numbers, and pavement structure inputs to calculate reinforcement layer solutions.

---

<response>
<text>

## Idea 1 — "Industrial Precision" (Bauhaus Engineering)

**Design Movement:** Bauhaus / Industrial Modernism
**Core Principles:**
- Grid-based precision with strong horizontal rules and section dividers
- Monochromatic palette with a single bold accent for CTAs and data highlights
- Data-forward: tables and charts are first-class citizens, not afterthoughts
- Dense information architecture that respects the engineer's workflow

**Color Philosophy:** Deep charcoal background (#1A1D23) with off-white text (#E8E6E1). Single accent: construction orange (#E8700A). Conveys authority, precision, and field-readiness.

**Layout Paradigm:** Left-anchored sidebar navigation with a wide main content area split into a 3-column data entry panel. Upload zone is a prominent full-width strip at the top.

**Signature Elements:**
- Thick horizontal rule separators with section numbers (like technical drawings)
- Monospace font for all numeric outputs and formula displays
- Data tables with alternating dark rows and subtle grid lines

**Interaction Philosophy:** Deterministic, no surprises. Every action has immediate visible feedback. Progress is shown as a numbered step indicator.

**Animation:** Minimal — only fade-in for results panels and subtle row highlights on data load.

**Typography System:** IBM Plex Mono (data/numbers) + IBM Plex Sans (UI text). Heavy weight for section headers, regular for body.

</text>
<probability>0.08</probability>
</response>

---

<response>
<text>

## Idea 2 — "Blueprint Technical" (Engineering Drawing Aesthetic) ✅ SELECTED

**Design Movement:** Technical Drawing / Blueprint Modernism
**Core Principles:**
- Dark navy background evoking engineering blueprints and technical drawings
- Crisp white and cyan lines for structure, with amber/yellow for warnings and highlights
- Asymmetric layout: left panel for inputs, right panel for live results
- Typography that feels like it belongs in a technical specification document

**Color Philosophy:** Deep navy (#0D1B2A) as base, blueprint cyan (#00B4D8) as primary accent, amber (#F4A261) for warnings/alerts, white for primary text. Evokes the professional world of road engineering and technical documentation.

**Layout Paradigm:** Split-screen workflow — left side is the data input wizard (file upload + form fields), right side is a live results dashboard that updates as data is processed. No centered hero; the tool IS the interface.

**Signature Elements:**
- Subtle dot-grid or fine crosshatch texture on the background (like graph paper)
- Thin cyan border accents on cards and panels
- Formula display boxes with monospace font and subtle code-block styling

**Interaction Philosophy:** Wizard-style step progression (Upload → Configure → Calculate → Results). Each step is clearly numbered and the user always knows where they are.

**Animation:** Smooth panel transitions, number counter animations for calculated values, chart bars animate in from bottom on load.

**Typography System:** Space Grotesk (headings, bold technical labels) + Source Sans 3 (body, form labels). Monospace (JetBrains Mono) for all numeric outputs and formulas.

</text>
<probability>0.09</probability>
</response>

---

<response>
<text>

## Idea 3 — "Clean Infrastructure" (Scandinavian Utility)

**Design Movement:** Scandinavian Minimalism / Utility Design
**Core Principles:**
- Light, airy background with generous whitespace
- Warm stone/concrete tones referencing the physical material of roads
- Strong typographic hierarchy as the primary design tool
- Cards with subtle shadows as the main structural element

**Color Philosophy:** Warm white (#FAFAF8) background, slate (#334155) for primary text, sage green (#4A7C59) as primary accent (growth, infrastructure, nature), light stone (#E2DDD8) for borders and dividers.

**Layout Paradigm:** Single-column progressive disclosure — sections expand as the user completes each step. Clean top navigation with project name.

**Signature Elements:**
- Concrete texture SVG pattern as subtle background element
- Green progress indicator bar at top of page
- Large, bold numeric results displayed in a "stat card" format

**Interaction Philosophy:** Progressive disclosure — only show what's needed at each step. Reduce cognitive load by hiding complexity until relevant.

**Animation:** Gentle slide-down for new sections, smooth number transitions, soft pulse on active step.

**Typography System:** Sora (display headings) + Nunito Sans (body). Large size contrast between headings (3xl+) and body (base).

</text>
<probability>0.07</probability>
</response>

---

## Selected Design: Idea 2 — "Blueprint Technical"

The Blueprint Technical approach is the best fit because:
1. Engineers are familiar with blueprint aesthetics — it creates immediate professional credibility
2. The split-screen layout perfectly matches the workflow: input on the left, results on the right
3. Dark navy background reduces eye strain during long calculation sessions
4. The cyan/amber color system provides clear semantic meaning (info vs. warning)
