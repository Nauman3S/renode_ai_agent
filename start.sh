#!/bin/bash

# Start nginx
nginx -c /app/nginx.conf

# Start FastAPI backend in the background
cd backend
python main.py &

# Start Next.js frontend
cd ..
npm start 