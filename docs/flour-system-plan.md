\# ProDoughType — Flour System Refactor Plan



\## Goal



Move the flour selection system out of the Databases prototype panel and integrate it into the main Dough calculator workflow.



The flour UI prototype currently exists in the DB route only as a development sandbox.



The final implementation must reuse the Template-style card browser and live inside the Dough calculator as Step 2.



---



\# Current State



Flour UI currently exists in:



modules/ui.js



Function:



databasesPanel(store)



This prototype contains:



• placeholder FLOURS array  

• flourCard(f)  

• renderCatalog()  

• renderBlend()



The prototype correctly supports multi-flour blending.



However it currently:



• lives in the DB sidebar route  

• uses placeholder data  

• does not reuse the template browser UI  

• is not integrated with the calculator workflow



---



\# Target Architecture



Flour selection becomes Step 2 in the Dough calculator.



Workflow:



Dough  

→ Step 1 Geometry / Style  

→ Step 2 Flour  

→ Choose Flour button  

→ Flour Browser Modal  

→ Flour Detail Modal  

→ Add Flour to Blend



The Databases page will not be used for flour selection.



---



\# Step 2 — Flour (Calculator UI)



The calculator panel should display:



Current Blend



Example:



Caputo Cuoco — 100%



Blend Stats:



Protein (weighted)  

Absorption (weighted)



Buttons:



Choose Flour(s)  

Clear Blend



---



\# Flour Browser



Reuse the exact same card browser UI used by Templates.



Features:



• card grid

• search

• sort

• favorites

• hover preview

• click card → open detail modal



Cards contain:



• brand

• flour name

• flour type

• optional logo or image



---



\# Flour Detail Modal



The modal displays detailed flour specs.



Example layout:



Brand  

Name  

Type  



Protein  

Absorption Range  

W Value  

P/L Ratio  



Notes



Buttons:



Use Flour  

Close



Selecting Use Flour adds the flour to the blend.



---



\# Flour Blend System



Multiple flours may be selected.



Example:



Caputo Cuoco 50%  

King Arthur Bread 50%



Computed values:



Protein = weighted average  

Absorption = weighted midpoint  

Strength estimate (future)



Later improvements may include:



• automatic percentage normalization

• blend warnings

• style recommendations

• hydration guidance



---



\# Data Source



Replace placeholder FLOURS array with dataset:



data/flours\_v1\_unified.json



Loaded through:



modules/loaders.js



Stored in:



store.indexes.flours



Each flour entry comes from:



flours\_v1\_unified.json.items



---



\# Migration Plan



Step 1



Leave databasesPanel() unchanged temporarily.



It remains a sandbox.



---



Step 2



Create Step 2 Flour section inside Dough route.



Displays:



• blend summary

• Choose Flour button

• Clear button



---



Step 3



Implement flour browser modal.



Reuse template card browser component.



Data source:



store.indexes.flours



---



Step 4



Wire card click → detail modal → add flour to blend.



---



Step 5



After Step 2 works:



Remove flour UI from databasesPanel().



DB route becomes reference-only.



---



\# Why This Architecture



Benefits:



• consistent UI

• cleaner workflow

• reusable browser components

• easier expansion

• natural support for flour blending



---



\# Future Enhancements



Possible additions:



• flour compatibility warnings

• hydration suggestions

• fermentation compatibility

• style-based flour recommendations

• KB integration

## Related Future Workflow Placeholder — Portable Dough Import
Although the flour system belongs inside Step 2 of the calculator, it should eventually work with a broader portable recipe system.

Future idea:
- A portable dough recipe file can preload:
  - selected flour(s)
  - blend percentages
  - hydration
  - fermentation settings
  - style/template defaults

Potential sources:
- local file picker
- bookmarked user templates
- community/forum shared recipes
- QR-based recipe exchange

For now:
- no implementation work is required here
- just keep Step 2 compatible with imported blend data later



---



\# Status



Prototype exists.



Next task:



Integrate flour system into Step 2 calculator workflow.

