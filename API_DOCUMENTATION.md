# MedExplain AI - API Documentation

**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**Base URL:** `http://localhost:3000/api`  
**API Version:** 1.0  
**Last Updated:** 2026-06-02

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Auth Endpoints](#auth-endpoints)
6. [User Endpoints](#user-endpoints)
7. [Report Endpoints](#report-endpoints)
8. [AI Endpoints](#ai-endpoints)
9. [Appointment Endpoints](#appointment-endpoints)
10. [Doctor Endpoints](#doctor-endpoints)
11. [Admin Endpoints](#admin-endpoints)

---

## OVERVIEW

### Base URL
```
http://localhost:3000/api
```

### API Characteristics
- **Protocol**: HTTP/HTTPS
- **Authentication**: JWT Bearer Token
- **Content-Type**: application/json
- **Rate Limiting**: 120 requests per 15 minutes per IP
- **Timeout**: 30 seconds per request

### Versioning
Currently at version 1.0. Changes to existing endpoints will increment minor version.

---

## AUTHENTICATION

### JWT Token Flow

```
1. User registers/logins
   ↓
2. Server returns access token (15 min) + refresh token (30 days in cookie)
   ↓
3. Client includes access token in all requests
   ↓
4. When access token expires, use refresh token to get new one
   ↓
5. On logout, refresh token is revoked
```

### Authorization Header

```
Authorization: Bearer <access_token>
```

Example:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/me
```

### CSRF Protection

For state-changing requests (POST, PUT, DELETE):
```
X-CSRF-Token: <csrf_token>
```

Get CSRF token from: `POST /auth/csrf`

---

## RESPONSE FORMAT

### Success Response (2xx)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "error": null,
  "message": "Operation successful"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": null
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "Item 1" },
    { "id": "...", "name": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## ERROR HANDLING

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Deletion successful |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Don't have permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

### Error Codes

| Code | Description |
|------|-------------|
| INVALID_CREDENTIALS | Email/password incorrect |
| USER_NOT_FOUND | User doesn't exist |
| USER_EXISTS | Email already registered |
| INVALID_TOKEN | Token expired or invalid |
| UNAUTHORIZED | Missing authorization |
| FORBIDDEN | Don't have permission |
| INVALID_INPUT | Validation error |
| INTERNAL_ERROR | Server error |

---

## AUTH ENDPOINTS

### Get CSRF Token

```
GET /auth/csrf
```

**Description:** Get CSRF token for subsequent requests

**Response:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "dGU3OGY0YTNlYmQ5YTY3OGJkZmQ4MDBkYzQ0NjYxMmU="
  }
}
```

### Register

```
POST /auth/register
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "email": "patient@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "consentPromptLearning": false
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "patient@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Patient",
      "status": "pending"
    },
    "accessToken": "eyJhbGc..."
  }
}
```

**Errors:**
- 400: Invalid input
- 409: Email already registered

### Login

```
POST /auth/login
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "email": "patient@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "patient@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Patient"
    },
    "accessToken": "eyJhbGc..."
  }
}
```

**Note:** Refresh token set in httpOnly cookie automatically

### Logout

```
POST /auth/logout
Authorization: Bearer <token>
X-CSRF-Token: <token>
```

**Response:**
```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

### Refresh Token

```
POST /auth/refresh
```

**Description:** Refresh access token using refresh token cookie

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "accessToken": "eyJhbGc..."
  }
}
```

**Errors:**
- 401: Invalid refresh token

### Request Password Reset

```
POST /auth/request-password-reset
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "email": "patient@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "sent": true }
}
```

### Reset Password

```
POST /auth/reset-password
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "reset": true }
}
```

---

## USER ENDPOINTS

### Get Current User

```
GET /me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Patient",
    "status": "active",
    "emailVerifiedAt": "2026-06-01T10:00:00Z",
    "consentPromptLearning": false
  }
}
```

### Update Profile

```
PUT /me
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "metadata": {
    "bio": "New bio",
    "avatar": "url-to-avatar"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated user */ }
}
```

### Update AI Learning Consent

```
PUT /me/consent
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "consentPromptLearning": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { "consented": true }
}
```

---

## REPORT ENDPOINTS

### List Reports

```
GET /reports?page=1&pageSize=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (uploaded, processing, analyzed, failed)
- `sortBy` (string): Sort field (created_at, updated_at)
- `sortOrder` (string): asc or desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Chest X-Ray",
      "status": "analyzed",
      "createdAt": "2026-06-01T10:00:00Z",
      "summary": "Normal chest X-ray..."
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42
  }
}
```

### Upload Report

```
POST /reports/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
X-CSRF-Token: <token>
```

**Form Data:**
- `file` (File): PDF, PNG, JPEG, or WebP file
- `title` (string): Report title

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Chest X-Ray",
    "status": "uploaded",
    "fileName": "chest-xray.pdf",
    "fileSize": 2048000
  }
}
```

**Errors:**
- 400: Invalid file type or size
- 413: File too large

### Get Report

```
GET /reports/{reportId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Chest X-Ray",
    "status": "analyzed",
    "fileName": "chest-xray.pdf",
    "fileSize": 2048000,
    "summary": "Normal findings",
    "extractedText": "Full text from report",
    "createdAt": "2026-06-01T10:00:00Z",
    "updatedAt": "2026-06-01T10:30:00Z"
  }
}
```

### Delete Report

```
DELETE /reports/{reportId}
Authorization: Bearer <token>
X-CSRF-Token: <token>
```

**Response:**
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

## AI ENDPOINTS

### Analyze Report

```
POST /ai/analyze
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "analysis": "The report shows...",
    "keyFindings": ["Finding 1", "Finding 2"],
    "recommendations": ["See specialist", "Follow up in 3 months"],
    "createdAt": "2026-06-01T10:00:00Z"
  }
}
```

### Chat

```
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "message": "What does this mean?",
  "reportId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440002",
    "message": "This result indicates...",
    "messageId": "550e8400-e29b-41d4-a716-446655440003"
  }
}
```

### Get Conversations

```
GET /ai/conversations?page=1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "reportId": "550e8400-e29b-41d4-a716-446655440000",
      "lastMessage": "What does this mean?",
      "messageCount": 5,
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

