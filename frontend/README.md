# Am I reachable? - Frontend

Modern Next.js/React frontend for the Domain External Reachability Scanner

## Features

- Modern, responsive dark-themed UI
- Multi-language support (English, Russian, Azerbaijani)
- Real-time domain scanning with progress tracking
- Interactive results table with filtering and search
- Multiple export formats (JSON, CSV, HTML)
- Parallel scanning with configurable workers
- Status filtering and visualization
- Security headers detection display

## Installation

```bash
npm install
```

## Environment

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
npm start
```

## Features

### Scanner Input
- Paste JSON with domains and subdomains
- Configure parallel workers (1-32)
- Set custom timeout per host

### Results View
- Interactive table with sorting and filtering
- Search by host, domain, or IP
- Filter by status (Open, Closed, No DNS, etc.)
- Real-time statistics cards
- Export in multiple formats

### Multi-language Support
- English (en)
- Russian (ru)
- Azerbaijani (az)
- Easy language switching via UI

### Export Options
- **JSON** - Full scan data with all fields
- **CSV** - Spreadsheet-compatible format
- **HTML** - Standalone HTML report

## Architecture

- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Utilities and hooks
  - `api.ts` - API client
  - `store.ts` - Zustand state management
  - `language.tsx` - i18n context and hooks
- `src/styles/` - Tailwind CSS

## Components

- **Header** - Navigation and language selector
- **Scanner** - Input form for domain scanning
- **Results** - Results table with filtering and export

## Technology Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Axios (HTTP client)
- Lucide React (icons)
