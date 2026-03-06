\# ProDoughType — Development Roadmap



This roadmap breaks development into clear stages so the project can ship a usable version quickly while leaving room for expansion.



The focus of V1 is to create a \*\*fully working pizza dough calculator with flour selection, fermentation guidance, and a knowledge base\*\*.



---



\# Version 1 — Core Calculator (Launch Version)



Goal: Deliver a stable calculator that produces reliable pizza dough formulas.



Major components:



• Dough calculator  

• Flour selection and blending  

• Template presets  

• Fermentation guidance  

• Live recipe preview  

• Knowledge base search  



---



\## V1 Feature Set



\### Dough Calculator



Steps inside the Dough route:



Step 1 — Geometry  

Step 2 — Flour  

Step 3 — Hydration  

Step 4 — Fermentation  

Step 5 — Ingredients  

Step 6 — Bake Plan  



The calculator outputs a complete recipe with ingredient weights and timing guidance.



---



\### Template System



Templates provide starting presets for styles such as:



NY Style  

Neapolitan  

Detroit  

Roman  

Chicago  

Sicilian  



Selecting a template sets:



• hydration  

• dough weight  

• thickness factor  

• fermentation suggestions  

• flour recommendations  



Templates should never lock the user.



They are starting points only.



---



\### Flour System



Flour selection happens in Step 2.



Users may select multiple flours and create blends.



Example:



Caputo Cuoco 60%  

King Arthur Bread 40%



The system computes:



• weighted protein  

• weighted absorption  

• estimated dough strength  



Flour data comes from:



`data/flours\_v1\_unified.json`



---



\### Fermentation Guidance



The fermentation system estimates yeast and timing.



Initial model:



Craig fermentation table (`txcraig\_v1.json`)



Inputs:



• dough temperature  

• room temperature  

• fermentation time  



Outputs:



• yeast percentage  

• recommended schedule  



---



\### Live Preview



The right panel displays the recipe in real time.



Preview includes:



• ingredient weights  

• baker's percentages  

• dough ball count  

• fermentation timeline  



---



\### Knowledge Base



Integrated troubleshooting system.



Examples:



Sticky dough  

Slack dough  

Pale crust  

Overproofed dough  



Sources:



`kb\_troubleshooting\_v1.json`



Users can open the KB from the preview panel.



---



\### Reminder QR



The QR system generates a portable bake plan.



The QR contains:



• timeline events  

• recipe snapshot  

• bake time  



Future mobile tools can read the QR and create reminders.



---



\# Version 2 — Smart Dough System



Goal: Improve the intelligence of the calculator.



---



\## Smart Fermentation



More accurate yeast prediction using:



• flour strength (W value)  

• hydration  

• temperature  

• fermentation duration  



---



\## Flour Intelligence



Add warnings and suggestions.



Examples:



• hydration too high for flour  

• weak flour for long fermentation  

• low browning potential  



---



\## Community Templates



Allow users to submit style presets.



Examples:



Joe's NY Style  

Lucali style  

Beddia style  



Templates remain editable by the user.



---



\## Flour Recommendation Engine



The system can recommend flours for each style.



Example:



NY Style:



All Trumps  

Sir Lancelot  

High Mountain



---



\# Version 3 — Full Ecosystem



Goal: Expand ProDoughType into a complete pizza design platform.



---



\## SauceSource



Interactive sauce designer.



Controls:



• acidity  

• sweetness  

• thickness  

• umami  



Users can build custom sauce profiles.



---



\## Ingredient Library



Database for:



• cheese types  

• oils  

• toppings  

• salts  



Recipes can reference ingredient libraries.



---



\## Community Recipes



Users can share full pizza builds.



Example:



NY Style + sauce + cheese + bake method.



---



\## Mobile Companion App



A lightweight mobile app that reads BakePlan QR codes.



Features:



• fermentation reminders  

• bake timers  

• recipe display  



---



\# Long Term Vision



ProDoughType becomes a full pizza design environment.



Capabilities include:



• dough design  

• sauce formulation  

• topping design  

• bake scheduling  

• community recipes  



---



\# Immediate Development Priorities



Focus on finishing Version 1.



Next tasks:



1\. Move flour system into Step 2 of the calculator.

2\. Finish template browser.

3\. Connect fermentation model to calculator inputs.

4\. Finalize recipe preview output.

5\. Expand troubleshooting knowledge base.



Once these are complete, ProDoughType will be ready for early testing.

