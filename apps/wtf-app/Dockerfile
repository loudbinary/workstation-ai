FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (with fallback)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config for SPA
RUN echo 'server { listen 80; location / { try_files $$uri $$uri/ /index.html; } location /api { proxy_pass http://media-server-service.wtf-replay.svc.cluster.local:3000; proxy_set_header Host $$host; proxy_set_header X-Real-IP $$remote_addr; } }' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
