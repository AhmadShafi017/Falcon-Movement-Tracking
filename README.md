# 🦅 Falcon Tracking & Personnel Analytics Platform

An enterprise-grade, high-performance telemetry dashboard and operational reporting suite built with **React**, **TypeScript**, and **Express**. The system provides real-time spatial logistics, multi-day path visualization with daily color-coding, interactive movement ledgers, hierarchical field filters, and dynamic high-speed geocoding.

---

## 🚀 Key Modules & Capabilities

### 1. 📍 Precision Telemetry Mapping (`MOVEMENT tracking`)
*   **Intelligent Path Dynamics:** Real-time path decoration with directional arrow vectors, rendering the precise trajectory of assets.
*   **Dual Maps Technology:** Seamlessly toggle between **High-Resolution Satellite Hybrid** and **Standard Roadmap** views.
*   **Smart Waypoint Statuses:** Automatically labels point categories—**Origin (Green)**, **Mid-route (Yellow)**, and **Terminal (Red)** points—highlighting the active trip progress.
*   **Multi-Day Route Clustering:** Intelligently splits and color-codes paths on a daily basis so administrators can audit multi-day tracking data.

### 2. 🚨 Real-time Field Monitoring (`CURRENT LOCATION`)
*   **Active Status Tracker:** Real-time indicators of on-duty staff, showing current coordinates and active geolocation pings.
*   **Focal Spotlight Engine:** Click any personnel entry to center the map viewport with a fluid, high-visibility centering pulse.

### 3. 📊 Enterprise Reports Suite (`OPERATIONAL REPORT`)
*   **High-Fidelity Structured Grid:** A dense spreadsheet layout designed for rapid data auditing and operational performance tracking.
*   **Hierarchical Dynamic Selectors:** Cascade filters by **Division**, **NSM Designation**, **Zone Code/Name**, **Region Code/Name**, **Area Code/Name**, and **Territory Code/Name**.
*   **Search Intelligence:** Instant client-side fuzzy searching allows filtering by Employee ID, Employee Name, Territory, or Zone.
*   **High-Speed Offline Geocoder:** Generates deterministic landmark-level addresses instantly for any Bangladeshi coordinate without network latency or API rate limit blocks.
*   **Excel (CSV) Export Engine:** One-click downloads of filtered historical reports containing structured spatial and clock-in/out attendance details.

---

## 🛠️ Technical Stack & Architecture

*   **Frontend UI:** React 18 with Vite, Tailwind CSS 4.0, and `motion/react` for elegant micro-animations.
*   **Geospatial Engines:** Leaflet.js with customized polyline decoration.
*   **Backend Server:** Express.js (Node.js) with native TypeScript support (`tsx` runtime).
*   **Database Interface:** Seamlessly runs Oracle Database integration with automatic safe switchover to simulation databases if no live environment is available.
*   **Data Exporting:** Native JS Blob interface compiling compliant RFC-4180 CSV specifications.

---

## 📦 Getting Started & Installation

### 1. Requirements
*   Node.js (v18+ recommended)
*   npm or yarn

### 2. Standard Configuration
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file at the root of the project to specify your Database endpoint or override default ports:
```env
# Database Credentials (Oracle DB Connection)
ORACLE_USER=my_database_user
ORACLE_PASSWORD=my_secure_password
ORACLE_CONNECTIONSTRING=hostname:port/service_name

# Port Configuration
PORT=3000
```

### 4. Running the Project
Operate the app in local development mode using Node's hot-reload server:
```bash
npm run dev
```

Build the compiled production bundles:
```bash
npm run build
```

Launch the production server:
```bash
npm run start
```

---
*Engineered for high-volume enterprise logistics and field-force telemetry management.*
