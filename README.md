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

## 🔀 Unified Subfolder Routing (`/mtracking`)

To simplify local hosting and allow hosting alongside other existing projects under a shared domain, all system modules are mounted under a common subfolder prefix.

*   🌐 **Root Auto-Redirect:** Visiting the bare URL `http://localhost:3000/` or `http://localhost:3000/mtracking` automatically redirects with high compatibility to the correct default workspace.
*   🗺️ **Telemetry Map Module:** `http://localhost:3000/mtracking/movementTracking`
*   🚨 **Field Monitoring Module:** `http://localhost:3000/mtracking/currentLocation`
*   📊 **Operational Reports Module:** `http://localhost:3000/mtracking/operationalReport`

---

## 🔒 Security & Third-Party Integration API

To securely integrate Falcon's movement tracking data with other external projects, a dedicated secure gateway is exposed at `/api/external/movement-tracking`.

### 1. Security Enforcement
All external requests must include a security code. You can customize this code via the `MOVEMENT_TRACKING_API_KEY` setting in your `.env` file. If no key is set, it defaults to `FALCON_SECURE_TRACE_2026`.

Authentication is supported via:
*   🔑 A **Header**: `X-Security-Code` or `X-API-Key`
*   🔗 A **Query Parameter**: `?securityCode=YOUR_CODE_HERE`

If the security code is missing or incorrect, the server replies with a `403 Forbidden` response:
```json
{
  "error": "Forbidden",
  "message": "Access Denied: Invalid, expired, or missing security code."
}
```

### 2. Supported Telemetry Actions

#### A. Fetch Employee Hierarchy
Retrieve the full live registry of active personnel.
*   **Endpoint:** `/api/external/movement-tracking?action=employees`
*   **Method:** `GET`

#### B. Fetch All Latest Live Positions
Get current active coordinates & heartbeats of all field personnel.
*   **Endpoint:** `/api/external/movement-tracking?action=all-latest&date=YYYY-MM-DD`
*   **Method:** `GET`

#### C. Fetch Detailed Movement Path Chronology
Fetch path history, origins, and terminals for an individual target employee.
*   **Endpoint:** `/api/external/movement-tracking?action=movement&empId=09747&date=YYYY-MM-DD`
*   **Method:** `GET`

---
*Engineered for high-volume enterprise logistics and field-force telemetry management.*
