#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
npx wait-on -t 60000 tcp:postgres:5432

# Apply database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (in case it's needed)
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting the application..."
exec npm start 