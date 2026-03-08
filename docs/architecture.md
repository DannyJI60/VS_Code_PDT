> Note: This document is now secondary. Use `PRODOUGHTYPE_UNIFIED_WORK_ORDER.md` as the canonical implementation spec. If this file conflicts with the unified work order, follow the unified work order.

# ProDoughType - Application Architecture

## Purpose

This document defines the architecture of the ProDoughType vNext application.

The goal is to maintain a stable structure while new features are developed.

Key principles:

- modular design  
- predictable data flow  
- reusable UI components  
- centralized application state

---

# Core System Structure

The application consists of three primary systems.

Calculator  
Data Libraries  
Knowledge System

The calculator is the main engine.

Libraries and knowledge systems provide data and guidance.

---

# Application Layout

Top Bar  
Sidebar Navigation  
Main Workspace  
Right Panel

---

# Top Bar

Global actions.

Guides  
Knowledge Base  
Login  
Reminder QR  
Export

---

# Sidebar Navigation

Primary routes:

Dough  
Templates  
Databases  
Fermentation  
Preferences  
Glossary  
Troubleshooting  
SauceSource

These routes should remain stable.

---

# Workspace Layout

Each route renders inside:

#routeMount

Rendering is controlled by:

renderRoute()

---

# Right Panel

The right panel contains persistent tools.

Live Preview  
Knowledge Base Drawer

Live Preview displays the current recipe output.

The Knowledge Base drawer shows search results and troubleshooting.

---

# Core Modules

Application modules are located in:

modules/

Important modules include:

auth.js  
bakePlan.js  
kb.js  
loaders.js  
modal.js  
prefs.js  
router.js  
signals.js  
store.js  
ui.js

---

# store.js

Global application state manager.

Example structure:

store

indexes  
prefs  
session  
uiMode

Store is the single source of truth.

---

# router.js

Controls navigation.

Functions:

initRouter()  
setRoute()

Routes trigger:

renderRoute()

---

# loaders.js

Responsible for loading external datasets.

Examples:

templates_index.json  
flours_v1_unified.json  
txcraig_v1.json  
kb_troubleshooting.json

Loaded data is stored in:

store.indexes

---

# ui.js

Primary UI rendering module.

Responsibilities:

renderRoute()  
panel creation  
card browser rendering  
modal handling  
preview updates

---

# modal.js

Reusable modal framework.

Used by:

login modal  
flour details  
template details  
QR export

---

# prefs.js

Manages user preferences.

Examples:

UI mode  
default oven  
fermentation model  
warning settings

Preferences stored via:

localStorage

---

# kb.js

Knowledge Base search system.

Sources include:

troubleshooting data  
glossary data  
guides

Displayed in:

KB Drawer

---

# bakePlan.js

Generates timeline events for the bake process.

Example events:

mix  
ball  
cold ferment  
warm up  
bake

Used for:

Reminder QR system

---

# Calculator Workflow

The Dough route contains the main calculator.

Planned structure:

Step 1 Geometry  
Step 2 Flour  
Step 3 Hydration  
Step 4 Fermentation  
Step 5 Ingredients  

Each step updates:

store.session.recipe

---

# Flour System

Flour selection occurs in Step 2.

Flow:

Choose Flour  
-> Flour Browser  
-> Flour Detail  
-> Add to Blend

Blend example:

Caputo Cuoco 50%  
KA Bread 50%

Calculated outputs:

Protein blend  
Absorption blend  
Strength estimate

---

# Template System

Templates provide style presets.

Examples:

NY Style  
Neapolitan  
Detroit  
Chicago  
Roman

Selecting a template sets default parameters.

Users can always modify values afterward.

---

# Databases Route

Databases route provides reference information.

Examples:

Flour library  
Salt types  
Yeast types  
Oven data

It should not host core workflows.

---

# Fermentation System

Fermentation calculations use data models.

Sources include:

txcraig_v1.json  
future fermentation datasets

Inputs:

yeast percentage  
temperature  
time  
preferment

Outputs:

recommended yeast  
fermentation schedule

---

# Knowledge Base

Knowledge sources:

kb_troubleshooting.json  
glossary data  
future guides

Structure:

symptom  
cause  
solution

Example topics:

sticky dough  
slack dough  
poor browning  
overproofing

---

# QR Bake Plan

The QR system generates a portable bake timeline.

Contains:

timeline  
recipe snapshot  
timezone  
bake time

Future mobile apps can scan the QR code and create reminders.

---

# Data Folder Structure

Recommended layout:

data/

templates_index.json  
flours_v1_unified.json  
yeast_tables  
kb

Assets:

assets/

templates  
flours  
icons

---

# Future Modules

Planned expansions include:

# Portable Recipe / Community Import (Placeholder)
A future sharing layer should allow dough setups to move between users and between platforms.

Concept:
- A dough recipe can be serialized into a small portable format
- The format can be loaded into the calculator and populate the builder steps
- This may later support:
  - file picker import
  - exported recipe files
  - community/forum template links
  - QR code import/export

Suggested future format:
- JSON-based
- Contains template ID, style/geometry, flour blend, hydration, fermentation inputs, and final formula settings

Important:
- Sharing/import should preload the existing calculator workflow, not bypass it
- Imported recipes remain editable by the user
- This is a future system and should remain placeholder-only for now

SauceSource  
ingredient library  
community templates  
recipe sharing

---

# Development Guidelines

To maintain project stability:

Avoid adding new sidebar routes unnecessarily.

Reuse card browser components.

Load all datasets through loaders.js.

Keep store as the central state authority.

---

# Current Development Stage

Prototype stage.

Next priorities:

Finalize template system  
Integrate flour selection into calculator  
Implement fermentation models  
Expand knowledge base
