# MedExplain AI - Complete Architecture Guide

**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**License:** Proprietary - See [LICENSE.md](../LICENSE.md)  
**Date:** 2026-06-02

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Data Flow](#data-flow)
10. [Component Interactions](#component-interactions)

---

## SYSTEM OVERVIEW

MedExplain AI is a healthcare platform that empowers patients to understand their medical reports through AI-powered analysis. Doctors can securely review reports and provide consultations. Administrators manage the system, recruit doctors, and monitor compliance.

### Core Features
- **Medical Report Analysis**: Upload and analyze medical reports using Google Gemini AI
- **AI Chat**: Real-time chat with AI about medical reports
- **Appointment Management**: Schedule and manage doctor consultations
- **Doctor Recruitment**: Recruitment workflow with credential verification
- **Health History**: Track personal health records and medical history
- **Audit Logging**: Complete audit trail for compliance
- **Role-Based Access**: Three distinct roles with specific permissions

### Key Principles
- **Patient Privacy**: End-to-end encrypted data handling
- **Medical Compliance**: HIPAA-aware architecture
- **Consent-Driven**: Users control their data and AI learning
- **Transparency**: Clear disclosure of AI limitations
- **Security**: Multiple layers of security protection

---

## ARCHITECTURE LAYERS

### 1. **Presentation Layer** (Frontend)
```
public/
├── auth/              → Authentication UI
├── app/               → Patient dashboard & features
├── ai-assistant/      → AI chat interface
├── admin/             → Admin dashboard
├── consultation/      → Appointment management
├── health/            → Health history
├── assets/            → Shared resources
│   ├── js/            → Shared utilities
│   ├── css/           → Tailwind styles
│   └── brand/         → Logo, favicon
└── [other modules]
```

**Pattern**: Each module has:
- `page.html` - User interface
- `js/page.js` - State management & UI behavior
- `js/api.js` - API communication

### 2. **API Layer** (Controllers)
```
src/controllers/
├── authController.js
├── adminController.js
├── appointmentController.js
├── aiController.js
├── reportController.js
├── doctorController.js
├── healthController.js
├── legalController.js
├── meController.js
├── notificationController.js
├── recruitmentController.js
└── [more controllers]
```

**Responsibility**: Route handlers that receive requests and send responses

### 3. **Business Logic Layer** (Services)
```
src/services/
├── authService.js
├── userService.js
├── reportService.js
├── aiService.js
├── appointmentService.js
├── recruitmentService.js
├── emailService.js
├── tokenService.js
└── [more services]
```

**Responsibility**: Core business logic, orchestration, transactions

### 4. **Data Access Layer** (Repositories)
```
src/repositories/
├── userRepository.js
├── adminRepository.js
├── appointmentRepository.js
├── aiRepository.js
├── reportRepository.js
├── auditRepository.js
├── healthRepository.js
├── legalRepository.js
├── notificationRepository.js
├── recruitmentRepository.js
```

**Responsibility**: Database queries and transactions

### 5. **Middleware Layer**
```
src/middlewares/
├── auth.js            → Authentication verification
├── csrf.js            → CSRF token handling
├── errorMiddleware.js → Error handling
├── rateLimit.js       → Rate limiting
├── sanitize.js        → Input sanitization
├── upload.js          → File upload handling
├── validate.js        → Request validation
└── audit.js           → Audit logging
```

**Responsibility**: Cross-cutting concerns

### 6. **Infrastructure Layer**
```
src/
├── config/            → Environment & database config
├── database/          → Database operations
├── migrations/        → Database schema versions
├── utils/             → Helper utilities
├── validators/        → Input validation schemas
└── jobs/              → Background jobs
```

---

## TECHNOLOGY STACK

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 12+
- **ORM/Query**: pg (native driver)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: Zod
- **Security**: Helmet, express-rate-limit, xss
- **UUID**: uuid v7 support

### Frontend
- **Markup**: HTML5
- **Styling**: Tailwind CSS 3.x
- **JavaScript**: Vanilla ES6+
- **HTTP Client**: Fetch API
- **Authentication**: JWT in localStorage
- **State Management**: In-memory (Page module pattern)

### AI/External Services
- **AI Engine**: Google Generative AI (Gemini)
- **Model**: gemini-1.5-flash

### Development Tools
- **Linting**: ESLint 9.x
- **Formatting**: Prettier 3.x
- **Testing**: Vitest
- **Build**: Tailwind CSS CLI

---

## DATABASE DESIGN

### Core Tables

#### Users
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('Admin', 'Doctor', 'Patient')),
  status TEXT CHECK (status IN ('active', 'pending', 'disabled')),
  email_verified_at TIMESTAMPTZ,
  consent_prompt_learning BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
)
```

**Relationships**:
- 1 User → Many Reports
- 1 Doctor → Many Appointments
- 1 Patient → Many Appointments
- 1 User → Many AI Interactions

#### Doctor Profiles
```sql
doctor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  specialty TEXT,
  license_number TEXT,
  credentials_status TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Reports
