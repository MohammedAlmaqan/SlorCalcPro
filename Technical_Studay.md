Solar System Design App — Complete Technical Study Document
This document provides a comprehensive technical specification for developing a professional solar system design application. It covers all required formulas, component selection rules, protection device sizing, cable calculations, and additional professional features. This study is self contained; third party developers can directly implement the app without seeking further clarification.
________________________________________
1. Executive Summary
This app is aimed at professional system designers, installers, and end users. It automates the entire design process, from load analysis to component recommendation, including full protection device and cable sizing. Its competitive advantages are:
•	All essential formulas embedded in the calculation engine.
•	Comprehensive protection and cable sizing (DC/AC breakers, fuses, surge protectors, ATS, isolators).
•	Compliance checks against international standards (NEC, IEC).
•	Three system types supported: on grid, off grid, and hybrid.
•	Offline functionality – all core calculations work without internet.
The app will stand out as the most complete and professional tool on the market.
________________________________________
2. Core Calculation Formulas
2.1 Daily Load Calculation (Energy Audit)
This is the starting point for every system design.
Formula:
text
Copy
Download
Daily Energy Consumption (Wh/day) = Σ (Appliance Power (W) × Daily Usage (h/day))
For AC loads, include inverter efficiency:
text
Copy
Download
Actual DC Energy (Wh/day) = AC Load Energy (Wh/day) ÷ Inverter Efficiency
Typical inverter efficiency: 85% – 95% (use 90% as default).
________________________________________
2.2 PV Array Sizing
Main formula (using winter Peak Sun Hours):
text
Copy
Download
Array Power (W) = Daily Energy (Wh) ÷ (Winter PSH) ÷ 0.75
The factor 0.75 accounts for total system losses:
•	Cable voltage drop
•	Charge controller losses
•	Battery charge/discharge losses
•	Inverter conversion losses
•	Temperature derating
•	Soiling and mismatch
Alternative method:
text
Copy
Download
PV Array Power = Daily kWh demand ÷ Average Daily Sun Hours
Critical rule: Always use winter Peak Sun Hours (PSH), not annual averages. Otherwise, the system will underperform in winter.
________________________________________
2.3 Battery Bank Sizing
Energy capacity:
text
Copy
Download
Battery Capacity (kWh) = Daily Energy (kWh) × Days of Autonomy ÷ Depth of Discharge (DoD)
Parameters:
•	Days of Autonomy: Number of days without sun (typically 2–5).
•	Depth of Discharge (DoD):
o	LiFePO₄: 80%
o	Flooded lead acid: 50%
o	AGM/Gel: 60%
Amp hour calculation:
text
Copy
Download
Battery Capacity (Ah) = [Daily Energy (Wh) × Days of Autonomy] ÷ [System Voltage (V) × DoD]
________________________________________
2.4 Inverter Sizing
Rule:
text
Copy
Download
Inverter Rated Power ≥ Sum of all loads that may run simultaneously
Critical considerations:
•	Surge (peak) loads: Motors (air conditioners, pumps, refrigerators) draw 3–7 times their rated power during startup. The inverter must handle both continuous and surge power.
•	The inverter input voltage must match the battery bank voltage (12/24/48V).
________________________________________
2.5 Charge Controller Sizing
For PWM or MPPT controllers:
text
Copy
Download
Controller Current Rating (A) ≥ PV Array Short Circuit Current (Isc) × 1.25
Voltage compatibility:
•	The controller’s maximum input voltage must be higher than the array’s open circuit voltage (Voc) under worst case cold conditions.
Efficiency comparison:
•	PWM: ~79%
•	MPPT: ~94% (always recommended for systems > 200W)
________________________________________
3. Component Selection Details
3.1 PV Panels
The app should ask the user to input or select from a built in database the following panel parameters:
•	Peak power (Pmax / Wp)
•	Open circuit voltage (Voc)
•	Maximum power point voltage (Vmp)
•	Short circuit current (Isc)
•	Maximum power point current (Imp)
•	Temperature coefficients (for Pmax, Voc, Isc) – %/°C
Output recommendations:
•	Required number of panels
•	Recommended panel specifications (power, voltage, current)
•	Series/parallel connection scheme
________________________________________
3.2 Series and Parallel Connection Calculation
Series connection:
•	Voltages add: V_total = V₁ + V₂ + ... + Vn
•	Current remains the same
•	Maximum number in series is limited by the inverter’s MPPT max input voltage:
text
Copy
Download
N_series_max = Inverter MPPT Max Voltage ÷ Panel Voc
Parallel connection:
•	Currents add: I_total = I₁ + I₂ + ... + In
•	Voltage remains the same
•	Maximum number in parallel is limited by the inverter’s MPPT max input current:
text
Copy
Download
N_parallel_max = Inverter MPPT Max Current ÷ Panel Isc
Total array power:
text
Copy
Download
Total Power (W) = V_total × I_total
________________________________________
3.3 System Voltage Recommendation (12/24/48V)
The app should suggest the optimal system voltage based on total power:
System Power Range	Recommended Voltage	Reason
< 1000 W	12 V	Lowest cost, wide component availability
1000 – 3000 W	24 V	Good balance between efficiency and cost
> 3000 W	48 V	Lower current, reduced cable losses, supports higher power
________________________________________
3.4 Inverter Type Selection Guide
The app should recommend the appropriate inverter type using a decision tree:
Type	Best for	Characteristics
On Grid (Grid tied)	Areas with stable grid, no backup needed	Simplest and cheapest; shuts down during grid outage (anti islanding); no battery connection
Hybrid	Grid available but backup desired	Combines grid tie + battery charging + backup; switches to backup within 10–20 ms during outage
Off Grid	Remote areas without grid access	Fully standalone; requires large battery bank (2–5 days autonomy); battery cost often exceeds the rest
Decision flowchart:
1.	Is the grid available?
o	No → Off Grid
o	Yes → Go to 2
2.	Do you need power during grid outages?
o	No → On Grid
o	Yes → Hybrid
________________________________________
4. Protection Devices and Cables
4.1 DC Overcurrent Protection (Fuses / Circuit Breakers)
Critical rule: Standard AC breakers must NOT be used on DC circuits – they cannot extinguish the DC arc.
Minimum DC OCPD rating:
text
Copy
Download
Minimum OCPD Rating = Circuit Maximum Current × 1.25
For PV source circuits (NEC 690.8):
text
Copy
Download
PV Source OCPD = Isc × 1.56 (i.e., 1.25 × 1.25)
Select the next standard size that is ≥ this value and ≤ the panel’s maximum series fuse rating.
Voltage rating:
•	Residential (1 2 homes): minimum 600 V DC
•	Commercial: minimum 1000 V DC
•	1500 V systems: minimum 1500 V DC
________________________________________
4.2 AC Protection
Inverter AC output breaker:
text
Copy
Download
AC Breaker Rating = Inverter Max Continuous Output Current × 1.25
Main panel back feed rule (120% rule):
text
Copy
Download
Main Breaker + PV Breaker ≤ 1.20 × Busbar Rating
________________________________________
4.3 Isolation Switches
•	DC isolator: placed between PV array and inverter – used for safe disconnection.
•	AC isolator: placed between inverter and grid/loads.
•	Must be rated for DC application (DC switches have special arc quenching).
________________________________________
4.4 Automatic Transfer Switch (ATS)
•	Used in hybrid/off grid systems to switch between grid and inverter/generator.
•	Switching time should be < 20 ms to avoid interrupting sensitive loads.
•	Current rating must be ≥ maximum system load current.
________________________________________
4.5 Surge Protection Devices (SPDs)
•	DC side SPD: installed at PV array input.
•	AC side SPD: installed at inverter output.
•	Selection based on system voltage and expected surge current (typically Type 1 or Type 2).
________________________________________
4.6 Cable Sizing
Step 1 – Calculate circuit current (per NEC 690.8):
text
Copy
Download
PV Source Circuit Conductor Current = Isc × 1.56
Step 2 – Voltage drop calculation:
text
Copy
Download
Vdrop = I × R × L × 2   (for two way run)
Or using cross section formula:
text
Copy
Download
A = (2 × L × I × ρ) / ΔV
Where:
•	A = conductor cross section (mm²)
•	L = cable length (m) – one way
•	I = current (A)
•	ρ = resistivity (copper: 0.0172 Ω·mm²/m)
•	ΔV = allowed voltage drop (V)
Voltage drop limits:
•	DC source circuits: 1–2%
•	DC output circuits: 1–3%
•	AC circuits: 3% (per IEC 62548)
Temperature derating: On rooftops, cable ampacity can be reduced by 40–50% due to high ambient temperature.
Common cable sizes reference:
Application	Recommended Size
Residential PV strings	10 AWG (6 mm²)
Commercial PV strings	8 AWG (10 mm²)
Main feeders	4/0 AWG (120 mm²)
String cables (Europe)	4 or 6 mm²
________________________________________
5. Additional Professional Design Elements
5.1 Built in PV Panel Database
The app should include a regularly updated library of common PV modules with parameters:
•	Brand and model
•	Pmax, Voc, Vmp, Isc, Imp
•	Temperature coefficients
•	Dimensions and weight
•	Maximum system voltage
•	Maximum series fuse rating
5.2 Location & Solar Resource Integration
•	Use GPS or manual input to get:
o	Winter and summer Peak Sun Hours (PSH)
o	Optimal tilt angle and azimuth
o	Local temperature data (for temperature derating)
5.3 Shading Analysis
•	Evaluate shading from nearby buildings, trees, etc.
•	Calculate impact on string output (partial shading can drastically reduce performance).
5.4 Performance Ratio (PR) Prediction
•	Estimate total system losses (cable, inverter, temperature, soiling, mismatch).
•	Predict annual energy yield.
5.5 Compliance Checks
•	NEC 690 (USA)
•	NEC 706 (Energy Storage Systems)
•	IEC 62548 (PV arrays)
•	Local grid connection standards (VDE, CEI, etc.)
5.6 Report Generation
•	System design summary (PDF)
•	Bill of Materials (BOM) – CSV/Excel
•	Single line diagram (SLD) – automatically generated
•	Compliance documentation
________________________________________
6. App Functional Architecture (For Developers)
6.1 Input Module
1.	Load Input: List of appliances (name, power, quantity, daily usage hours).
2.	Location Input: GPS / manual – fetch solar data.
3.	System Type: On grid / Off grid / Hybrid.
4.	Backup Requirement: Days of autonomy.
5.	Budget / Preference (optional): for component prioritisation.
6.2 Calculation Engine Module
1.	Daily load calculation
2.	PV array sizing
3.	Battery sizing (autonomy + DoD)
4.	Inverter sizing (continuous + surge)
5.	Charge controller selection
6.	System voltage recommendation (12/24/48V)
7.	Series/parallel configuration
8.	Cable sizing with voltage drop
9.	Protection device selection (DC/AC breakers, fuses, SPD, ATS)
6.3 Output Module
1.	Component Recommendations:
o	PV panels (quantity, specs, connection)
o	Batteries (capacity, quantity, voltage)
o	Inverter (type, power, voltage)
o	Charge controller (type, current, voltage)
2.	Electrical Specifications:
o	System voltage
o	Circuit currents
o	Cable sizes and lengths
o	Protection device ratings
3.	Visualisation:
o	Single line diagram
o	Schematic layout
4.	Report Export: PDF / Excel
6.4 Database Module
•	PV panel database (updateable)
•	Inverter database
•	Battery database
•	Cable reference tables (AWG ↔ mm², ampacity)
6.5 Suggested Tech Stack
•	Frontend: React Native or Flutter (cross platform)
•	Calculation Engine: Native code (Kotlin/Swift) or embedded JavaScript engine
•	Local Database: SQLite (with optional cloud sync)
•	Offline: All core calculations must work without internet
________________________________________
7. Conclusion
This technical study provides every formula, selection rule, protection device specification, and cable sizing method required to build a professional solar system design app. Developers can directly implement the application based on this document.
The app’s competitive positioning:
1.	Complete coverage – from load analysis to protection devices.
2.	Professional depth – includes standards compliance (NEC/IEC).
3.	Accuracy – uses real engineering formulas, not simplifications.
4.	Flexibility – supports on grid, off grid, and hybrid.
5.	Practical output – provides actionable BOM and installation specifications.
This app will fill the gap for a truly professional solar design tool, becoming the preferred choice for both installers and end users.

