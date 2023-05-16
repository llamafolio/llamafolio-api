## Database

Create dev DB

```bash
echo "SELECT 'CREATE DATABASE llamafolio_dev' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'llamafolio_dev')\gexec" | psql
```

Create tables using `migrations/init.sql` file

Note: to start from a clean database, drop the whole `llamafolio_dev` database and run previous steps again.