```sql
reports (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  uploaded_by UUID REFERENCES users(id),
  title TEXT,
  file_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed', 'archived')),
  summary TEXT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
)
```

#### AI Interactions
```sql
ai_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  report_id UUID REFERENCES reports(id),
  type TEXT CHECK (type IN ('report_analysis', 'chat', 'feedback')),
  prompt TEXT,
  response TEXT,
  model TEXT,
  feedback_rating INTEGER,
  feedback_comment TEXT,
  used_for_learning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Key Design Principles
- **UUID Primary Keys**: No sequential ID exposure
- **Soft Deletes**: deleted_at timestamps for data recovery
- **Audit Trail**: All changes logged
- **Relationships**: Proper foreign keys with cascade rules
- **Indexes**: Performance optimization on frequently queried columns
- **JSONB Storage**: Flexible metadata without schema changes

---

## API DESIGN

### Base URL
```
http://localhost:3000/api
```

### Authentication
- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Refresh**: POST `/auth/refresh` with refresh cookie
- **Logout**: POST `/auth/logout`

### Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null,
  "message": "Operation successful"
}
```

### Error Format
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* additional info */ }
  }
}
```

### API Routes

#### Authentication
- `POST /auth/register` - Register as patient
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/request-password-reset` - Request reset link
- `POST /auth/reset-password` - Reset password with token

#### Users (Me)
- `GET /me` - Current user profile
- `PUT /me` - Update profile
- `PUT /me/consent` - Update AI consent
- `DELETE /me` - Delete account

#### Reports
- `GET /reports` - List my reports
- `POST /reports/upload` - Upload report
- `GET /reports/{id}` - Get report details
- `DELETE /reports/{id}` - Delete report

#### AI
- `POST /ai/analyze` - Analyze report
- `POST /ai/chat` - Chat with AI
- `GET /ai/conversations` - Get conversations
- `POST /ai/feedback` - Submit feedback

#### Appointments
- `GET /appointments` - List my appointments
- `POST /appointments` - Book appointment
- `PUT /appointments/{id}` - Update appointment
- `DELETE /appointments/{id}` - Cancel appointment

---

## FRONTEND ARCHITECTURE

### Module Pattern

Each frontend module follows a consistent structure:

```
module/
├── index.html              # Main page template
└── js/
    ├── page.js            # UI state & behavior
    └── api.js             # API communication
```

### Page Module Pattern

```javascript
export class PageModule {
  constructor() {
    this.state = { /* initial state */ };
    this.ui = { /* cached DOM elements */ };
  }

  async init() {
    this.cacheDOM();
    this.bindEvents();
    await this.loadData();
  }

  cacheDOM() {
    /* Store DOM element references */
    this.ui.form = document.querySelector('form');
    this.ui.submitBtn = document.querySelector('[data-action="submit"]');
  }

  bindEvents() {
    /* Attach event listeners */
    this.ui.form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async loadData() {
    /* Fetch data from API */
    try {
      this.state.data = await PageAPI.fetchData();
      this.render();
    } catch (error) {
      this.showError(error);
    }
  }

  render() {
    /* Update DOM with state */
    this.updateUI();
  }

  showLoading() { /* Display loading state */ }
  showError(error) { /* Display error state */ }
  showSuccess(message) { /* Display success state */ }
  cleanup() { /* Cleanup */ }
}
```

### API Module Pattern

