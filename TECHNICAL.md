# Technical Documentation

## System Architecture

### Backend Architecture

```
src/
├── server.js                 # Express application setup
├── routes/
│   └── api.js               # API route handlers
├── services/
│   └── scanner.js           # Core scanning logic
└── config/
    └── languages.js         # Language definitions
```

#### Key Components

**server.js**
- Express initialization
- CORS configuration
- Middleware setup
- Error handling

**routes/api.js**
- POST /api/scan - Initiate scan
- GET /api/scan/:id - Poll scan results
- GET /api/scan/:id/export - Export results
- GET /api/docs - API documentation

**services/scanner.js**
- `resolveDns()` - DNS lookups
- `checkHttp()` - HTTP/HTTPS status
- `checkTcp()` - Port scanning
- `classifyStatus()` - Result classification
- `scanHost()` - Single host scan
- `scanMultipleHosts()` - Parallel scanning
- `flattenDomains()` - Input processing
- `calculateStats()` - Statistics aggregation

### Frontend Architecture

```
src/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/
│   ├── Header.tsx           # Header + language selector
│   ├── Scanner.tsx          # Scan input interface
│   └── Results.tsx          # Results display + export
└── lib/
    ├── api.ts               # API client
    ├── store.ts             # Zustand store
    └── language.tsx         # i18n context
```

#### Key Components

**Header.tsx**
- Application branding
- Language selector
- New scan button
- Status display

**Scanner.tsx**
- JSON input textarea
- Worker configuration
- Timeout configuration
- Scan submission
- Error handling

**Results.tsx**
- Statistics cards
- Search/filter interface
- Interactive data table
- Export functionality
- Status classification colors

## Data Flow

### Scanning Flow

```
1. User enters JSON domains
↓
2. Frontend sends POST /api/scan
↓
3. Backend validates and parses domains
↓
4. Backend queues scan tasks
↓
5. Parallel workers scan hosts (DNS, HTTP, TCP)
↓
6. Results collected and cached
↓
7. Frontend polls GET /api/scan/:id
↓
8. When complete, displays results
↓
9. User can filter, search, export
```

### Export Flow

```
1. User clicks Export button
↓
2. Frontend calls /api/scan/:id/export?format=X
↓
3. Backend formats results (JSON/CSV/HTML)
↓
4. Returns as file download
↓
5. Browser saves file to Downloads
```

## State Management

### Zustand Store (Frontend)

```typescript
interface ScanStore {
  scanResults: ScanResult[]
  scanStats: Stats
  scanId: string
  isLoading: boolean
  filters: {
    status: string
    search: string
    showOnlyWithScreenshots: boolean
  }
}
```

Actions:
- `setScanResults()` - Update results
- `setScanStats()` - Update statistics
- `setScanId()` - Store scan ID
- `setIsLoading()` - Toggle loading state
- `setFilters()` - Update filter criteria
- `resetScan()` - Clear all data
- `getFilteredResults()` - Computed filter

## Scan Result Structure

```typescript
interface ScanResult {
  domain: string
  host: string
  is_subdomain: boolean
  dns_resolved: boolean
  ips: string[]
  http_code: number | null
  http_error: string | null
  final_url: string
  scheme: string              // 'http' or 'https'
  tcp_443: boolean           // Port 443 open
  tcp_80: boolean            // Port 80 open
  status: string             // Classification
  status_icon: string        // Emoji icon
  server: string             // Server header
  content_type: string       // Content-Type header
  x_powered_by: string       // X-Powered-By header
  hsts: boolean              // HSTS header present
  x_frame_options: string    // X-Frame-Options header
  x_content_type: string     // X-Content-Type-Options
  csp: boolean               // CSP header present
  whatweb: string[]          // Tech stack (placeholder)
  screenshot: string | null  // Base64 image (placeholder)
  scan_time_s: number        // Scan duration
  scanned_at: string         // ISO timestamp
}
```

## Status Classification

```
NO_DNS       - No IPs resolved from DNS
OPEN         - HTTP 2xx/3xx response
OPEN (Auth)  - HTTP 401/403 response
OPEN (Error) - HTTP 4xx/5xx response
TCP OPEN     - TCP port 80 or 443 open
DNS ONLY     - DNS resolves but not reachable
CLOSED       - Not reachable at all
```

## API Specification

### Request: Start Scan

