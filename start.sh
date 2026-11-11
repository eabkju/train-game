#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT=8080
echo "=================================================="
echo "  Greenlands 3D Train Game (Cool CPU Edition)"
echo "=================================================="
echo "Starting local server at: http://localhost:$PORT"
echo "Or open train-game-standalone.html directly!"
echo "=================================================="
python3 -m http.server $PORT
