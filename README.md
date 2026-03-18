# TECNAPAV - Pavement Restoration Design

## 📖 About the Project
TECNAPAV is a modern web application designed to automate and optimize the structural evaluation and overlay dimensioning for flexible highway pavements. The calculation engine strictly follows the Brazilian standard **DNER-PRO 269/94 (Resilience Method - Método da Resiliência)**. This tool replaces complex and error-prone spreadsheets, allowing engineers to process bulk field data (deflections and soil structure) and instantly determine the required asphalt overlay thickness to ensure the road's design life.

## ⚙️ Features
* **Bulk Data Import:** Support for uploading `.csv` and `.xlsx` files containing continuous highway data (FWD/Benkelman Beam deflections and structural layer data).
* **Flexible Data Handling:** Users can upload a single combined file or separate files for deflections and pavement structures.
* **Dynamic Traffic Segmentation:** Allows the definition of multiple Equivalent Single Axle Load (ESAL / N-number) values across different highway segments (by start/end km).
* **Automated Diagnosis:** Instantly categorizes soil types, calculates characteristic deflection ($D_c$), effective thickness ($h_{ef}$), and final reinforcement thickness ($HR$).
* **Built-in Interactive Guides:** Comprehensive, step-by-step visual documentation to help users fill out data templates and understand the engineering math behind the software.

## 🔐 Core System
The application features a fully **Client-Side Processing Engine**. When a user uploads engineering data, all parsing and mathematical calculations are executed directly within the browser's memory. This ensures maximum performance and complete data privacy, as sensitive infrastructure data never leaves the user's local machine.

## 📐 Module 
* **Flexible Pavement Restoration & Overlay Design** (Dimensionamento de Reforço de Pavimentos Flexíveis).

## 🛠️ Technologies Used
* **Language:** TypeScript
* **Web Framework:** React (built with Vite) & Express (Node.js) for serving the application.
* **Database:** None (State management via React Hooks and `sessionStorage` for temporary result caching).
* **Security:** Zero-server-retention architecture (100% local processing).
* **Frontend:** Tailwind CSS (styling), Radix UI / shadcn (components), Framer Motion (animations), and Wouter (routing).

## 🚀 Project Ambition
To provide a fast, reliable, and standardized open-tool alternative for transport engineers and road concessionaires, modernizing how pavement restoration projects are calculated and visualized without relying on outdated legacy software or manual spreadsheets.

## 📍 Current Stage
**v1.1.0** - Fully functional core calculator with multi-segment traffic support and integrated user assistance pages.

## 🐛 Known Issues & Future Improvements
* **Future Improvement:** Add a feature to export the final calculation results and reports to PDF and detailed Excel sheets.
* **Future Improvement:** Implement geographic visualization (Map integration) to view critical pavement sections and overlay needs directly on a map.
* **Future Improvement:** Incorporate newer mechanistic-empirical design methods alongside the current empirical resilience method.
* **Known Issue:** Very large datasets (e.g., millions of rows) might cause slight UI stuttering due to synchronous browser-side calculations. Implementing Web Workers is planned for future performance upgrades.

---
**Developed by Luciano Faria - Transport Engineer**