#!/bin/bash
# Start the Face Verification Service
cd "$(dirname "$0")"
source venv/bin/activate
python app.py
