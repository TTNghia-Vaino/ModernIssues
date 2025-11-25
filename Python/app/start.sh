#!/bin/bash
source /var/www/modernissues/python/venv/bin/activate
cd /var/www/modernissues/python/app
exec uvicorn main:app --host 0.0.0.0 --port 8000