# MedExplain AI - Local Setup Guide

**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**Last Updated:** 2026-06-02

---

## QUICK START (5 minutes)

```bash
# 1. Clone and install
git clone <repository-url>
cd health-ai
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your values

# 3. Create database
createdb medexplain_ai

# 4. Initialize
npm run migrate
npm run build:css

# 5. Start
npm run dev

# 6. Access: http://localhost:3000
```

---

## DETAILED SETUP

### Prerequisites

**System Requirements:**
- macOS 10.15+, Windows 10+, or Linux (Ubuntu 18.04+)
- 4GB RAM minimum
- 2GB disk space minimum

**Software Requirements:**
- Node.js 18.0.0 or higher
  - Download: https://nodejs.org/
  - Verify: `node --version && npm --version`

- PostgreSQL 12 or higher
  - macOS: `brew install postgresql`
  - Windows: https://www.postgresql.org/download/windows/
  - Linux: `sudo apt-get install postgresql-12`

- Git
  - macOS: `brew install git`
  - Windows: https://git-scm.com/download/win
  - Linux: `sudo apt-get install git`

### Step 1: Clone Repository

```bash
git clone https://github.com/oyinlola-tech/health-ai.git
cd health-ai
```

### Step 2: Install Dependencies

```bash
# Install all npm dependencies
npm install

# Should complete without errors
# Check: npm list should show dependency tree
```

### Step 3: Configure Environment

```bash
# Copy example environment
cp .env.example .env

# Edit .env and set values
nano .env  # or use your favorite editor

# Required values to set:
# - NODE_ENV=development
# - PORT=3000
# - DATABASE_URL=postgres://postgres:password@localhost:5432/medexplain_ai
# - JWT_ACCESS_SECRET=your-secret-key-here
# - JWT_REFRESH_SECRET=your-secret-key-here
# - GEMINI_API_KEY=your-gemini-api-key
```

