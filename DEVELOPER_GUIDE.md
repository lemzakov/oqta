# OQTA Admin Panel - Developer Guide

## Quick Start for Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/oqta?schema=public"
ADMIN_EMAIL="admin@oqta.ai"
ADMIN_PASSWORD="your-password"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV="development"
```

### 3. Set Up Database

If you don't have PostgreSQL installed locally, you can use Docker:

```bash
docker run --name oqta-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=oqta -p 5432:5432 -d postgres:15
```

Then update your `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/oqta?schema=public"
```

### 4. Generate Prisma Client and Run Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 5. Run the Development Server

```bash
npm run dev
```

The application will start on http://localhost:3000

### 6. Access the Application

- **Public Chat Interface**: http://localhost:3000/
- **Admin Panel**: http://localhost:3000/admin

Login with the credentials from your `.env` file.

## Project Structure

```
oqta/
├── admin/                  # Admin panel frontend
│   ├── css/
│   │   └── admin.css      # Admin panel styles
│   ├── js/
│   │   └── admin.js       # Admin panel JavaScript
│   └── index.html         # Admin panel HTML
├── assets/                # Public assets (logos, images)
├── prisma/
│   ├── migrations/        # Database migrations
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seed script
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── authController.ts
│   │   ├── chatController.ts
│   │   ├── conversationsController.ts
│   │   ├── dashboardController.ts
│   │   ├── knowledgeController.ts
│   │   └── settingsController.ts
│   ├── middleware/        # Express middleware
│   │   └── auth.ts       # JWT authentication
│   ├── routes/           # API routes
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── conversations.ts
│   │   ├── dashboard.ts
│   │   ├── knowledge.ts
│   │   └── settings.ts
│   ├── utils/
│   │   └── prisma.ts     # Prisma client instance
│   └── server.ts         # Express server setup
├── dist/                 # Compiled TypeScript (generated)
├── index.html            # Public chat interface
├── script.js            # Public chat JavaScript
├── styles.css           # Public chat styles
└── package.json

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/verify` - Verify JWT token

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Conversations
- `GET /api/conversations/sessions` - List all sessions (paginated)
- `GET /api/conversations/sessions/:sessionId` - Get session details with messages

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update multiple settings
- `PUT /api/settings/:key` - Update a single setting

### Knowledge Base (Qdrant)
- `GET /api/knowledge/documents` - List documents from Qdrant
- `POST /api/knowledge/documents` - Upload a document to Qdrant
- `DELETE /api/knowledge/documents/:id` - Delete a document

### Chat (Public)
- `POST /api/chat/message` - Save a chat message to database

## Database Schema

### AdminUser
- `id` - UUID
- `email` - Unique email
- `password` - Bcrypt hashed password
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

### Session
- `id` - UUID
- `userId` - Optional user ID
- `userEmail` - Optional user email
- `userName` - Optional user name
- `startedAt` - Session start timestamp
- `lastMessageAt` - Last message timestamp

### ChatHistory
- `id` - UUID
- `sessionId` - Foreign key to Session
- `type` - Message type (user, ai)
- `content` - Message content
- `toolCalls` - JSON array
- `additionalKwargs` - JSON object
- `responseMetadata` - JSON object
- `invalidToolCalls` - JSON array
- `createdAt` - Timestamp

### Setting
- `id` - UUID
- `key` - Unique setting key
- `value` - Setting value
- `updatedAt` - Timestamp

### Invoice
- `id` - UUID
- `amount` - Decimal
- `status` - String (pending, paid, in_progress)
- `createdAt` - Timestamp
- `paidAt` - Optional timestamp

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Generate Prisma client
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Making Changes

### Adding a New API Endpoint

1. Create a controller in `src/controllers/`
2. Create a route in `src/routes/`
3. Register the route in `src/server.ts`

Example:
```typescript
// src/controllers/exampleController.ts
import { Request, Response } from 'express';

export const getExample = async (req: Request, res: Response) => {
  res.json({ message: 'Hello!' });
};

// src/routes/example.ts
import { Router } from 'express';
import { getExample } from '../controllers/exampleController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.get('/', authenticateToken, getExample);
export default router;

// src/server.ts
import exampleRoutes from './routes/example';
app.use('/api/example', exampleRoutes);
```

### Modifying the Database Schema

1. Edit `prisma/schema.prisma`
2. Create a migration:
```bash
npx prisma migrate dev --name describe_your_changes
```
3. The Prisma client will be regenerated automatically

### Adding Frontend Features

For the admin panel:
- Edit `admin/index.html` for structure
- Edit `admin/css/admin.css` for styling
- Edit `admin/js/admin.js` for functionality

For the public chat:
- Edit `index.html` for structure
- Edit `styles.css` for styling
- Edit `script.js` for functionality

## Testing

### Manual Testing

1. **Test Admin Login**:
   - Go to http://localhost:3000/admin
   - Login with your admin credentials

2. **Test Dashboard**:
   - Check that statistics load correctly
   - Try each navigation menu item

3. **Test Conversations**:
   - Create a conversation from the public chat
   - Verify it appears in the admin panel
   - Click to view messages

4. **Test Knowledge Base**:
   - Upload a document
   - Verify it appears in the list
   - Delete a document

5. **Test Settings**:
   - Update settings
   - Verify they persist after refresh

### Database Testing

Use Prisma Studio to inspect your database:
```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Database Connection Failed
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Test connection: `psql $DATABASE_URL`

### Prisma Client Not Found
```bash
npm run prisma:generate
```

### TypeScript Errors
```bash
# Clean build
rm -rf dist/
npm run build
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or fix migrations manually
npx prisma migrate resolve
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection string | - | Yes |
| ADMIN_EMAIL | Admin user email | admin@oqta.ai | Yes |
| ADMIN_PASSWORD | Admin user password | - | Yes |
| JWT_SECRET | Secret for JWT signing | - | Yes |
| PORT | Server port | 3000 | No |
| NODE_ENV | Environment (development/production) | development | No |
| QDRANT_URL | Qdrant instance URL | - | Yes |
| QDRANT_API_KEY | Qdrant API key | - | Yes |
| QDRANT_COLLECTION | Qdrant collection name | oqta | No |

## Security Best Practices

1. **Never commit `.env` file** - It's in .gitignore
2. **Use strong passwords** for admin accounts
3. **Use a random JWT secret** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Enable HTTPS in production**
5. **Keep dependencies updated**: `npm audit fix`

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Create a pull request

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
