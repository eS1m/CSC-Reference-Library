# Backend Dockerfile — Staging Environment
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the Express server
CMD ["npm", "start"]