**Getting Secrets:**
- `JWT_ACCESS_SECRET`: Generate 32+ character random string
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `JWT_REFRESH_SECRET`: Generate another 32+ character string
- `GEMINI_API_KEY`: Get from Google AI Studio (https://aistudio.google.com)

### Step 4: Setup Database

```bash
# Create database (as postgres user)
createdb medexplain_ai

# Or with password:
createdb -U postgres medexplain_ai
# Enter password when prompted

# Verify connection
psql -U postgres -d medexplain_ai -c "SELECT version();"
```

### Step 5: Run Migrations

```bash
# Create all tables
npm run migrate

# Should output: Database connection verified and migrations applied
```

### Step 6: Build CSS

```bash
# Compile Tailwind CSS
npm run build:css

# Should output: public/assets/css/styles.css updated
```

### Step 7: Start Development Server

```bash
# Start with hot-reload
npm run dev

# Server output should show:
# MedExplain AI listening. { port: 3000, environment: 'development' }
```

### Step 8: Verify Installation

Open http://localhost:3000 in browser:
- ✅ Should load splash page
- ✅ Navigation should work
- ✅ CSS should be styled
- ✅ Console should have no errors

Test API:
```bash
# Get CSRF token
curl http://localhost:3000/api/auth/csrf

# Should return: { "success": true, "data": { "csrfToken": "..." } }
```

---

## DEVELOPMENT WORKFLOW

### Starting Development

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Watch CSS changes (if modifying Tailwind)
npm run build:css -- --watch

# Terminal 3: Run tests (optional)
npm run test:watch
```

### File Structure

```
health-ai/
├── public/              # Frontend - served as static files
│   ├── auth/           # Authentication pages
│   ├── app/            # Patient app pages
│   ├── admin/          # Admin dashboard
│   ├── assets/         # CSS, JS, images
│   └── [other modules]/
├── src/                # Backend - Node.js/Express
│   ├── app.js          # Express app setup
│   ├── server.js       # Server startup
│   ├── config/         # Configuration files
│   ├── controllers/    # API endpoint handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Data access
│   ├── routes/         # API routes
│   ├── middlewares/    # Express middlewares
│   ├── migrations/     # Database schema
│   └── [other folders]/
├── .env                # Environment variables (DO NOT COMMIT)
├── .env.example        # Environment template (COMMIT THIS)
├── package.json        # Dependencies
├── tailwind.config.js  # Tailwind CSS config
└── README.md           # Project README
```

### Making Changes

**Frontend Changes:**
1. Edit HTML in `public/*/page.html`
2. Edit JavaScript in `public/*/js/page.js` or `js/api.js`
3. Styles: Use Tailwind classes, rarely need custom CSS
4. Rebuild CSS if adding new Tailwind utilities: `npm run build:css`

**Backend Changes:**
1. Edit files in `src/`
2. Server auto-restarts (nodemon watches files)
3. Run tests: `npm test` or `npm run test:watch`

**Database Changes:**
1. Create migration in `src/migrations/`
2. Run: `npm run migrate`
3. Test with data: `npm run seed` (if available)

### Debugging

**Debug Mode:**
```bash
# Run with debugging enabled
DEBUG=* npm run dev

# Or specific module
DEBUG=medexplain:* npm run dev
```

**Browser DevTools:**
- Open DevTools: F12 or Cmd+Opt+I
- Network tab: Check API requests
- Console: View JavaScript errors
- Application tab: Check cookies, localStorage

**Database Debugging:**
```bash
# Connect to database directly
psql medexplain_ai

# Useful commands:
\dt              # List all tables
\d users         # Describe users table
SELECT * FROM users LIMIT 5;  # Query data
```

---

## COMMON TASKS

### Creating a New API Endpoint

1. **Create Route Handler (Controller)**
   ```javascript
   // src/controllers/exampleController.js
   export const exampleController = {
     async handleAction(req, res) {
       const result = await exampleService.action(req.body);
       return sendSuccess(res, result);
     }
   };
   ```

2. **Create Route**
   ```javascript
   // src/routes/exampleRoutes.js
   import { Router } from 'express';
   import { exampleController } from '../controllers/exampleController.js';
   import { requireAuth } from '../middlewares/auth.js';

   export const exampleRoutes = Router();
   exampleRoutes.post('/action', requireAuth, exampleController.handleAction);
   ```

3. **Register Route in Index**
   ```javascript
   // src/routes/index.js
   import { exampleRoutes } from './exampleRoutes.js';
   export const apiRoutes = Router();
   apiRoutes.use('/example', exampleRoutes);
   ```

4. **Test**
   ```bash
   curl -X POST http://localhost:3000/api/example/action \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"data": "value"}'
   ```

### Creating a New Frontend Page

1. **Create HTML**
   ```html
   <!-- public/module/page.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Page Title</title>
     <link rel="stylesheet" href="/assets/css/styles.css">
   </head>
   <body>
     <!-- Content -->
     <script type="module" src="./js/page.js"></script>
   </body>
   </html>
   ```

2. **Create Page Module**
   ```javascript
   // public/module/js/page.js
   import { PageAPI } from './api.js';

   export class PageModule {
     constructor() {
       this.state = {};
       this.ui = {};
     }

     async init() {
       this.cacheDOM();
       this.bindEvents();
       await this.loadData();
     }

     cacheDOM() {
       this.ui.container = document.querySelector('[data-page-container]');
     }

     bindEvents() {
       // Attach event listeners
     }

     async loadData() {
       try {
         this.state.data = await PageAPI.fetchData();
         this.render();
       } catch (error) {
         this.showError(error);
       }
     }

     render() {
       // Update DOM
     }

     showError(error) {
       console.error('Error:', error);
     }
   }

   // Initialize on page load
   const page = new PageModule();
   document.addEventListener('DOMContentLoaded', () => page.init());
   ```

3. **Create API Module**
   ```javascript
   // public/module/js/api.js
   export class PageAPI {
     static async fetchData(params) {
       const response = await fetch('/api/endpoint', {
         headers: {
           'Authorization': `Bearer ${this.getAccessToken()}`
         }
       });
       return this.handleResponse(response);
     }

     static async handleResponse(response) {
       const data = await response.json();
       if (!response.ok) throw new Error(data.error?.message);
       return data.data;
     }

     static getAccessToken() {
       return localStorage.getItem('access_token');
     }
   }
   ```

### Adding a Database Migration

```javascript
// src/migrations/002_add_feature.sql
-- Migrations auto-run on server start

ALTER TABLE users ADD COLUMN new_field TEXT;

-- Always provide rollback comment:
-- Rollback: ALTER TABLE users DROP COLUMN new_field;
```

---

## STOPPING THE SERVER

```bash
# Stop development server: Ctrl+C in terminal

# Or stop specific process:
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## TROUBLESHOOTING

### Database Connection Error
```
Error: ECONNREFUSED - PostgreSQL not running
```

**Solution:**
```bash
# macOS
brew services start postgresql

# Windows
pg_ctl -D "C:\Program Files\PostgreSQL\12\data" start

# Linux
sudo systemctl start postgresql
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill it
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found
```
Error: Cannot find module './file.js'
```

**Solution:**
- Check file exists and path is correct
- Extensions matter: use `.js` for modules
- Check working directory is project root

### CSS Not Compiling
```
Error: Tailwind CSS not found
```

**Solution:**
```bash
npm run build:css
```

### npm Dependencies Issue
```
Error: npm ERR! peer dep missing
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## NEXT STEPS

1. ✅ Development environment working
2. Read [ARCHITECTURE.md](../ARCHITECTURE.md) to understand system design
3. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
4. Read [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) for data model
5. Start building features!

---

## SUPPORT

- **Documentation**: Read the `.md` files in this directory
- **Git History**: `git log --oneline` shows past changes
- **Similar Code**: Look for existing examples in codebase
- **Questions**: Review CONTRIBUTING.md troubleshooting section

---

**Last Updated:** 2026-06-02  
**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site
