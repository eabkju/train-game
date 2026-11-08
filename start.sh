#!/usr/bin/env bash
# Quick start script for 3D Train Simulation
cd "$(dirname "$0")"
PORT=8080
echo "========================================="
echo "   Realistic 3D Web-Based Train Game"
echo "========================================="
echo "Starting local offline server on port $PORT..."
echo "Open your browser to: http://localhost:$PORT"
echo "Press Ctrl+C to stop the server."
echo "========================================="
python3 -m http.server $PORT
