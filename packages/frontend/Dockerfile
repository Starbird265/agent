FROM node:20-alpine as build
WORKDIR /app

# Accept VITE_API_BASE_URL as a build argument
ARG VITE_API_BASE_URL
# Set it as an environment variable for the build process
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml to leverage Docker cache
COPY packages/frontend/package.json packages/frontend/pnpm-lock.yaml ./
# It's possible pnpm-workspace.yaml from root might be needed if pnpm install refers to workspace structure
# COPY pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend code
COPY packages/frontend/ ./

# Build the application (VITE_API_BASE_URL will be available here)
RUN pnpm build

# --- Serve stage ---
FROM nginx:1.25-alpine

# Copy built assets from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 (default for Nginx)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
