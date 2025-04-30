FROM node:18

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate && npm run build

EXPOSE 3000

# Start command without using the entrypoint script
CMD ["npm", "start"] 