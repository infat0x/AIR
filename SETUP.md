# Am I reachable? - Setup & Deployment Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure Environment

**Backend** - Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server runs on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
App runs on http://localhost:3000

### 4. Access the Application

Open http://localhost:3000 in your browser

## Input Format

Prepare your domains as JSON:

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
    "domain": "another.org",
    "subdomains": [
      "www.another.org"
    ]
  }
]
```

## Production Deployment

### Option 1: Docker Compose

```bash
docker-compose up --build
```

Access:
- Frontend: http://localhost:3000
- API: http://localhost:3001/api

### Option 2: Manual Build

**Backend:**
```bash
cd backend
npm install --production
NODE_ENV=production node src/server.js
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
npm start
```

### Option 3: Kubernetes

Create `backend-deployment.yaml`, `frontend-deployment.yaml`, etc.

## Features & Usage

### 1. Scanning

1. Paste your domain JSON into the input field
2. Adjust workers (default: 12) and timeout (default: 10000ms) if needed
3. Click "Start Scan"
4. Wait for scan to complete

### 2. Filtering Results

- **Search**: Find hosts by name, IP, or domain
- **Status Filter**: View Open, Closed, TCP Open, DNS Only, or No DNS hosts
- **Filter Buttons**: Quick filter by status type

### 3. Exporting Data

- **JSON**: Complete scan data with all fields
- **CSV**: Import to Excel/Sheets
- **HTML**: Standalone report file

### 4. Multi-language

Click language buttons in header:
- **EN** - English
- **RU** - Russian
- **AZ** - Azerbaijani

## API Reference

### Start Scan

```bash
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "domains": [
      {
        "domain": "example.com",
        "subdomains": ["www.example.com"]
      }
    ],
    "options": {
      "workers": 12,
      "timeout": 10000
    }
  }'
```

Response:
```json
{
  "scanId": "550e8400-e29b-41d4-a716-446655440000",
  "entriesCount": 2,
  "message": "Scan started, check status with /api/scan/:scanId"
}
```

### Get Results

```bash
curl http://localhost:3001/api/scan/550e8400-e29b-41d4-a716-446655440000
```

### Export Results

```bash
# JSON
curl http://localhost:3001/api/scan/550e8400-e29b-41d4-a716-446655440000/export?format=json > results.json

# CSV
curl http://localhost:3001/api/scan/550e8400-e29b-41d4-a716-446655440000/export?format=csv > results.csv

# HTML
curl http://localhost:3001/api/scan/550e8400-e29b-41d4-a716-446655440000/export?format=html > results.html
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser                             │
│              (Next.js Frontend - Port 3000)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTP API (Axios)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                                                             │
│            Express.js Backend API (Port 3001)              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes (/api/scan)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Scanner Service                              │  │
│  │  • DNS Resolution                                    │  │
│  │  • HTTP/HTTPS Checks                                │  │
│  │  • TCP Port Scanning                                │  │
│  │  • Security Headers                                 │  │
│  │  • Parallel Processing                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Results Cache (In-Memory)                    │  │
│  │  • 24-hour TTL                                       │  │
│  │  • Quick retrieval                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Customization

### Adding New Languages

1. **Backend** (`backend/src/config/languages.js`):
```javascript
export const languages = {
  // ... existing languages
  es: {
    title: 'Am I reachable?',
    // ... translate all keys
  }
}
```

2. **Frontend** (`frontend/src/lib/language.tsx`):
```typescript
export const languages = {
  // ... existing languages
  es: {
    title: 'Am I reachable?',
    // ... translate all keys
  }
}
```

### Extending Scanning Features

Edit `backend/src/services/scanner.js`:

```javascript
// Add SSL certificate checking
async function checkSSL(host) {
  // Implementation
}

// Add WHOIS lookup
async function getWhoisInfo(domain) {
  // Implementation
}
```

### Custom UI Styling

Edit `frontend/src/app/globals.css` and `frontend/tailwind.config.ts`

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### CORS Issues
Ensure `backend/src/server.js` has CORS enabled:
```javascript
app.use(cors());
```

### DNS Resolution Fails
Some hosts may block DNS queries. The scanner will mark these as "NO_DNS".

### Slow Performance
- Reduce worker count: `--workers 4`
- Increase timeout: `--timeout 15000`
- Check network connectivity

## Monitoring

### Backend Logs
Watch for errors in the terminal running the backend server.

### Frontend Console
Open browser DevTools (F12) to see client-side logs and errors.

## Performance Tips

1. **Parallel Scanning**: Balance workers with system resources
   - 4-8 for limited resources
   - 12-16 for modern systems
   - 20+ for powerful servers

2. **Timeout Tuning**:
   - 5000ms for local networks
   - 10000ms for internet hosts
   - 20000ms for slow connections

3. **Batch Sizes**: Scan 100-1000 hosts per batch for best results

## Security Considerations

⚠️ **Important**: This tool sends HTTP requests to remote servers. Ensure:

1. You have permission to scan the domains
2. Firewalls allow outgoing HTTP/HTTPS
3. Rate limiting is respected on target servers
4. No sensitive information is logged

## Support & Issues

For issues, check:
1. [Backend README](./backend/README.md)
2. [Frontend README](./frontend/README.md)
3. Backend logs in terminal
4. Browser console (F12)

## Differences from Original Script

| Aspect | Original Script | Web App |
|--------|-----------------|---------|
| Interface | CLI | Web UI |
| Deployment | Single server | Frontend + Backend |
| Storage | Filesystem | In-memory + optional DB |
| Screenshots | Headless Chrome | Placeholder |
| WhatWeb | Native | Placeholder |
| Real-time UI | No | Yes |
| Multi-access | Single user | Multi-user ready |
| Scalability | Limited | Better |

## Next Steps

1. Install dependencies
2. Configure environment files
3. Start development servers
4. Open http://localhost:3000
5. Prepare your domain JSON
6. Run a test scan
7. Export results in your preferred format

Happy scanning! 🎯
