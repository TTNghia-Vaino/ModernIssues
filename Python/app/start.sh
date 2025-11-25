#!/bin/bash
source /var/www/modernissues/Python/venv/bin/activate
cd /var/www/modernissues/Python/app
exec uvicorn main:app --host 0.0.0.0 --port 8000