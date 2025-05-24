# PostHub Backend

This is the backend API for **PostHub**, a blog and social interaction platform that supports user authentication, post management, likes, comments, and categories (admin-controlled). Built using **Node.js**, **Express**, **TypeScript**, and **PostgreSQL** with **Drizzle ORM**.

## Tech Stack

- **Node.js**
- **Express.js**
- **TypeScript**
- **Drizzle ORM**
- **PostgreSQL**
- **JWT Authentication**
- **TSX** for live development

## Clone and Run Locally

```bash
git clone https://github.com/Rutuja1923/post-hub.git
cd post-hub/backend
```

## Install Dependencies

```bash
npm install
```

## Setup Environment Variables

Create a `.env` file in the root of the `backend` directory and add the following:

```env
# Server Configuration
PORT=3000                                               # Port where the backend server runs
NODE_ENV=development                                    # Environment mode (development | production)

# Database Configuration
DATABASE_URL=postgres://your_database_user:your_database_password@localhost:5432/your_database_name   
                                                        # Full Postgres connection string
DATABASE_HOST=localhost                                 # Database host
DATABASE_PORT=5432                                      # Port on which the DB is running
DATABASE_USER=your_database_user                        # Database user
DATABASE_PASSWORD=your_database_password                # Password for the database user
DATABASE_NAME=your_database_name                        # Database name

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key                      # Secret key for signing JWTs
JWT_EXPIRES_IN=24h                                      # JWT token expiration time
COOKIE_EXPIRES_IN=24                                    # Cookie expiration time (in hours)

# CORS
CORS_ORIGIN=http://localhost:3000                       # Frontend origin for CORS policy

# Admin Details
ADMIN_EMAIL=your_admin_email                            # Default admin account email
ADMIN_USERNAME=your_admin_username                      # Default admin username
ADMIN_PASSWORD=your_admin_password                      # Default admin password
```

You can modify the credentials as per your local PostgreSQL setup.

## Available NPM Scripts

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Starts the server in watch mode using `tsx`          |
| `npm run db:generate` | Generates types and migration files from your schema |
| `npm run db:push`     | Pushes your schema changes to the database           |
| `npm run db:migrate`  | Applies migration files to the database              |


## Database Schema

The database is managed using **Drizzle ORM**. Schema files are located in the `drizzle/` folder.

To apply or update schema:

```bash
# Generate migration files
npm run db:generate

# Push schema directly (use with caution in production)
npm run db:push

# OR apply migration files
npm run db:migrate
```

## Features

- User registration & login
- JWT-based authentication
- Create, update, and delete posts
- Like and comment system
- Admin-only category management
- Pretty query logging for easier debugging
- Slug auto-generation for unique post URLs

## Folder Structure (Backend)

```
backend/
│
├── drizzle/              # Drizzle ORM schema and migrations
├── scripts/              # Utility scripts (e.g., for seeding, admin setup)
├── src/
│   ├── controllers/      # Route controllers for all entities
│   ├── db/               # Datbase setup and configuration
│   ├── middlewares/      # Custom middleware (auth, error handling)
│   ├── routes/           # Route definitions
|   ├── services/         # Business logic and reusable services
|   ├── types/            # Custom TypeScript types and interfaces
│   ├── utils/            # Utility functions (auth, slugify)
│   ├── app.ts            # Express app setup
│   └── index.ts          # Entry point
└── .env                  # Environment variables (excluded from repo)
├── drizzle.config.ts     # Drizzle ORM configuration
├── tsconfig.json         # TypeScript configuration
```

## API Routes

| Route             | Description                |
| ----------------- | -------------------------- |
| `/api/auth`       | Authentication             |
| `/api/users`      | User operations            |
| `/api/posts`      | Post CRUD                  |
| `/api/comments`   | Commenting on posts        |
| `/api/likes`      | Like/unlike a post         |
| `/api/categories` | Category CRUD (admin only) |

