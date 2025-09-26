# fitscore

AI powered job matching.

## Prerequisites

- Docker
- Docker Compose

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/daimus/fitscore
   cd fitscore
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the example environment file and configure it:
   ```bash
   cp example.env .env
   ```

   Update the `.env` file with the appropriate values. The default configuration should work for local development with Docker Compose.

## Running the Project

1. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

   This will start the following services:
   - **bun**: The application server running on port 3000
   - **postgres**: PostgreSQL database with pgvector extension on port 5432
   - **redis**: Redis server on port 6379

2. Run database migrations:
   ```bash
   docker-compose exec bun bun run db:migrate
   ```

3. (Optional) Seed the database:
   ```bash
   docker-compose exec bun bun run db:seed
   ```

3. Sync schema changes:
   ```bash
   docker-compose exec bun bun run db:push
   ```

4. Access the application at `http://localhost:3000`.