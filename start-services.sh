#!/bin/bash

# VectorBeats - Complete Setup and Start Script
# This script sets up and starts all services for the VectorBeats platform
# Perfect for new users who want to run the project locally!
#
# What this script does:
# 1. Checks all prerequisites (Node.js, Python, dependencies)
# 2. Sets up environment variables and configuration
# 3. Starts Qdrant vector database (if available)
# 4. Populates demo data for immediate testing
# 5. Starts all three services: Frontend, Backend, and ML Service
# 6. Provides helpful URLs and monitoring information

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "██╗   ██╗███████╗ ██████╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗ █████╗ ████████╗███████╗"
echo "██║   ██║██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝"
echo "██║   ██║█████╗  ██║        ██║   ██║   ██║██████╔╝██████╔╝█████╗  ███████║   ██║   ███████╗"
echo "╚██╗ ██╔╝██╔══╝  ██║        ██║   ██║   ██║██╔══██╗██╔══██╗██╔══╝  ██╔══██║   ██║   ╚════██║"
echo " ╚████╔╝ ███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║   ██║   ███████║"
echo "  ╚═══╝  ╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝"
echo -e "${NC}"
echo -e "${CYAN}🎵 AI-Powered Music Discovery Platform${NC}"
echo -e "${YELLOW}🚀 Complete Setup for New Users${NC}"
echo -e "${WHITE}=====================================================================${NC}"
echo -e "${GREEN}Welcome to VectorBeats!${NC} This script will:"
echo -e "  ${BLUE}•${NC} Check all prerequisites and dependencies"
echo -e "  ${BLUE}•${NC} Set up your environment automatically"
echo -e "  ${BLUE}•${NC} Start the Qdrant vector database"
echo -e "  ${BLUE}•${NC} Populate demo data for immediate testing"
echo -e "  ${BLUE}•${NC} Launch all three services (Frontend, Backend, ML)"
echo -e "  ${BLUE}•${NC} Open your browser to start discovering music!"
echo -e "${WHITE}=====================================================================${NC}"
echo

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ML_SERVICE_DIR="$PROJECT_ROOT/ml-service"

# Log file for processes
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Function to print colored status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to check if Qdrant is running
check_qdrant() {
    if curl -s -f "http://localhost:6333/collections" >/dev/null 2>&1; then
        return 0  # Qdrant is running
    else
        return 1  # Qdrant is not running
    fi
}

# Function to start Qdrant database
start_qdrant() {
    print_status "Checking Qdrant vector database..."
    
    if check_qdrant; then
        print_success "Qdrant is already running"
        return 0
    fi
    
    print_status "Starting Qdrant vector database..."
    
    # Check if Docker is available
    if command_exists docker; then
        print_status "Using Docker to start Qdrant..."
        docker run -d --name qdrant-vectorbeats \
            -p 6333:6333 \
            -v qdrant_storage:/qdrant/storage \
            qdrant/qdrant:latest >/dev/null 2>&1 || {
            # Container might already exist
            docker start qdrant-vectorbeats >/dev/null 2>&1 || {
                print_warning "Failed to start Qdrant with Docker"
                return 1
            }
        }
        
        # Wait for Qdrant to be ready
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if check_qdrant; then
                print_success "Qdrant started successfully"
                return 0
            fi
            echo -n "."
            sleep 2
            attempt=$((attempt + 1))
        done
        
        print_error "Qdrant failed to start within expected time"
        return 1
    else
        print_warning "Docker not found. Please install Docker or start Qdrant manually:"
        echo "  docker run -d -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest"
        echo "  Or download from: https://qdrant.tech/documentation/quick-start/"
        return 1
    fi
}

