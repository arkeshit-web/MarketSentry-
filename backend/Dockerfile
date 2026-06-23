FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV HF_HOME /code/.cache

WORKDIR /code

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . /code/

# Create cache directory and database file, then set permissions for non-root user (UID 1000)
RUN mkdir -p /code/.cache && \
    touch /code/marketsentry.db && \
    chmod -R 777 /code && \
    chown -R 1000:1000 /code

# Run as non-root user 1000
USER 1000

# Hugging Face Spaces requires the container to bind to port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
