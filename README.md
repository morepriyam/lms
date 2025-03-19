# Adaptive Learning Management System

A modern Learning Management System (LMS) with progress tracking and analytics for a Database Systems class project.

## Project Structure

- `server/` - Backend API built with Express, TypeScript, Prisma, and PostgreSQL
- `server/.env` - Environment variables for the application
- `docker-compose.yml` - Docker Compose configuration for PostgreSQL database and server
- `lms-api-postman-collection.json` - Postman collection for testing the API

## Getting Started

### Prerequisites

- Node.js (v14+)
- Docker and Docker Compose
- Postman (for API testing)

### Running with Docker (Recommended)

1. Start both the database and server using Docker Compose:

```bash
docker-compose up -d
```

2. The server will be available at http://localhost:3000

### Manual Setup (Development)

#### Setting Up the Database

1. Start only the PostgreSQL database using Docker Compose:

```bash
docker-compose up -d postgres
```

2. Verify the PostgreSQL container is running:

```bash
docker ps
```

#### Setting Up the Backend Server

1. Change to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Create database tables:

```bash
npx prisma migrate dev --name init
```

5. Start the development server:

```bash
npm run dev
```

The server will start on port 3000 (or the port specified in your .env file).

## Environment Variables

The application uses a `.env` file in the server directory with the following variables:

```
# Prisma Database URL
DATABASE_URL="postgresql://lms_user:lms_password@postgres:5432/lms_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV="development"
```

Note: When running locally without Docker, you should change the DATABASE_URL to use `localhost` instead of `postgres`:

```
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db?schema=public"
```

## API Testing with Postman

1. Import the Postman collection:
   - Open Postman
   - Click "Import" and select the `lms-api-postman-collection.json` file

2. Set up environment variables in Postman:
   - Create a new environment
   - Add the following variables:
     - `base_url`: http://localhost:3000
     - `token`: (This will be populated after logging in)
     - `user_id`: (This will be populated after logging in or creating a user)

3. Testing workflow:
   - Register a new user using the Register endpoint
   - Login to get a JWT token and update the `token` variable
   - Use other endpoints with the appropriate authorization

## Features Implemented

- User authentication (register, login)
- Role-based access control (Admin, Instructor, Student)
- User profile management

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express Documentation](https://expressjs.com/)
- [JWT Documentation](https://jwt.io/) 