## APPOINTMENT ENDPOINTS

### List Appointments

```
GET /appointments?status=confirmed
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (requested, confirmed, completed, cancelled)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "doctorId": "550e8400-e29b-41d4-a716-446655440001",
      "doctorName": "Dr. Smith",
      "scheduledAt": "2026-06-15T14:00:00Z",
      "status": "confirmed"
    }
  ]
}
```

### Book Appointment

```
POST /appointments
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "doctorId": "550e8400-e29b-41d4-a716-446655440001",
  "scheduledAt": "2026-06-15T14:00:00Z",
  "reason": "Follow-up consultation",
  "notes": "Please bring recent lab results"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "requested",
    "scheduledAt": "2026-06-15T14:00:00Z"
  }
}
```

---

## DOCTOR ENDPOINTS

### Get Doctor Profile

```
GET /doctors/{doctorId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "specialty": "Cardiology",
    "licenseNumber": "MD123456",
    "bio": "Board certified cardiologist",
    "yearsOfExperience": 10,
    "availability": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00:00",
        "endTime": "17:00:00"
      }
    ]
  }
}
```

---

## ADMIN ENDPOINTS

### List Users

```
GET /admin/users?page=1&role=Patient
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number
- `role`: Filter by role (Patient, Doctor, Admin)
- `status`: Filter by status (active, pending, disabled)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Patient",
      "status": "active",
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

### Disable User

```
PUT /admin/users/{userId}/status
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <token>
```

**Body:**
```json
{
  "status": "disabled"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "status": "disabled" }
}
```

---

## RATE LIMITING

API enforces rate limiting:
- **Limit:** 120 requests per 15 minutes
- **Per:** IP address
- **Header:** Returns `X-RateLimit-Remaining` and `X-RateLimit-Reset`

**Response when rate limited (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## COMMON PATTERNS

### Pagination

Most list endpoints support pagination:

```
GET /endpoint?page=2&pageSize=50
```

### Filtering & Sorting

```
GET /endpoint?status=active&sortBy=createdAt&sortOrder=desc
```

### Error Handling in Client

```javascript
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }
    
    return data.data;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}
```

---

## EXAMPLES

### Complete Login Flow

```javascript
// 1. Get CSRF token
const csrfRes = await fetch('/api/auth/csrf');
const { data: { csrfToken } } = await csrfRes.json();

// 2. Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { data: { accessToken } } = await loginRes.json();

// 3. Store token (in real app, use secure storage)
localStorage.setItem('access_token', accessToken);

// 4. Use token in subsequent requests
const meRes = await fetch('/api/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

**Last Updated:** 2026-06-02  
**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site