# Function to populate demo data
populate_demo_data() {
    print_status "Checking if demo data exists..."
    
    # Check if collections have data
    local music_count=0
    local image_count=0
    
    if check_qdrant; then
        music_response=$(curl -s "http://localhost:6333/collections/music_vectors" 2>/dev/null || echo '{"result":{"points_count":0}}')
        image_response=$(curl -s "http://localhost:6333/collections/image_vectors" 2>/dev/null || echo '{"result":{"points_count":0}}')
        
        music_count=$(echo "$music_response" | grep -o '"points_count":[0-9]*' | cut -d':' -f2 || echo "0")
        image_count=$(echo "$image_response" | grep -o '"points_count":[0-9]*' | cut -d':' -f2 || echo "0")
    fi
    
    if [ "$music_count" -gt 0 ] && [ "$image_count" -gt 0 ]; then
        print_success "Demo data already exists ($music_count music, $image_count image vectors)"
        return 0
    fi
    
    print_status "Populating demo data for immediate testing..."
    print_warning "Note: This requires Spotify API credentials for best results"
    
    cd "$BACKEND_DIR"
    
    # Check if environment variables are set
    if [ -f ".env" ]; then
        source .env
        if [ -z "$SPOTIFY_CLIENT_ID" ] || [ "$SPOTIFY_CLIENT_ID" = "your_spotify_client_id" ]; then
            print_warning "Spotify credentials not configured. Demo data will be limited."
            echo "  To get full demo data, add your Spotify credentials to backend/.env:"
            echo "    SPOTIFY_CLIENT_ID=your_actual_client_id"
            echo "    SPOTIFY_CLIENT_SECRET=your_actual_client_secret"
            echo "  Get them from: https://developer.spotify.com/dashboard/applications"
            echo
        fi
    fi
    
    print_status "Running database population script..."
    if npm run populate-demo 2>/dev/null || node src/scripts/populateDemoVectors.js 2>/dev/null; then
        print_success "Demo data populated successfully!"
    else
        print_warning "Demo population had issues, but continuing..."
        print_status "You can manually populate later with: npm run populate-demo"
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_warning "Killing existing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Cleanup function to kill all spawned processes
cleanup() {
    echo
    print_warning "Shutting down services..."
    
    # Kill processes by PID if they exist
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping Frontend (PID: $FRONTEND_PID)"
        kill -TERM $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Stopping Backend (PID: $BACKEND_PID)"
        kill -TERM $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$ML_SERVICE_PID" ] && kill -0 $ML_SERVICE_PID 2>/dev/null; then
        print_status "Stopping ML Service (PID: $ML_SERVICE_PID)"
        kill -TERM $ML_SERVICE_PID 2>/dev/null || true
    fi
    
    # Force kill on ports if processes still running
    kill_port 3000  # Frontend
    kill_port 5000  # Backend
    kill_port 8000  # ML Service
    
    # Note: We don't stop Qdrant container automatically as it may contain user data
    # Users can manually stop it with: docker stop qdrant-vectorbeats
    
    print_success "All VectorBeats services stopped"
    print_status "Note: Qdrant database is still running to preserve your data"
    print_status "To stop Qdrant: docker stop qdrant-vectorbeats"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

print_step "1/9 Checking Prerequisites"

# Check for required commands
REQUIRED_COMMANDS=("node" "npm" "python3" "pip3")
MISSING_COMMANDS=()

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command_exists "$cmd"; then
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -ne 0 ]; then
    print_error "Missing required commands: ${MISSING_COMMANDS[*]}"
    echo
    echo -e "${YELLOW}Please install the following:${NC}"
    echo "  📦 Node.js 16+ (https://nodejs.org/)"
    echo "  🐍 Python 3.8+ (https://python.org/)"
    echo "  📋 npm (comes with Node.js)"
    echo "  🔧 pip3 (comes with Python)"
    echo
    echo -e "${CYAN}Quick install commands:${NC}"
    echo "  # Ubuntu/Debian:"
    echo "  sudo apt update && sudo apt install nodejs npm python3 python3-pip"
    echo
    echo "  # macOS:"
    echo "  brew install node python@3.11"
    echo
    echo "  # Windows:"
    echo "  # Download installers from nodejs.org and python.org"
    exit 1
fi

print_success "All required commands are available"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 16 ]; then
    print_error "Node.js version $NODE_VERSION detected. Version 16+ is required."
    echo "Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi
print_success "Node.js $NODE_VERSION ✓"

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    print_error "Python version $PYTHON_VERSION detected. Version 3.8+ is required."
    echo "Please upgrade Python: https://python.org/"
    exit 1
fi
print_success "Python $PYTHON_VERSION ✓"

