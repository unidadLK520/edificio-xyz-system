# Frontend Dockerfile for Next.js (React)
# Uses Node.js 22 Alpine image
FROM node:22-alpine AS base

# Install pnpm globally
RUN npm i -g pnpm

# Set working directory
WORKDIR /app

# Copy only package manifests for better caching
COPY package.json ./
COPY pnpm-lock.yaml* ./ || true

# Install production dependencies (skip dev for smaller image)
RUN pnpm install --frozen-lockfile --prod

# Copy the rest of the source code
COPY . .

# Build the Next.js app (optional – you can also run in dev mode)
RUN pnpm build

# Expose the port the app runs on (default 3000)
EXPOSE 3000

# Start the Next.js server in production mode
CMD ["pnpm","start"]
