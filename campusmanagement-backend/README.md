# Campus Management – Backend (Django)

## Setup
```
cd campusmanagement-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py runserver
```

## Structure
- `config/` – project settings and main URLs
- `accounts/` – custom User model (AbstractUser + `role`), serializers, views, urls
- `data/` – SQL data (`Users.sql`)
- `manage.py` – Django command runner
- `db.sqlite3` – local database, created by `migrate` (not committed)
