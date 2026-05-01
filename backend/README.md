# Am I reachable? - Backend API

Domain External Reachability Scanner - Node.js/Express Backend

## Features

- Parallel domain/subdomain scanning
- HTTP/HTTPS reachability detection
- TCP port checking (80, 443)
- DNS resolution
- Security header detection (HSTS, CSP, X-Frame-Options, etc.)
- Multiple export formats (JSON, CSV, HTML)
- Multi-language support (English, Russian, Azerbaijani)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

### POST /api/scan
Start a new scan

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
  "scanId": "uuid",
  "entriesCount": 3,
  "message": "Scan started..."
}
```

### GET /api/scan/:scanId
Get scan results

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
  }
}
```

### GET /api/scan/:scanId/export?format=json|csv|html
Export results in different formats

## Architecture

- `src/server.js` - Express server setup
- `src/routes/api.js` - API endpoints
- `src/services/scanner.js` - Core scanning logic
- `src/config/languages.js` - Language strings
