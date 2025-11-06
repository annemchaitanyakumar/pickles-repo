#!/bin/bash
set -e  # Exit immediately if any command fails

# -----------------------------
# Configuration
# -----------------------------
PROJECT_DIR="/root/ht-fe"
PORT=3000

# -----------------------------
# Step 0: Stop any process running on port 3000
# -----------------------------
echo "Checking for any process running on port $PORT..."
PID=$(lsof -ti:$PORT || true)

if [ -n "$PID" ]; then
    echo "Killing process $PID running on port $PORT..."
    kill -9 $PID
else
    echo "No process found running on port $PORT."
fi

# -----------------------------
# Step 1: Navigate to project directory
# -----------------------------
cd "$PROJECT_DIR"

# -----------------------------
# Step 2: Install dependencies silently
# -----------------------------
npm install --silent

# -----------------------------
# Step 3: Start the frontend in background with no output
# -----------------------------
nohup npm run dev >/dev/null 2>&1 &

echo "Frontend started successfully on port $PORT."

