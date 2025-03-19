FROM node:18

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies including wait-on for checking database availability
RUN npm install && npm install wait-on --save-dev

# Copy the rest of the application
COPY . .

# Make the entrypoint script executable
RUN chmod +x ./docker-entrypoint.sh

# Generate Prisma client
RUN npx prisma generate && npm run build

EXPOSE 3000

# Use the entrypoint script to ensure migrations run before the server starts
ENTRYPOINT ["./docker-entrypoint.sh"] 