- Expo EAS Remote Build Guide – SolarCalcApp

Project Identity :
Slug: solarcalcapp
ID: 846fcdc9-f35f-4459-ac01-e5b45812e3f7
Owner: merathdev

Language: TypeScript

Framework: React Native + Expo (SDK ≥ 54)

Build system: Expo Application Services (EAS) – remote builds only (no local native builds)


Type Checking & Linting:

TypeScript: npx tsc --noEmit run before every commit
Expo Doctor: npx expo-doctor – checks for common issues
ESLint: use expo config preset (eslint-config-expo)
Prettier: enforce consistent formatting
lint-staged (optional) – run checks on staged files

Environment Variables
Use .env files (e.g., expo-constants or dotenv for runtime)
For EAS builds, set secrets via eas secret:create (e.g., API keys)
Reference in eas.json using env property

Notes for Development
Use Expo SDK 54 APIs – do not use native modules that require custom code unless wrapped in Expo config plugins.
Keep calculations offline‑first – no internet dependency for core logic.
Follow strict TypeScript, lint, and format rules – all checks must pass before committing.
Use Expo Router for navigation if complex screens are needed.
For solar design logic, implement pure TypeScript functions – they are platform‑agnostic , if somthing need to be developed in other language code it must be justified and notified firist before any change.
