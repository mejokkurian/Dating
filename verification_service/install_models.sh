#!/bin/bash
# Install face_recognition_models from GitHub (required for face_recognition)
cd "$(dirname "$0")"
source venv/bin/activate
pip install git+https://github.com/ageitgey/face_recognition_models

