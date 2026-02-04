# OQTA Deployment Guide

## Quick Start

### 1. Prerequisites

Ensure you have the following installed:
- Node.js v18 or higher
- PostgreSQL database
- npm or yarn

### 2. Clone and Install

```bash
git clone <repository-url>
cd oqta
npm install
```

### 3. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and set the following required values:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/oqta?schema=public"

# Admin Credentials - Set your own secure credentials
ADMIN_EMAIL="admin@oqta.ai"
ADMIN_PASSWORD="your-secure-password-here"

# JWT Secret - Generate a random secret key
JWT_SECRET="your-random-jwt-secret-key"

# Server Configuration
PORT=3000
NODE_ENV="production"

# Qdrant Configuration (already set, but can be changed)
QDRANT_URL="https://b8d81ce7-04a7-433a-babc-1f8951f2ec8e.europe-west3-0.gcp.cloud.qdrant.io"
QDRANT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOlt7ImNvbGxlY3Rpb24iOiJvcXRhIiwiYWNjZXNzIjoicncifV19.QWXHTz2ZN5EmB_OmUosSI3LXj4vV2V0_B1WGXgTjQ2M"
QDRANT_COLLECTION="oqta"
```

### 4. Set Up Database

Generate Prisma client:
```bash
npm run prisma:generate
```

Run migrations to create database tables:
```bash
npm run prisma:migrate
```

(Optional) Seed initial data:
```bash
npm run prisma:seed
```

### 5. Build and Run

For production:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

### 6. Access the Application

- **Public Chat**: `http://localhost:3000/`
- **Admin Panel**: `http://localhost:3000/admin`

## Deployment Options

### Option 1: Deploy to a VPS (Recommended)

1. **Prepare the server:**
   ```bash
   # Install Node.js, PostgreSQL, and Nginx
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs postgresql nginx
   ```

2. **Set up PostgreSQL:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE oqta;
   CREATE USER oqtauser WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE oqta TO oqtauser;
   \q
   ```

3. **Clone and configure:**
   ```bash
   cd /var/www
   git clone <repository-url> oqta
   cd oqta
   npm install
   cp .env.example .env
   # Edit .env with your values
   nano .env
   ```

4. **Run migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Build the application:**
   ```bash
   npm run build
   ```

6. **Set up PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name oqta
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable SSL with Let's Encrypt (optional but recommended):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 2: Deploy to Vercel (Frontend + Serverless Functions)

Note: This requires adapting the Express server to Vercel's serverless function format.

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "src/server.ts", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "src/server.ts" }
     ]
   }
   ```

3. Deploy:
   ```bash
   vercel
   ```

### Option 3: Deploy to Railway.app

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add PostgreSQL service from Railway marketplace
4. Set environment variables in Railway dashboard
5. Deploy automatically on push

### Option 4: Deploy to Heroku

1. Create a Heroku app:
   ```bash
   heroku create oqta-app
   ```

2. Add PostgreSQL:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. Set environment variables:
   ```bash
   heroku config:set ADMIN_EMAIL=admin@oqta.ai
   heroku config:set ADMIN_PASSWORD=your-password
   heroku config:set JWT_SECRET=your-secret
   # ... set other env vars
   ```

4. Create `Procfile`:
   ```
   web: npm start
   release: npx prisma migrate deploy
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

## Database Management

### Creating a backup:
```bash
pg_dump -U username -d oqta > backup.sql
```

### Restoring from backup:
```bash
psql -U username -d oqta < backup.sql
```

### Viewing database:
```bash
npx prisma studio
```

## Monitoring and Logs

### Using PM2 (VPS):
```bash
pm2 logs oqta          # View logs
pm2 monit              # Monitor resources
pm2 restart oqta       # Restart application
pm2 stop oqta          # Stop application
```

## Troubleshooting

### Database connection issues:
1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is running: `sudo systemctl status postgresql`
3. Test connection: `psql $DATABASE_URL`

### Port already in use:
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Prisma client not generated:
```bash
npm run prisma:generate
```

### Migration issues:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name fix_schema
```

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Secure PostgreSQL (change default password, restrict access)
- [ ] Set up firewall rules
- [ ] Regular backups
- [ ] Keep dependencies updated

## Updates and Maintenance

### Updating the application:
```bash
git pull
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
pm2 restart oqta
```

### Checking for security vulnerabilities:
```bash
npm audit
npm audit fix
```

## Support

For issues or questions:
1. Check logs: `pm2 logs oqta` or `heroku logs --tail`
2. Review environment variables
3. Check database connection
4. Verify Qdrant connectivity

## Architecture Overview

```
┌─────────────────┐
│  Public Users   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Frontend       │──────▶│  n8n Webhook │
│  (Static HTML)  │      └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │
│  - Auth         │
│  - Dashboard    │
│  - Conversations│
│  - Settings     │
│  - Knowledge    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│PostgreSQL│ │  Qdrant  │
└─────────┘ └──────────┘
```