# Check for optional Docker
if command_exists docker; then
    print_success "Docker detected - will use for Qdrant database ✓"
else
    print_warning "Docker not found - you'll need to start Qdrant manually"
fi

print_step "2/9 Checking Project Structure"

# Verify project directories exist
for dir in "$BACKEND_DIR" "$FRONTEND_DIR" "$ML_SERVICE_DIR"; do
    if [ ! -d "$dir" ]; then
        print_error "Directory not found: $dir"
        print_status "Make sure you're running this script from the VectorBeats root directory"
        exit 1
    fi
done

print_success "Project structure verified"

print_step "3/9 Starting Qdrant Vector Database"

start_qdrant

print_step "4/9 Cleaning Up Existing Processes"

# Kill any existing processes on our ports
kill_port 3000
kill_port 5000
kill_port 8000

print_step "5/9 Installing Dependencies"

# Install Backend Dependencies
print_status "Installing backend dependencies..."
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    npm install
else
    print_status "Backend dependencies already installed, skipping..."
fi

# Install Frontend Dependencies
print_status "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    npm install
else
    print_status "Frontend dependencies already installed, skipping..."
fi

# Install ML Service Dependencies
print_status "Installing ML service dependencies..."
cd "$ML_SERVICE_DIR"
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

print_status "Activating virtual environment and installing packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

print_success "All dependencies installed"

print_step "6/9 Setting Up Environment"

# Create .env files if they don't exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_status "Creating backend .env file..."
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    else
        cat > "$BACKEND_DIR/.env" << EOF
# VectorBeats Backend Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000

# Spotify API (Get from https://developer.spotify.com/dashboard/applications)
# Required for demo data population and music search fallback
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# CORS Settings
CORS_ORIGIN=http://localhost:3000
EOF
    fi
    
    print_warning "⚠️  Please configure your Spotify API credentials in backend/.env"
    print_status "   1. Go to https://developer.spotify.com/dashboard/applications"
    print_status "   2. Create a new app"
    print_status "   3. Copy Client ID and Client Secret to backend/.env"
    print_status "   4. This enables demo data and music search functionality"
else
    print_success "Backend .env file already exists"
fi

if [ ! -f "$ML_SERVICE_DIR/.env" ]; then
    print_status "Creating ML service .env file..."
    if [ -f "$ML_SERVICE_DIR/.env.example" ]; then
        cp "$ML_SERVICE_DIR/.env.example" "$ML_SERVICE_DIR/.env"
    else
        cat > "$ML_SERVICE_DIR/.env" << EOF
# VectorBeats ML Service Configuration
PORT=8000
ENVIRONMENT=development

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# Model and Storage Settings
MODEL_CACHE_DIR=./models
TEMP_DIR=./temp

# Logging
LOG_LEVEL=INFO
EOF
    fi
    print_success "Created ML service .env file"
else
    print_success "ML service .env file already exists"
fi

print_success "Environment setup complete"

print_step "7/9 Building Projects"

# Build Backend
print_status "Building backend..."
cd "$BACKEND_DIR"
npm run build

print_success "Projects built successfully"

print_step "8/9 Populating Demo Data"

populate_demo_data

print_step "9/9 Starting Services"

# Start ML Service
print_status "Starting ML Service on port 8000..."
cd "$ML_SERVICE_DIR"
source venv/bin/activate
nohup python main.py > "$LOG_DIR/ml-service.log" 2>&1 &
ML_SERVICE_PID=$!
echo $ML_SERVICE_PID > "$LOG_DIR/ml-service.pid"

# Start Backend
print_status "Starting Backend on port 5000..."
cd "$BACKEND_DIR"
nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend.pid"

# Start Frontend
print_status "Starting Frontend on port 3000..."
cd "$FRONTEND_DIR"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"

# Wait for services to be ready
sleep 5

print_status "Verifying services..."

# Check ML Service
if wait_for_service "http://localhost:8000/health" "ML Service"; then
    ML_SERVICE_STATUS="${GREEN}✓ Running${NC}"
else
    ML_SERVICE_STATUS="${RED}✗ Failed${NC}"
fi

# Check Backend
if wait_for_service "http://localhost:5000/api/health" "Backend"; then
    BACKEND_STATUS="${GREEN}✓ Running${NC}"
