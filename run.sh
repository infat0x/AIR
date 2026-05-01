#!/bin/bash

# Am I Reachable? - Single Command Runner
# This script installs dependencies and starts both backend and frontend

set -e

echo "🚀 Starting Am I Reachable App..."

# Create environment files if they don't exist
if [ ! -f "backend/.env" ]; then
  echo "📝 Creating backend/.env..."
  cat > backend/.env << EOF
PORT=3001
NODE_ENV=development
EOF
fi

if [ ! -f "frontend/.env.local" ]; then
  echo "📝 Creating frontend/.env.local..."
  cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Start both services
echo "✅ Setup complete!"
echo ""
echo "🔧 Starting services..."
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""

# Use concurrently if available, otherwise start services sequentially
if command -v concurrently &> /dev/null; then
  concurrently \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev"
else
  # Fallback: start services in background
  echo "Starting backend..."
  (cd backend && npm run dev) &
  BACKEND_PID=$!
  
  echo "Starting frontend..."
  (cd frontend && npm run dev) &
  FRONTEND_PID=$!
  
  echo "✨ Both services are running!"
  echo "Press Ctrl+C to stop all services"
  echo ""
  
  # Wait for both processes
  wait $BACKEND_PID $FRONTEND_PID
fi
