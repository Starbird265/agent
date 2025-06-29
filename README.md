# AI TrainEasy MVP

AI TrainEasy is a no-code platform for training and deploying machine learning models. This MVP provides core functionality including project management, dataset upload, schema definition, model training (CPU and GPU with dynamic dispatch), export controls with mock billing, and user authentication.

## Local Development with Docker

This project uses Docker and Docker Compose for a consistent development environment.

1.  **Environment Variables**:
    Copy or create a `.env` file in the project root. You can use `.env.example` as a template.
    It should contain the following variables, replacing placeholder values with your actual keys/DSNs where applicable:

    ```env
    # Backend secrets & configuration
    JWT_SECRET_KEY=your_super_secret_random_32_byte_hex_key_here_for_jwt
    SENTRY_DSN=your_backend_sentry_dsn_here_if_using_sentry

    # Frontend build-time configuration for local Docker development
    # This VITE_API_BASE_URL is used by the browser to access the backend via the host's mapped port.
    VITE_API_BASE_URL=http://localhost:8000
    VITE_SENTRY_DSN=your_frontend_sentry_dsn_here_if_using_sentry
    ```
    Ensure you replace placeholder values like `your_super_secret_random_32_byte_hex_key_here_for_jwt` with your actual strong keys.

2.  **Run Containers**:
    Build and start the frontend and backend services:
    ```bash
    docker-compose up --build
    ```
    The `--build` flag is only needed the first time or when Dockerfiles or source code that affects the image (like `requirements.txt` or `package.json`) changes. Subsequent starts can use `docker-compose up`.

3.  **Accessing Services**:
    *   **Frontend**: [http://localhost:5173/](http://localhost:5173/)
    *   **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

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
