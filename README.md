# MedExplain AI

MedExplain AI is a healthcare platform for helping patients understand medical reports through secure AI-assisted explanations, report history, appointments, doctor review, and consent-aware data handling.

**Owner:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**License:** Proprietary, not free to use. See [LICENSE.md](LICENSE.md).

---

## 📚 Documentation

**Start here:**
- **[SUMMARY.md](SUMMARY.md)** - Audit & implementation summary (start here!)
- **[SETUP.md](SETUP.md)** - Local development setup (5-15 minutes)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and patterns
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database design

---

## 🚀 Quick Start

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

# 5. Start development server
npm run dev

# 6. Access http://localhost:3000
```

For detailed setup instructions, see [SETUP.md](SETUP.md).

---

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot-reload
npm run build:css       # Compile Tailwind CSS
npm run build:css -- --watch  # Watch for CSS changes

# Testing
npm test                # Run all tests
npm run test:watch     # Watch mode
npm run test:integration  # Integration tests only

# Linting & Quality
npm run lint           # Check code with ESLint
npm run format         # Format with Prettier

# Database
npm run migrate        # Run database migrations
npm run seed          # Seed development data

# Verification
npm run smoke:frontend  # Verify frontend pages
```

---

## 🏗️ Architecture

**Frontend:** Vanilla JavaScript + Tailwind CSS + HTML5  
**Backend:** Node.js + Express.js + PostgreSQL  
**AI:** Google Gemini API  
**Auth:** JWT with refresh tokens  
**Security:** Helmet, CSRF protection, rate limiting, input sanitization

For complete architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🔒 Security & Compliance

- **Authentication:** JWT-based with secure refresh tokens
- **Authorization:** Role-based access control (Admin, Doctor, Patient)
- **Encryption:** Password hashing with bcryptjs
- **Validation:** Zod schema validation
- **Sanitization:** XSS protection with xss library
- **Rate Limiting:** 120 requests per 15 minutes per IP
- **Audit Logging:** Complete action trail
- **Compliance:** HIPAA-aware architecture

See [CONTRIBUTING.md](CONTRIBUTING.md) for security guidelines.

---

## 📦 Tech Stack

**Backend:**
- Node.js 18+
- Express.js 4.x
- PostgreSQL 12+
- JWT (jsonwebtoken)
- Bcryptjs
- Nodemailer
- Multer (file uploads)

**Frontend:**
- HTML5
- Tailwind CSS 3.x
- Vanilla JavaScript (ES6+)
- Fetch API

**External Services:**
- Google Generative AI (Gemini)

**Development Tools:**
- ESLint
- Prettier
- Vitest
- Nodemon

See [package.json](package.json) for complete dependency list.

---

## 🔄 Development Workflow

1. **Read documentation** - Understand architecture and patterns
2. **Setup environment** - Follow [SETUP.md](SETUP.md)
3. **Make changes** - Edit code following [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Test locally** - Run `npm test`
5. **Commit changes** - Use conventional commit format
6. **Push** - To feature branch
7. **Create PR** - Reference related issues

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📊 Project Status

- **Phase 1:** ✅ Foundation & Documentation Complete
- **Phase 2:** ⏳ Backend Enhancement
- **Phase 3:** ⏳ Frontend Standardization
- **Phase 4:** ⏳ Feature Completion
- **Phase 5:** ⏳ Testing & Deployment

Current completion: ~25%

---

## 🤝 Contributing

This is a proprietary project. Only authorized developers can contribute.

**Before contributing:**
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Follow code style and standards
4. Include comprehensive comments
5. Write tests for new features
6. Use conventional commit format

---

## 📄 License

MedExplain AI is **proprietary software** and is **not free to use**. See [LICENSE.md](LICENSE.md) for details.

**Copyright © 2026 Oluwayemi Oyinlola Michael**

All rights reserved. No part of this software may be used, copied, modified, or distributed without prior written permission.

---

## 🔗 Links

- **Creator Portfolio:** https://oyinlola.site
- **Documentation:** See `.md` files in this directory
- **License:** [LICENSE.md](LICENSE.md)

---

**Last Updated:** 2026-06-02  
**Maintained By:** Oluwayemi Oyinlola Michael