```javascript
export class PageAPI {
  static async fetchData(params) {
    const response = await fetch('/api/endpoint', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
      'Authorization': `Bearer ${getAccessToken()}`
    };
  }

  static async handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }
    return data.data;
  }

  static async handleError(error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Design System Implementation

**Colors** (Wellness Coral):
```css
--primary: #2B2724;      /* Dark Charcoal */
--secondary: #A19890;    /* Warm Gray */
--accent: #FF6E5C;       /* Coral */
--light: #FDF6F3;        /* Off-white */
--white: #FFFFFF;        /* Pure white */
```

**Typography**:
```css
--font-serif: 'Spectral', serif;     /* Headings */
--font-sans: 'Inter', sans-serif;    /* Body */
```

**Component Examples**:
- Buttons: Coral background (#FF6E5C) with white text
- Forms: Light background (#FDF6F3) with dark text
- Cards: White background with subtle shadow
- Headers: Dark charcoal (#2B2724) with coral accents
- Mobile Nav: Bottom bar with coral active states

---

## SECURITY ARCHITECTURE

### Security Layers

1. **Transport Security**
   - HTTPS in production
   - Secure cookie flags (httpOnly, sameSite, secure)

2. **Application Security**
   - Helmet.js for HTTP headers
   - CSRF token validation
   - Input sanitization (xss library)

3. **Authentication & Authorization**
   - JWT with short expiration (15 minutes)
   - Refresh tokens with longer expiration (30 days)
   - Role-based access control
   - Permission validation

4. **Data Protection**
   - Password hashing (bcryptjs)
   - Environment secrets management
   - No hardcoded values
   - Audit logging

5. **API Security**
   - Rate limiting
   - Request validation
   - Error sanitization
   - CORS policy

### Compliance

- **HIPAA-Aware**: Patient data handling
- **GDPR-Ready**: Consent management, data deletion
- **Medical Disclaimer**: Legal requirements
- **Audit Trail**: Complete action logging

---

## DEPLOYMENT ARCHITECTURE

### Local Development
```
http://localhost:3000
├── Frontend: /public (static)
└── API: /api
```

### Production (Namecheap VPS)

```
medexplain.site (Domain)
├── Node.js App (Port 3000)
├── PostgreSQL (Port 5432)
├── Nginx (Reverse Proxy)
├── SSL Certificate (Let's Encrypt)
└── Backups (Automated)
```

### Environment Configuration
```
.env (production secrets)
├── DATABASE_URL
├── JWT_ACCESS_SECRET
├── JWT_REFRESH_SECRET
├── GEMINI_API_KEY
└── [other secrets]
```

---

## DATA FLOW

### Report Analysis Flow
```
1. Patient uploads report
   ↓
2. File validated & stored
   ↓
3. OCR/extraction (if applicable)
   ↓
4. Send to Gemini API
   ↓
5. Receive analysis
   ↓
6. Store in database
   ↓
7. Display to patient
```

### Chat Interaction Flow
```
1. Patient sends message
   ↓
2. Message validated
   ↓
3. Retrieve conversation history
   ↓
4. Send to Gemini with context
   ↓
5. Receive response
   ↓
6. Store interaction
   ↓
7. Update chat UI
```

### Doctor Recruitment Flow
```
1. Admin creates job posting
   ↓
2. Doctor applies with docs
   ↓
3. Admin reviews application
   ↓
4. Admin approves/rejects
   ↓
5. System creates doctor account
   ↓
6. Generate & send credentials
   ↓
7. Doctor logs in & sets password
```

---

## COMPONENT INTERACTIONS

### Key Components

1. **Authentication Module**
   - Manages JWT tokens
   - Handles login/logout
   - Validates sessions

2. **Report Service**
   - Manages file uploads
   - Coordinates with AI service
   - Stores metadata

3. **AI Service**
   - Integrates with Gemini
   - Manages prompts
   - Handles consent

4. **Appointment Service**
   - Manages doctor availability
   - Handles bookings
   - Sends notifications

5. **Audit Service**
   - Logs all actions
   - Tracks data access
   - Supports compliance

### Module Dependencies
```
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Database

Middlewares
  ↓
Controllers

Validators
  ↓
Controllers / Services
```

---

## NEXT STEPS

1. **Review this architecture** with your team
2. **Follow the patterns** described in each layer
3. **Add tests** for critical functionality
4. **Monitor performance** in production
5. **Document changes** to architecture
6. **Update this guide** as the system evolves

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-02  
**Author**: Oluwayemi Oyinlola Michael  
**Portfolio**: https://oyinlola.site
