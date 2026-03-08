\# AGENTS.md — ProDoughType Project Guide



This repository contains the ProDoughType pizza dough calculator web app.



Stack

\- Plain HTML, CSS, and JavaScript (no frameworks)

\- Runs in browser via local server (python -m http.server or VSCode Live Server)



Project Structure



app.js

Main application bootstrap. Initializes the app and wires global actions.



modules/router.js

Handles route navigation between major views.



modules/ui.js

Main UI renderer. Contains layout and view switching.



modules/store.js

Central state store used across modules.



modules/signals.js

Event signaling / communication between modules.



modules/prefs.js

User preferences and persistence (localStorage key: "pdt.preferences").



modules/floursDb.js

Flour catalog and flour data handling.



modules/workOrderCalculator.js

New calculator workflow implementation.



modules/workOrderPreferences.js

Preferences interface for workflow modules, ovens, and flours.



modules/workOrderRecipe.js

Recipe computation engine (ingredient weights, preferments, analysis).



Important Notes



The old calculator UI may still exist inside ui.js.  

The new calculator system is implemented in the workOrder\* modules.



Goal

The application should run the calculator workflow in this order:



Foundation

Fermentation

Optional Modules

Dough Analysis

Live Preview



Rules for Codex



1\. Do not create additional modules unless explicitly requested.

2\. Prefer modifying existing files rather than adding parallel systems.

3\. The workOrder\* modules are the new canonical calculator implementation.

4\. Avoid renaming files unless instructed.

5\. Do not remove working features without replacing them.



Testing



The app must run in the browser without JavaScript errors.

Verification method is loading the local site and checking console errors.

