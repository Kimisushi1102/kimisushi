FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "src/index.js"]
