#!/bin/bash

# VectorBeats - Stop All Services Script
# This script stops all VectorBeats services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping VectorBeats Services...${NC}"

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Stopping $service_name (Port: $port, PID: $pid)${NC}"
        kill -TERM $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
        sleep 1
        
        # Check if process is still running
        if kill -0 $pid 2>/dev/null; then
            echo -e "${RED}Force killing $service_name${NC}"
            kill -9 $pid 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓ $service_name stopped${NC}"
    else
        echo -e "${BLUE}$service_name is not running${NC}"
    fi
}

# Stop services by killing processes on their ports
kill_port 3000 "Frontend"
kill_port 5000 "Backend" 
kill_port 8000 "ML Service"

# Also try to stop using PID files if they exist
if [ -d "$LOG_DIR" ]; then
    for pid_file in "$LOG_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file" 2>/dev/null)
            if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
                service_name=$(basename "$pid_file" .pid)
                echo -e "${YELLOW}Stopping $service_name (PID: $pid)${NC}"
                kill -TERM $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            fi
            rm -f "$pid_file"
        fi
    done
fi

# Clean up any remaining node/python processes related to the project
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

echo -e "${GREEN}🎵 All VectorBeats services have been stopped!${NC}"
