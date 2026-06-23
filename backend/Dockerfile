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

# Create cache directory with read/write permissions for serverless execution
RUN mkdir -p /code/.cache && chmod -R 777 /code/.cache

# Copy application files
COPY . /code/

# Hugging Face Spaces requires the container to bind to port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
