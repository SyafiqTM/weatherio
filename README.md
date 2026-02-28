# Weatherio

A beautiful weather app split into a **Vue 3** frontend and a **Python Flask** backend.

```
weatherio/
├── backend/          ← Python / Flask REST API
│   ├── app.py
│   └── requirements.txt
├── frontend/         ← Vue 3 + Vite SPA
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── assets/main.css
│   │   └── components/
│   │       ├── CityCard.vue
│   │       ├── DetailLayer.vue
│   │       └── Timeline.vue
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── (legacy static files kept for reference)
```

## Running locally

### 1 – Backend (Flask)

```bash
cd backend

# create and activate a virtual environment (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt

# set Google Weather API key (PowerShell)
$env:GOOGLE_WEATHER_API_KEY="your_api_key_here"
# or cmd.exe
set GOOGLE_WEATHER_API_KEY=your_api_key_here

python app.py
# → API is available at http://localhost:5001
```

The backend now uses **Google Weather API** (`weather.googleapis.com`) and is
currently scoped to a Malaysia city list:

- Kuala Lumpur
- George Town
- Johor Bahru
- Kota Kinabalu
- Kuching

**Available endpoints**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/weather?city=<name>` | Weather payload for the given city |
| GET | `/api/cities` | List of supported cities |
| GET | `/api/health` | Health check |

### 2 – Frontend (Vue 3 + Vite)

```bash
cd frontend
npm install
npm run dev
# → App is available at http://localhost:3000
```

Vite proxies every `/api/*` request to `http://localhost:5000`, so both
servers need to be running at the same time during development.

### Production build

```bash
cd frontend
npm run build   # outputs to frontend/dist/
```

Serve `frontend/dist/` with any static host and point your reverse proxy
(nginx, Caddy, etc.) so that `/api/*` is forwarded to the Flask process.
