FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install dependencies
# First copy only requirements to leverage Docker cache
COPY packages/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code into the container
# The source path here is relative to the build context defined in docker-compose.yml, which is the repo root.
COPY packages/backend/ /app/

# Expose port
EXPOSE 8000

# Command to run
# Ensure main.py is in the WORKDIR (/app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
