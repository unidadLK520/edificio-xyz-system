# Backend Dockerfile
# Uses Node.js 22 Alpine image
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Expose the port the backend runs on (adjust if different)
EXPOSE 4000

# Start the backend (adjust the start script name if needed)
CMD ["npm","run","start"]