else
    BACKEND_STATUS="${RED}✗ Failed${NC}"
fi

# Check Frontend (just check if port is open)
if check_port 3000; then
    FRONTEND_STATUS="${GREEN}✓ Running${NC}"
else
    FRONTEND_STATUS="${RED}✗ Failed${NC}"
fi

# Display status
echo
echo -e "${WHITE}=====================================================================${NC}"
echo -e "${CYAN}🎵 VectorBeats Services Status${NC}"
echo -e "${WHITE}=====================================================================${NC}"
printf "%-20s %-15s %-30s\n" "Service" "Status" "URL"
echo "---------------------------------------------------------------------"
printf "%-20s %-24s %-30s\n" "Frontend" "$FRONTEND_STATUS" "http://localhost:3000"
printf "%-20s %-24s %-30s\n" "Backend" "$BACKEND_STATUS" "http://localhost:5000"
printf "%-20s %-24s %-30s\n" "ML Service" "$ML_SERVICE_STATUS" "http://localhost:8000"
printf "%-20s %-24s %-30s\n" "Qdrant DB" "${GREEN}✓ Running${NC}" "http://localhost:6333"
echo
echo -e "${WHITE}Process IDs:${NC}"
echo "  Frontend: $FRONTEND_PID"
echo "  Backend: $BACKEND_PID" 
echo "  ML Service: $ML_SERVICE_PID"
echo
echo -e "${WHITE}Log Files:${NC}"
echo "  Frontend: $LOG_DIR/frontend.log"
echo "  Backend: $LOG_DIR/backend.log"
echo "  ML Service: $LOG_DIR/ml-service.log"
echo
echo -e "${GREEN}🚀 VectorBeats is ready to use!${NC}"
echo
echo -e "${YELLOW}📱 NEXT STEPS:${NC}"
echo -e "  ${GREEN}1.${NC} Open your browser and go to: ${WHITE}http://localhost:3000${NC}"
echo -e "  ${GREEN}2.${NC} Upload an image or record audio to discover music!"
echo -e "  ${GREEN}3.${NC} Try different image types for varied results:"
echo -e "     • ${BLUE}Nature/calm images${NC} → Ambient/chill music"
echo -e "     • ${BLUE}Energetic/vibrant images${NC} → Electronic/dance music"
echo -e "     • ${BLUE}Artistic images${NC} → Indie/alternative music"
echo -e "     • ${BLUE}Happy/bright images${NC} → Pop music"
echo
echo -e "${CYAN}💡 Useful Commands:${NC}"
echo "  • View frontend logs: tail -f $LOG_DIR/frontend.log"
echo "  • View backend logs: tail -f $LOG_DIR/backend.log"
echo "  • View ML service logs: tail -f $LOG_DIR/ml-service.log"
echo "  • Check Qdrant status: curl http://localhost:6333/collections"
echo "  • Populate more demo data: cd backend && npm run populate-demo"
echo "  • Stop all services: Press Ctrl+C"
echo
echo -e "${PURPLE}🔧 Configuration Tips:${NC}"
echo "  • Add Spotify credentials to backend/.env for full functionality"
echo "  • Adjust upload limits in backend/.env if needed"
echo "  • Check docs/ folder for detailed API documentation"
echo
echo -e "${WHITE}=====================================================================${NC}"

# Keep script running and monitor services
print_status "Services are running. Press Ctrl+C to stop all services."

# Monitor loop
while true; do
    sleep 10
    
    # Check if processes are still running
    if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend process has stopped unexpectedly"
        FRONTEND_PID=""
    fi
    
    if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend process has stopped unexpectedly"
        BACKEND_PID=""
    fi
    
    if [ ! -z "$ML_SERVICE_PID" ] && ! kill -0 $ML_SERVICE_PID 2>/dev/null; then
        print_error "ML Service process has stopped unexpectedly"
        ML_SERVICE_PID=""
    fi
    
    # If all processes are dead, exit
    if [ -z "$FRONTEND_PID" ] && [ -z "$BACKEND_PID" ] && [ -z "$ML_SERVICE_PID" ]; then
        print_error "All services have stopped"
        break
    fi
done
