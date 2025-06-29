FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python project files
COPY pyproject.toml poetry.lock ./

# Install Poetry
RUN pip install poetry

# Configure Poetry
RUN poetry config virtualenvs.create false

# Install Python dependencies
RUN poetry install --only=main --no-root

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Set Python path
ENV PYTHONPATH=/app/src/python_app

# Create health check endpoint script
RUN echo '#!/usr/bin/env python3\n\
import sys\n\
from http.server import HTTPServer, BaseHTTPRequestHandler\n\
import json\n\
\n\
class HealthHandler(BaseHTTPRequestHandler):\n\
    def do_GET(self):\n\
        if self.path == "/health":\n\
            self.send_response(200)\n\
            self.send_header("Content-type", "application/json")\n\
            self.end_headers()\n\
            response = {"status": "healthy", "service": "qynauth", "version": "0.2.0"}\n\
            self.wfile.write(json.dumps(response).encode())\n\
        else:\n\
            self.send_response(404)\n\
            self.end_headers()\n\
\n\
if __name__ == "__main__":\n\
    server = HTTPServer(("0.0.0.0", 8000), HealthHandler)\n\
    print("QynAuth service starting on port 8000...")\n\
    server.serve_forever()\n\
' > /app/health_server.py && chmod +x /app/health_server.py

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the service
CMD ["python3", "/app/health_server.py"]
