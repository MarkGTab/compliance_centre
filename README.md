# Compliance Centre

TAB's risk & compliance app, migrating off Base44 onto our own stack. See
[`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) for the plan and the decisions log.

| Path | What |
|---|---|
| `app/`, `config/`, `database/`, `routes/` | Laravel backend (API, jobs, notifications) |
| `frontend/` | React app from the Base44 export, being moved off `@base44/sdk` onto `/api` |
| `legacy/base44/` | The original Base44 entities, functions and workflows, kept as the porting spec. Not deployed |
| `safe-fiery-guard-flow.zip` | The original Base44 export |

## Database rules

The app has its own `compliance` schema for its `cc_*` tables, and **only adds tables and fields**.
It never alters or drops anything that already exists. Staff, departments and documents come from
the existing `tab_employees`, departments and `doc_store` tables (`config/compliance.php`).

## Local setup

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
cd frontend && npm install && npm run dev
```
