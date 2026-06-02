# Contributing to MedExplain AI

**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**License:** Proprietary - See [LICENSE.md](LICENSE.md)  

---

## CONTRIBUTOR GUIDELINES

MedExplain AI is a proprietary healthcare platform. This document guides contributors in maintaining code quality, security, and consistency.

### General Rules

1. **Only authorized developers** can contribute to this repository
2. **Code ownership** belongs to Oluwayemi Oyinlola Michael
3. **All contributors** must sign the contributor agreement
4. **Code reviews** are mandatory before merging
5. **Security** is paramount - never hardcode secrets

---

## DEVELOPMENT SETUP

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git
- npm or yarn

### Local Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd health-ai

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your local values

# 4. Create database
createdb medexplain_ai

# 5. Run migrations
npm run migrate

# 6. Build CSS
npm run build:css

# 7. Start development server
npm run dev

# 8. Server running at http://localhost:3000
```

### First Run Checklist
- [ ] Dependencies installed without errors
- [ ] Database created and migrated
- [ ] CSS built successfully
- [ ] Server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can access API at http://localhost:3000/api

---

## CODE STYLE & STANDARDS

### JavaScript/Node.js

#### Comments
Every file should start with a header comment:

```javascript
/**
 * Module: [Module Name]
 * Description: [What this module does]
 * 
 * Author: Oluwayemi Oyinlola Michael
 * Portfolio: https://oyinlola.site
 * 
 * Responsibility: [Core responsibility]
 * 
 * @module [moduleName]
 */

/**
 * [Function description - what it does]
 * 
 * @param {type} paramName - [Description]
 * @param {type} optionalParam - [Description] (optional)
 * @returns {type} [Description of return value]
 * @throws {ErrorType} [When it throws and why]
 * 
 * @example
 * const result = functionName(param1, param2);
 * // result => { success: true }
 */
export async function functionName(param1, param2) {
  // Implementation
}
```

#### Naming Conventions
```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png'];

// Variables/Functions: camelCase
let currentUser = null;
function getUserById(id) { }

// Classes: PascalCase
class UserService { }

// Private methods: prefix with _
_validateEmail() { }

// Async functions: be explicit
async function fetchUser(id) { }
```

#### Code Organization
```javascript
// 1. Imports
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';

// 2. Constants
const SALT_ROUNDS = 12;

// 3. Helper functions
function publicUser(user) {
  return { id: user.id, email: user.email };
}

// 4. Main class/export
export const authService = {
  async register(data) {
    // Implementation
  }
};
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run lint

# Fix linting errors
npm run lint -- --fix
```

### HTML/CSS

#### HTML
- Use semantic HTML5 elements
- Include accessibility attributes (aria-*, role)
- Proper indentation (2 spaces)
- Comments for complex structures

#### CSS/Tailwind
- Use design system colors
- Mobile-first approach
- Responsive breakpoints: md: 768px, lg: 1024px
- Custom CSS only when needed
- Well-organized classes

---

## GIT WORKFLOW

### Branching

```
main (production)
└── feature/[feature-name]
    ├── feature/user-auth
    ├── feature/report-analysis
    └── feature/doctor-recruitment
```

### Commit Messages

**Format:**
```
[type]([scope]): [subject]

[body]

[footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Test additions
- `chore` - Build, deps, etc

**Examples:**
```
feat(auth): Add password reset functionality

- Implement password reset token generation
- Add email notification
- Add password reset validation

Closes #42

Co-authored-by: Oluwayemi Oyinlola Michael <oyinlola.site>
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

```
fix(report): Handle file upload errors gracefully

- Add proper error handling for large files
- Add user-friendly error messages
- Log errors for debugging

Fixes #35

Co-authored-by: Oluwayemi Oyinlola Michael <oyinlola.site>
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes**
   - Write code following standards
   - Add comments
   - Update tests if applicable

3. **Commit changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. **Push to remote**
   ```bash
   git push origin feature/your-feature
   ```

5. **Create pull request**
   - Clear title and description
   - Reference related issues
   - Explain changes made

6. **Code review**
   - Address feedback
   - Update code as needed
   - Re-request review

7. **Merge**
   - Squash or rebase as needed
   - Delete feature branch

---

## TESTING

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Test Structure

```javascript
/**
 * Test: [What is being tested]
 * Expected: [What should happen]
 * Actual: [What actually happens]
 */
describe('AuthService.login', () => {
  test('should return user and tokens on valid credentials', async () => {
    // Arrange
    const credentials = { email: 'user@example.com', password: 'correct' };
    
    // Act
    const result = await authService.login(credentials);
    
    // Assert
    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  test('should throw error on invalid email', async () => {
    // Arrange
    const credentials = { email: 'nonexistent@example.com', password: 'test' };
    
    // Act & Assert
    await expect(authService.login(credentials))
      .rejects.toThrow('Invalid email or password');
  });
});
```

---

## SECURITY GUIDELINES

### Secret Management
- ✅ Use `.env` for all secrets
- ✅ Add secrets to `.env.example` (without values)
- ❌ Never commit `.env` to repository
- ❌ Never log sensitive data
- ❌ Never hardcode API keys

### Input Validation
- Always validate user input
- Use Zod validators
- Sanitize output with xss library
- Validate file uploads (mime type, size)

### Database Security
- Use parameterized queries (automatic with pg)
- Never concatenate SQL strings
- Use UUIDs for primary keys
- Implement soft deletes where appropriate

### Error Handling
- Don't expose internal errors to users
- Log full errors internally
- Return generic error messages to frontend
- Never expose database structure in errors

---

## PERFORMANCE GUIDELINES

### Database
- Add indexes on frequently queried columns
- Use pagination for list endpoints
- Avoid N+1 queries
- Use connection pooling

### Frontend
- Minimize HTTP requests
- Use efficient DOM methods
- Lazy load images
- Cache API responses appropriately

### Caching
- Cache non-sensitive data
- Set appropriate TTLs
- Invalidate cache on updates

---

## CODE REVIEW CHECKLIST

Before reviewing code, check:

- [ ] Follows code style and standards
- [ ] Has comprehensive comments
- [ ] All tests pass
- [ ] No console.log or debugging code
- [ ] No hardcoded values
- [ ] No security vulnerabilities
- [ ] Error handling is present
- [ ] Database migrations are safe
- [ ] API changes are documented
- [ ] Breaking changes are clearly marked

---

## DOCUMENTATION

### When to Document

1. **New Features**
   - Update relevant .md files
   - Add API documentation
   - Add code comments

2. **Bug Fixes**
   - Document what was broken
   - Explain the fix
   - Add test case

3. **Architecture Changes**
   - Update ARCHITECTURE.md
   - Explain tradeoffs
   - Document new patterns

4. **Database Changes**
   - Update migrations
   - Document schema changes
   - Update DATABASE_SCHEMA.md

### Documentation Format

```markdown
## Feature Name

**Author:** Your Name
**Date:** YYYY-MM-DD
**Status:** [Active | Deprecated | Experimental]

### Description
What does this do?

### Usage
How to use it?

### Example
Code example

### Related
Links to related docs
```

---

## TROUBLESHOOTING

### Common Issues

**Port 3000 already in use**
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Database connection error**
```bash
# Check if PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL in .env
# Format: postgres://user:pass@localhost:5432/medexplain_ai
```

**CSS not compiling**
```bash
npm run build:css
```

**Dependencies conflict**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## GETTING HELP

1. Check existing documentation in `/docs`
2. Review ARCHITECTURE.md for system design
3. Look at similar implementations
4. Ask the project maintainer
5. Check git history for context

---

## CONTRIBUTOR AGREEMENT

By contributing to MedExplain AI, you agree:

1. Your contributions become part of the proprietary codebase
2. You assign all rights to Oluwayemi Oyinlola Michael
3. You will not use the code for competing products
4. You understand the software is medical-related and impacts health

---

**Last Updated:** 2026-06-02  
**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site
