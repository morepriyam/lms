# Adaptive Learning Management System - Backend

This is the backend server for the Adaptive Learning Management System (LMS), a project for Database Systems class.

## Features

- User authentication with JWT (email/password)
- OAuth integration with Google and GitHub
- Role-based access control (Admin, Instructor, Student)
- User management
- Course management
- Video content delivery
- Quiz creation and assessment
- Progress tracking
- Payment processing

## Tech Stack

- Node.js with Express
- PostgreSQL with Prisma ORM
- JWT for authentication
- TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables in `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
   JWT_SECRET="your-super-secret-key"
   JWT_EXPIRES_IN="7d"
   PORT=5000
   NODE_ENV="development"
   ```
4. Generate Prisma client:
   ```
   npm run prisma:generate
   ```
5. Run database migrations:
   ```
   npm run prisma:migrate
   ```
6. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/oauth` - Login/Register with OAuth provider
- `GET /api/auth/me` - Get current authenticated user

### User Management

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PATCH /api/users/:id/role` - Change user role (admin only)
- `DELETE /api/users/:id` - Delete user

## Development

- Build the project: `npm run build`
- Start production server: `npm start`
- Run database migrations: `npm run prisma:migrate`
- Generate Prisma client: `npm run prisma:generate` 