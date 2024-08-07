cd apps/backend
poetry run gunicorn --config backend/gunicorn.config.py backend.server:app