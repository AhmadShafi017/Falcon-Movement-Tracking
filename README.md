# Falcon Movement Tracking: Enterprise Logistics & Personnel Analytics

Falcon Movement Tracking is a high-performance, precision-engineered telemetry dashboard designed for enterprise-grade asset tracking and movement analytics. It provides a seamless, high-fidelity interface for monitoring personnel movement, historical route analysis, and spatial logistics.

## 🚀 Key Features

### 📍 Precision Telemetry Mapping
- **Intelligent Path Dynamics**: Real-time path decorations with directional vectors, providing visual clarity on the exact flow of movement.
- **Smart Waypoint System**: Automated status detection for waypoints—**Origin (Green)**, **Mid-route (Yellow)**, and **Terminal (Red)** points for immediate tactical orientation.
- **Multi-Day Route Separation**: Visual grouping of historical movement history by date, using unique color-coding to distinguish daily operations.
- **Dynamic View Switching**: Toggle between high-resolution Satellite Hybrid and Standard Roadmap views instantly via the sidebar control.

### 🏢 Personnel Registry & Audit Ledger
- **Employee Dossier**: Comprehensive asset profiling including designations, team assignments, and unique tracking identifiers.
- **Interactive Movement Ledger**: A deep-chronological audit trail of all telemetry pings, including real-time address resolution and high-resolution timestamps.
- **Focal Spotlight Engine**: Advanced "Telemetric Focus" animations—clicking any ledger entry triggers an animated spatial focus on the map with a high-visibility pulse effect.

### 🌍 Advanced Geospatial Intelligence
- **Real-Time Reverse Geocoding**: Automatically translates raw coordinate data (Latitude/Longitude) into human-readable street addresses using OSINT geospatial services.
- **Contextual "Sector" Monitoring**: The sidebar dynamically updates to show the current "Sector" (Address) of the tracked asset for better operational awareness.
- **Searchable Intelligence**: Filter movement data by date ranges or search for specific pings within the movement history.

### 🎨 Modular Design & Interaction
- **Bento-Grid Architecture**: A clean, technical layout emphasizing data density, modularity, and rapid information retrieval.
- **Motion-Engine Integration**: Fluid state transitions and staggered layout entrances powered by `motion/react`.
- **Responsive Telemetry HUD**: A minimalist data overlay providing critical coordinates and viewing status without obstructing the spatial map.

## 🛠️ Technical Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript (Strict Typings)
- **Mapping**: Leaflet.js with custom `leaflet-polylinedecorator`
- **Backend**: Express.js (Node.js) with native TypeScript support
- **Database Connectivity**: Pre-configured for Oracle environments with robust error handling
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 📦 Local Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   Create a `.env` file based on `.env.example` and provide your database credentials:
   ```env
   ORACLE_USER=...
   ORACLE_PASSWORD=...
   ORACLE_CONNECTIONSTRING=...
   ```
4. **Development Mode**:
   ```bash
   npm run dev
   ```
5. **Production Build**:
   ```bash
   npm run build
   ```

---

*Engineered by ARIF | Powered by Falcon Intelligence*
