# AI TrainEasy MVP

AI TrainEasy is a no-code platform for training and deploying machine learning models. This MVP provides core functionality including project management, dataset upload, schema definition, model training (CPU and GPU with dynamic dispatch), export controls with mock billing, and user authentication.

## Local Development with Docker

1. Copy `.env.example` to `.env` and fill in:
   ```bash
   cp .env.example .env
   # Then edit .env to set your JWT_SECRET_KEY, SENTRY_DSN,
   # VITE_API_BASE_URL (e.g. http://localhost:8000) and VITE_SENTRY_DSN
   ```

2. Build and start both services:

   ```bash
   docker-compose up --build
   ```

3. In your browser:

   * **Frontend** at [http://localhost:5173](http://localhost:5173)
   * **Backend docs** at [http://localhost:8000/docs](http://localhost:8000/docs)

The frontend container will use the `VITE_API_BASE_URL` from `.env` so that all API calls point to your local FastAPI backend.

## Building Frontend for Production/Custom Environments

The frontend's API base URL (where it expects the backend to be) can be configured at build time using the `VITE_API_BASE_URL` build argument.

**Using Docker Compose (for different local profiles or CI stages):**

You can modify the `VITE_API_BASE_URL` in the `args` section of the `frontend` service in your `docker-compose.yml` (or a `docker-compose.override.yml`) before building:

```yaml
# docker-compose.yml (excerpt)
services:
  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
      args:
        - VITE_API_BASE_URL=http://backend:8000 # For default docker-compose internal networking
        # For a staging build, you might have:
        # - VITE_API_BASE_URL=https://api.staging.yourapp.com
```
Then rebuild the frontend image: `docker-compose build frontend` or `docker-compose up --build frontend`.

**Building a Standalone Frontend Docker Image:**

If you need to build the frontend Docker image directly (e.g., for deployment to a static hosting service that will connect to a separately hosted backend), you can pass the build argument like this:

```bash
docker build . \
  --build-arg VITE_API_BASE_URL=https://api.production.yourapp.com \
  -f packages/frontend/Dockerfile \
  -t myapp-frontend-production:latest
```

Replace `https://api.production.yourapp.com` with your actual backend API URL for that environment. The `-f` flag specifies the path to the frontend's Dockerfile, assuming you run the command from the project root.

This will bake the specified API URL into the static frontend assets.
