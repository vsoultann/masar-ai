# Backend image.
#
# The build context is the REPOSITORY ROOT, not backend/, because the API
# imports the shared feature schema from ml/ and reads the catalogs from data/.
# Build it with:  docker build -f backend/Dockerfile .
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first: this layer is cached unless requirements.txt changes.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Application code, the ML package and the catalogs.
COPY backend/ backend/
COPY ml/ ml/
COPY data/ data/

# Run as a non-root user. The SQLite file lives in backend/, so that directory
# has to be writable by it.
RUN useradd --create-home --uid 10001 masar \
    && chown -R masar:masar /app/backend
USER masar

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

# Render and Railway inject $PORT; default to 8000 for local use.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
