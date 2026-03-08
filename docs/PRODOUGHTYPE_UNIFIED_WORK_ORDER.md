# ProDoughType - Unified Work Order for Codex
*(Foundation Architecture, Preferences System, Flour Picker, Workflow Modules)*

Author: Danny + ChatGPT
Purpose: Single consolidated specification for the next development phase of ProDoughType.
This document replaces prior scattered MD files and reflects the newest architectural decisions.

---

# 1. Core Design Philosophy

ProDoughType should behave like a **professional tool**, not a simple calculator.

Goals:
- Modular workflow
- Clean UI
- Minimal clutter
- Fast recipe creation
- Optional advanced features
- Strong separation between **global preferences** and **recipe inputs**

The application is divided into **modules (sections)** which appear depending on user selections and preferences.

Primary workflow:

Foundation -> Fermentation -> Optional Sections -> Dough Analysis (optional) -> Live Preview -> Finish

Optional sections may include:
- Preferments
- Toppings
- Sauce
- Dough Analysis

---

# 2. Global Preferences System (Local Storage)

Until the app supports online accounts, **user preferences must be stored in localStorage**.

Storage key:

    localStorage["pdt.preferences"]

Preferences influence the behavior of the calculator but **do not define the recipe itself**.

Preferences should be editable through a dedicated **Preferences page**.

---

# 3. Preferences Page (Local Profile)

The Preferences page allows the user to define defaults and favorite items.

Sections:

## General

- Weight units: grams / ounces
- Size units: inches / centimeters
- Default calculation method: DBW / TF
- Default dough ball weight
- Default thickness factor
- Show warnings (global toggle)
- Enable dough analysis (global toggle)

## Workflow Modules

Checkboxes controlling which sections appear in the calculator:

- Preferments
- Toppings
- Sauce
- Dough Analysis

If disabled, those modules do not appear in the workflow.

Example flows:

Beginner:
Foundation -> Fermentation -> Preview

Advanced:
Foundation -> Fermentation -> Toppings -> Sauce -> Analysis -> Preview

## Ovens

Preferences page includes an **Oven Library Manager**.

### Built-in ovens (select favorites)

- Home Oven
- Home Oven + Steel
- Ooni Volt
- Ooni Karu 12
- Ooni Karu 16
- Ooni Koda 12
- Ooni Koda 16
- Gozney Roccbox
- Gozney Dome
- Deck Oven
- Conveyor Oven
- Wood Fired Oven

User may mark ovens as:
- favorite
- default oven

### Custom Oven

Fields:

Name
Type
Min Temperature
Max Temperature
Notes

Custom ovens are stored in preferences.

## Flours

Preferences page integrates the **Flour Picker** for selecting favorite flours.

Users can:

- choose favorite flours
- define default flour(s)
- create custom flour entries

### Custom Flour Fields

Name
Brand
Type (00 / AP / Bread / High Gluten / Whole Wheat / Manitoba / Other)

Protein %
Absorption Min %
Absorption Max %
Malted (yes/no)

Optional:
W value
P/L ratio
Notes

Favorites appear in Step 1 flour selector.

---

# 4. Step 1 - Foundation Module

Step 1 defines the **base structure of the recipe**.

## Header Controls

Templates
Import
Custom
Help (?)
Wrench icon (Quick Setup)

### Quick Setup (Wrench)

Allows temporary override of preferences for the current recipe.

Includes:

Units
Calculation Method
Oven selection
Warnings toggle
Analysis toggle
Workflow module toggles

These overrides affect only the current recipe session.

---

# 5. Recipe Start Options

User begins with one of the following:

### Templates

Loads a pizza style template.

Examples:

NY Style
Detroit
Neapolitan

Template auto-fills:

hydration
fermentation type
recommended flour type
geometry defaults

### Import

User may import a recipe using:

File picker
QR code scan

### Custom

Blank recipe workflow.

### Help (?)

Opens "How to Use This Section".

---

# 6. Foundation Inputs

After the start option, the following inputs appear.

## Units

Derived from preferences but adjustable.

Weight units
Size units

## Number of Dough Balls

Numeric input.

## Calculation Method

Toggle:

DBW (Dough Ball Weight)
TF (Thickness Factor)

Depending on the method chosen:

DBW -> user inputs dough ball weight
TF -> user inputs thickness factor

## Shape

Round
Rectangular

If rectangular:

Width input
Length input

## Surface Type

Pan
Deck

Surface type affects calculations and warnings.

## Flour Selection

Flour selection should NOT require the flour picker.

Instead:

Primary selector shows **favorite flours from preferences**.

Example dropdown:

Caputo Cuoco
King Arthur Bread
All Trumps

Buttons:

Browse All Flours -> opens Flour Picker
Add Blend -> allows multi-flour blend

---

# 7. Flour Picker Behavior

Flour Picker should function as a **browser interface**.

Features:

Search flours
Sort by protein or absorption
Filter by type (00, Bread, High Gluten, etc)

Users may:

Add flour to blend
Bookmark flour
Remove flour from blend

After completion:

Click Done -> picker closes and returns to calculator.

---

# 8. Flour Blend Display

Calculator shows:

Selected flours
Blend percentages
Calculated averages

Display:

Average protein
Average absorption

These values are visible in the calculator and preview.

---

# 9. Fermentation Module

Appears after Foundation when user clicks Next.

Includes:

Preferment toggle

If enabled:

Preferment type selector

Poolish
Biga

Preferment hydration ratio

Preferment % of total flour

Yeast model options.

Auto yeast uses fermentation data tables such as the TXCraig dataset.

---

# 10. Optional Modules

Based on preferences or quick setup:

### Toppings

Ingredient calculation helpers.

### Sauce

Future sauce builder.

### Dough Analysis

Traffic-light system evaluating:

Hydration vs flour strength
Fermentation duration
Oven compatibility

Results are advisory, not absolute.

Display suggestions like:

"Best baked at 450-600 F"

---

# 11. Live Preview

Preview displays the final recipe card.

Includes:

Ingredient weights
Baker's percentages
Fermentation timeline

Export functions:

Copy recipe
Export file
Generate QR code

Export options only appear in the preview.

---

# 12. Navigation Controls

Each module ends with a button:

Next -> moves to next module

Final step shows:

Finish

Optional:

If enabled, Dough Analysis appears before Live Preview.
Live Preview always remains the final review and export step before Finish.

---

# 13. Future Features (Do Not Implement Yet)

Mobile UI
Graph visualizations
Fermentation graphs
Recipe pie charts
Cloud profiles
Community templates

Focus now is the **stable calculator architecture**.

---

# 14. Development Priorities

Codex should implement in this order:

1. Preferences system (localStorage)
2. Preferences page UI
3. Favorite flours / ovens integration
4. Step 1 Foundation module
5. Flour selector integration
6. Flour Picker browser
7. Fermentation module
8. Optional module system
9. Live preview
10. Export functions

---

# 15. Final Principle

Structure first.

Do not focus on UI polish yet.

Once architecture is stable, visual themes and skins can be added later.
