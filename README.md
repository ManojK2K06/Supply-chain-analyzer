# 🌍 GEOPOLITICAL RADAR

### Global Conflict & Supply Chain Intelligence Platform

A full-stack React + Node.js web application that provides real-time geopolitical intelligence, conflict zone mapping, military activity tracking, news aggregation, and supply chain disruption analysis.

---

## 🚀 Quick Start

```bash
# 1. Clone or extract the project
cd geopolitical-radar

# 2. Run the startup script (installs everything and launches both services)
chmod +x start.sh && ./start.sh

# OR manually:
# Terminal 1 — Backend
cd server && npm install && node index.js

# Terminal 2 — Frontend
cd client && npm install && npm start
```

**Access the app at:** `http://localhost:3000`  
**API runs at:** `http://localhost:3001`

---

## 🛰️ Features

### 🗺️ Interactive World Map

- **Dark red-tinted world map** using CartoDB Dark Matter tiles
- **Conflict zone markers** — Red (war), Yellow (potential), Green (stable/monitoring)
- **Pulsing animations** for active conflict zones
- **Military activity overlays** — Air ✈, Naval ⚓, Ground ⊕ markers with intensity levels
- Click any marker to fly to that location and open impact analysis

### ⚠️ Conflict Intelligence

- 12+ pre-loaded conflict zones with real-time data
- Russia–Ukraine War, Gaza, Sudan, Myanmar, Taiwan Strait, South China Sea, Sahel, Iran, Kashmir, Venezuela, Arctic
- Risk scores, casualty estimates, region classification
- Source attribution (ACLED, OCHA, CSIS, DoD)

### 📡 Live News Feed

- **Aggregates from 6+ RSS feeds**: Reuters, BBC, NYT, Al Jazeera, Defense News, OilPrice
- **Auto-tagged by industry**: Tech, Petroleum, Agri, Defense, Shipping, Finance, Pharma, Mining, etc.
- **Risk classification**: Critical / High / Medium / Low
- **Auto-refreshes every 15 minutes**

### 🏭 Industry Sector Tracking (23 Industries)

| Sector                         | Sector                  | Sector             |
| ------------------------------ | ----------------------- | ------------------ |
| Technology & Semiconductors    | Petroleum & Natural Gas | Agriculture & Food |
| Defense & Aerospace            | Shipping & Logistics    | Banking & Finance  |
| Pharmaceuticals                | Mining & Metals         | Automotive & EV    |
| Telecommunications             | Renewables & Energy     | Textiles & Apparel |
| Chemicals & Plastics           | Construction            | Tourism & Aviation |
| Media & Entertainment          | Retail & E-Commerce     | Food Processing    |
| Insurance                      | Luxury Goods            | Maritime & Ports   |
| Rare Earth & Critical Minerals | —                       | —                  |

### 📊 Impact Analysis Panel

For each conflict zone:

- **Supply chain disruptions** (Wheat, Neon Gas, Semiconductors, Strait of Hormuz oil, etc.)
- **Affected public company stocks** with direct Yahoo Finance links
- **Risk breakdown gauges** (Conflict Intensity, Supply Chain Exposure, Economic Impact, Regional Spillover)
- **Related intelligence** from live news feed
- Cascading indirect effects mapped

---

## 🏗️ Architecture

```
geopolitical-radar/
├── server/                     # Node.js + Express backend
│   ├── index.js                # Main server — REST API, RSS scraping, cron jobs
│   ├── package.json
│   └── .env   add port=3001 and GEMINI_API_KEY
│
├── client/                     # React frontend
│   ├── public/index.html
│   └── src/
│       ├── App.jsx             # Root component, state management
│       ├── index.css           # Global dark radar theme (CSS vars)
│       ├── components/
│       │   ├── Header.jsx      # Top bar — stats, clock, controls
│       │   ├── MapView.jsx     # Leaflet map with conflict + military markers
│       │   ├── Sidebar.jsx     # Left panel — conflict list + news feed
│       │   └── ConflictPanel.jsx  # Right panel — impact analysis
│       └── hooks/
│           └── useApi.js       # Data fetching hook
│
├── start.sh                    # One-command launch script
└── README.md
```

---

## 🔌 API Endpoints

| Endpoint                                   | Description                         |
| ------------------------------------------ | ----------------------------------- |
| `GET /api/health`                          | Server status + last sync time      |
| `GET /api/industries`                      | All 23 industry categories          |
| `GET /api/conflicts?status=war&region=...` | Conflict zones (filterable)         |
| `GET /api/news?industry=tech&limit=50`     | Live news (industry-filtered)       |
| `GET /api/impact/:conflictId`              | Full impact analysis for a conflict |
| `GET /api/military-activity`               | Military activity zones             |

---

## 🔧 Environment Variables

Create `server/.env` (optional — defaults shown):

```env
PORT=3001
```

Create `client/.env` (optional):

```env
REACT_APP_API_URL=http://localhost:3001
PORT=3000
```

---

## 🛰️ Data Sources

| Source                                                        | Type             | Update Frequency |
| ------------------------------------------------------------- | ---------------- | ---------------- |
| Reuters World News                                            | RSS              | Live (~15 min)   |
| BBC World News                                                | RSS              | Live (~15 min)   |
| NYT World                                                     | RSS              | Live (~15 min)   |
| Al Jazeera                                                    | RSS              | Live (~15 min)   |
| Defense News                                                  | RSS              | Live (~15 min)   |
| OilPrice.com                                                  | RSS              | Live (~15 min)   |
| ACLED (Armed Conflict Location & Event Data)                  | Static + sourced | Periodic         |
| CSIS / DoD Reports                                            | Static           | Periodic         |
| OCHA (UN Office for the Coordination of Humanitarian Affairs) | Static           | Periodic         |

---

## 🔮 Extending the App

### Add more conflict zones

Edit `STATIC_CONFLICTS` array in `server/index.js` — each conflict has:

```js
{
  (id,
    country,
    region,
    lat,
    lng,
    status, // 'war' | 'potential' | 'stable'
    title,
    description,
    affectedIndustries,
    affectedSupply,
    affectedStocks,
    risk,
    casualties,
    startDate,
    source);
}
```

### Add more news sources

Add RSS feed URLs to `NEWS_FEEDS` array in `server/index.js`

### Add real ATC/FlightRadar data

Register at [FlightRadar24 API](https://www.flightradar24.com/commercial-services/data-services) or [OpenSky Network](https://opensky-network.org/apidoc/) and integrate into `/api/military-activity`

### Add real-time stock prices

Integrate [Yahoo Finance API](https://finance.yahoo.com) or [Alpha Vantage](https://www.alphavantage.co) into the impact panel

---

## 📦 Tech Stack

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| Frontend       | React 18, React-Leaflet, Framer Motion |
| Map            | Leaflet.js + CartoDB Dark Matter tiles |
| Backend        | Node.js, Express                       |
| News Scraping  | rss-parser, axios                      |
| Scheduled Jobs | node-cron (every 15 min)               |
| Fonts          | Orbitron, Rajdhani, Share Tech Mono    |

---

## ⚠️ Disclaimer

This application aggregates publicly available information for educational and analytical purposes only. Conflict data is based on open-source intelligence reports. Military activity markers are based on publicly reported information, not real-time ATC data. This is not a tool for operational military use.