```
POST /api/scan
Content-Type: application/json

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

### Response: Scan Started

```json
{
  "scanId": "uuid",
  "entriesCount": 3,
  "message": "Scan started..."
}
```

### Request: Get Results

```
GET /api/scan/{scanId}
```

### Response: Scan Results

```json
{
  "status": "completed",
  "results": [...],
  "stats": {
    "total": 3,
    "open": 1,
    "closed": 1,
    "screenshots": 0,
    "counts": {
      "OPEN": 1,
      "CLOSED": 1,
      "NO_DNS": 1
    }
  },
  "startTime": "2024-01-15T10:30:00Z"
}
```

### Request: Export Results

```
GET /api/scan/{scanId}/export?format=json|csv|html
```

### Response: File Download

- `format=json`: JSON file
- `format=csv`: CSV file
- `format=html`: Standalone HTML file

## Performance Characteristics

### Scanning Performance

- **Parallel Workers**: 1-32 (configurable)
- **Timeout per Host**: 1-30 seconds (configurable)
- **Total Scan Time**: Scales with host count / workers
  - 100 hosts @ 12 workers: ~30-60 seconds
  - 1000 hosts @ 12 workers: ~5-10 minutes

### Memory Usage

- **In-memory Cache**: ~100KB per host result
- **Total**: 100 hosts ≈ 10MB, 1000 hosts ≈ 100MB
- **Cache TTL**: 24 hours (configurable)

### Response Times

- Scan start: <100ms
- Single host scan: 2-5 seconds
- Results polling: <100ms
- Export: <500ms

## Error Handling

### Backend Errors

```javascript
// DNS Resolution Failure
{ ips: [], dns_error: "getaddrinfo ENOTFOUND example.com" }

// HTTP Request Timeout
{ http_code: null, http_error: "timeout of 10000ms exceeded" }

// TCP Connection Failed
{ tcp_443: false, tcp_80: false }
```

### Frontend Errors

- Invalid JSON input: "Input must be an array of domains"
- Empty domains: "No valid domains to scan"
- Network timeout: "Scan timeout. Results may be incomplete."
- Export failure: "Failed to export results"

## Language System

### Adding New Language

1. Define strings in backend config
2. Define matching strings in frontend config
3. Language becomes selectable in UI

### Language Keys

Common keys for all languages:
- `title`, `subtitle`
- `col_status`, `col_host`, `col_domain`, etc.
- `f_open`, `f_closed`, `f_nodns`
- `start_scan`, `new_scan`, `export`
- Status messages and UI labels

## Extension Points

### Adding New Checks

Modify `scanner.js`:

```javascript
async function checkCertificate(host) {
  // Implementation
  return { valid: true, expiry: '2025-01-15' }
}

export async function scanHost(entry, options = {}) {
  // ... existing code
  const certInfo = await checkCertificate(host)
  return {
    // ... existing fields
    certificate: certInfo
  }
}
```

### Custom Export Formats

Add to `api.js`:

```javascript
if (format === 'xml') {
  res.setHeader('Content-Type', 'application/xml')
  res.send(generateXmlReport(results))
}
```

### UI Customization

Modify components in `frontend/src/components/`:
- Color schemes in `globals.css`
- Component layouts in JSX
- Tailwind classes for styling

## Deployment Considerations

### Environment Variables

**Backend**:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - 'development' or 'production'

**Frontend**:
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use reverse proxy (nginx/Apache)
- [ ] Enable HTTPS
- [ ] Set up logging
- [ ] Monitor memory usage
- [ ] Configure rate limiting
- [ ] Set up backup/restore
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Error tracking enabled

### Database Integration

Replace in-memory cache with:
- PostgreSQL
- MongoDB
- Redis

Example with PostgreSQL:

```javascript
const results = await db.query(
  'INSERT INTO scans (id, results, stats) VALUES ($1, $2, $3)',
  [scanId, JSON.stringify(results), JSON.stringify(stats)]
)
```

## Testing

### Backend Testing

```bash
# Manual API test
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"domains":[{"domain":"example.com","subdomains":[]}]}'
```

### Frontend Testing

1. Test with various domain inputs
2. Test filtering and search
3. Test all export formats
4. Test language switching
5. Test responsive design

## Monitoring

### Health Checks

```bash
curl http://localhost:3001/health
# { "status": "ok", "timestamp": "..." }
```

### Logs

- Backend: Console output
- Frontend: Browser console (F12)
- Errors: Network tab in DevTools

## Troubleshooting Guide

### Issue: "Failed to fetch"

**Cause**: Backend not running or CORS issue

**Solution**:
1. Check backend is running: `curl localhost:3001/health`
2. Verify API URL in frontend `.env.local`
3. Check CORS headers in backend response

### Issue: Slow scanning

**Cause**: Low worker count or high timeout

**Solution**:
1. Increase workers (max 32)
2. Check network latency
3. Reduce timeout for unreachable hosts

### Issue: Out of memory

**Cause**: Too many results cached

**Solution**:
1. Reduce cache TTL
2. Implement database storage
3. Paginate large result sets

## References

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
