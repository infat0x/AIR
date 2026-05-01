# Am I reachable? - Full Stack Web Application

A modern full-stack web application for scanning domain external reachability. Based on the original bash/Python scanner, this version provides a modern web interface for managing large-scale domain scanning operations.

## Overview

This application consists of two main parts:

1. **Backend** (Node.js/Express) - Core scanning logic, API endpoints, and data management
2. **Frontend** (Next.js/React) - Modern web UI with real-time results, filtering, and export capabilities

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### Option 1: Local Development

#### Backend

```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

#### Frontend (in another terminal)

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

### Option 2: Using Docker Compose

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# API: http://localhost:3001/api
```

## Features

### Backend (API Server)

- **Domain Scanning**
  - HTTP/HTTPS reachability detection
  - TCP port checking (80, 443)
  - DNS resolution
  - Security header detection (HSTS, CSP, X-Frame-Options)
  - Configurable parallel workers
  - Customizable timeouts

- **Data Management**
  - In-memory scan caching (24-hour TTL)
  - RESTful API endpoints
  - Results polling mechanism

- **Export Options**
  - JSON format (complete data)
  - CSV format (spreadsheet compatible)
  - HTML format (interactive reports)

- **Multi-language Support**
  - English
  - Russian
  - Azerbaijani

### Frontend (Web UI)

- **Modern Interface**
  - Dark theme optimized for accessibility
  - Responsive design (mobile, tablet, desktop)
  - Real-time status updates

- **Scanning**
  - JSON input for domain configuration
  - Configurable scanning parameters
  - Progress tracking

- **Results Management**
  - Interactive results table
  - Full-text search across results
  - Status-based filtering
  - Sorting and pagination

- **Data Export**
  - Export to JSON, CSV, or HTML
  - Client-side export (instant download)
  - Server-side export (via API)

- **Multi-language**
  - Language selector in header
  - All UI text translated
  - Easy to add more languages

## Project Structure

```
amireachable-web/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── server.js          # Express app setup
│   │   ├── routes/
│   │   │   └── api.js         # API endpoints
│   │   ├── services/
│   │   │   └── scanner.js     # Core scanning logic
│   │   └── config/
│   │       └── languages.js   # Language strings
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/                   # Next.js/React app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── page.tsx        # Home page
│   │   │   └── globals.css     # Global styles
│   │   ├── components/
│   │   │   ├── Header.tsx      # Header with language selector
│   │   │   ├── Scanner.tsx     # Scanning interface
│   │   │   └── Results.tsx     # Results display
│   │   └── lib/
│   │       ├── api.ts          # API client
│   │       ├── store.ts        # Zustand state management
│   │       └── language.tsx    # i18n context
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.local.example
│   └── README.md
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

## API Endpoints

### POST /api/scan

Start a new domain scan

**Request:**
```json
{
  "domains": [
    {
      "domain": "example.com",
      "subdomains": ["www.example.com", "api.example.com"]
    }
  ],
  "options": {
    "workers": 12,
    "timeout": 10000
  }
}
```

**Response:**
```json
{
  "scanId": "uuid-string",
  "entriesCount": 3,
  "message": "Scan started..."
}
```

### GET /api/scan/:scanId

Get scan results and statistics

**Response:**
```json
{
  "status": "completed",
  "results": [...],
  "stats": {
    "total": 3,
    "open": 1,
    "closed": 1,
    "screenshots": 0,
    "counts": {...}
  },
  "startTime": "2024-01-15T10:30:00Z"
}
```

### GET /api/scan/:scanId/export

Export results in different formats

**Query Parameters:**
- `format` - Output format: `json`, `csv`, or `html`

**Response:**
- JSON/CSV: File download
- HTML: Standalone HTML report

### GET /api/docs

View API documentation

## Input Format

Domains must be provided as a JSON array:

```json
[
  {
    "domain": "example.com",
    "subdomains": [
      "www.example.com",
      "api.example.com",
      "mail.example.com"
    ]
  },
  {
    "domain": "example.org",
    "subdomains": [
      "www.example.org"
    ]
  }
]
```

Subdomains with certain prefixes are automatically filtered:
- `_dmarc.`, `_domainkey.`, `_sip.`, etc. (DNS records)
- Various other service-specific prefixes

## Configuration

### Backend

Create `backend/.env`:

```env
PORT=3001
NODE_ENV=development
```

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Development

### Adding Languages

1. Add strings to `backend/src/config/languages.js`
2. Add strings to `frontend/src/lib/language.tsx`
3. Language code will be available as a selectable option

### Extending Scanning Logic

Modify `backend/src/services/scanner.js`:
- Add new checks (e.g., SSL certificate validation)
- Implement WhatWeb integration for tech detection
- Add screenshot capabilities

### Customizing UI

- Modify components in `frontend/src/components/`
- Update styles in `frontend/src/app/globals.css`
- Extend Tailwind config in `frontend/tailwind.config.ts`

## Performance Considerations

- **Parallel Scanning**: Configure workers based on system resources
- **Timeouts**: Adjust per-host timeout to avoid hanging
- **Memory**: Results are cached for 24 hours
- **Polling**: Frontend polls every second until scan completes

## Differences from Original Script

1. **Architecture**: Modular full-stack vs. single bash script
2. **Interface**: Modern web UI vs. CLI
3. **Storage**: In-memory vs. filesystem
4. **Screenshots**: Placeholder (original used Chrome)
5. **WhatWeb**: Placeholder (original ran actual WhatWeb)
6. **Real-time**: Web-based polling instead of synchronous execution

## Future Enhancements

- [ ] Database integration for persistent storage
- [ ] WhatWeb integration for tech stack detection
- [ ] Headless Chrome integration for screenshots
- [ ] Webhook notifications on scan completion
- [ ] Scheduled/recurring scans
- [ ] User authentication and multi-tenant support
- [ ] Advanced filtering and reporting
- [ ] Historical scan comparison
- [ ] API rate limiting and quotas

## Troubleshooting

### Backend fails to start
- Check port 3001 is not in use
- Verify Node.js version is 18+
- Check network connectivity for DNS lookups

### Frontend can't connect to API
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check CORS is enabled in backend

### Scans timing out
- Increase `timeout` parameter (in milliseconds)
- Reduce `workers` count
- Check network latency to scanned hosts

## License

MIT

## Support

For issues and questions, please refer to the README files in respective directories:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
