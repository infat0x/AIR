#!/bin/bash

# Am I Reachable? - Docker Runner
# Runs the full stack using Docker Compose

set -e

echo "🐳 Starting Am I Reachable with Docker..."
docker-compose up --build

echo "✨ Application is running!"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001/api"
