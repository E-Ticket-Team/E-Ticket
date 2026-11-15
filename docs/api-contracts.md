# API Contracts: Universal E-Ticketing Platform

All API responses are wrapped in a standard JSON envelope:

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```

### Error Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed error message or validation array",
  "timestamp": "2026-11-15T08:00:00.000Z",
  "path": "/api/v1/auth/login",
  "method": "POST"
}
```

---

## 1. Authentication Endpoints

Base URL prefix: `/api/v1/auth`

### 1.1 Customer Registration
- **Endpoint:** `POST /api/v1/auth/register/customer`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "customer@eticket.com",
  "password": "Password123!",
  "firstName": "Sophea",
  "lastName": "Sreng",
  "phoneNumber": "+85512345678"
}
```
- **Responses:**
  - `201 Created`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000002",
      "email": "customer@eticket.com",
      "firstName": "Sophea",
      "lastName": "Sreng",
      "phoneNumber": "+85512345678",
      "role": "CUSTOMER",
      "createdAt": "2026-11-15T08:00:00.000Z",
      "updatedAt": "2026-11-15T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  },
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```
  - `409 Conflict`: If email already exists.
  - `400 Bad Request`: If validation fails.

---

### 1.2 Organization Registration
- **Endpoint:** `POST /api/v1/auth/register/organization`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "organizer@eticket.com",
  "password": "Password123!",
  "organizationName": "Cambodia Tech Events Ltd.",
  "firstName": "Channthy",
  "lastName": "Tha",
  "phoneNumber": "+85598765432"
}
```
- **Responses:**
  - `201 Created`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000001",
      "email": "organizer@eticket.com",
      "firstName": "Channthy",
      "lastName": "Tha",
      "organizationName": "Cambodia Tech Events Ltd.",
      "phoneNumber": "+85598765432",
      "role": "ORGANIZER",
      "createdAt": "2026-11-15T08:00:00.000Z",
      "updatedAt": "2026-11-15T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  },
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```
  - `409 Conflict`: If email already exists.

---

### 1.3 Unified User Registration
- **Endpoint:** `POST /api/v1/auth/register`
- **Request Body:**
```json
{
  "email": "user@eticket.com",
  "password": "Password123!",
  "role": "CUSTOMER", // or "ORGANIZER"
  "firstName": "Sophea",
  "lastName": "Sreng",
  "organizationName": "Optional Org Name",
  "phoneNumber": "+85512345678"
}
```

---

### 1.4 User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Request Body:**
```json
{
  "email": "customer@eticket.com",
  "password": "Password123!"
}
```
- **Responses:**
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000002",
      "email": "customer@eticket.com",
      "firstName": "Sophea",
      "lastName": "Sreng",
      "role": "CUSTOMER",
      "createdAt": "2026-11-15T08:00:00.000Z",
      "updatedAt": "2026-11-15T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  },
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```
  - `401 Unauthorized`: If email or password is invalid.

---

### 1.5 Authenticated User Profile
- **Endpoint:** `GET /api/v1/auth/me` (or `GET /api/v1/auth/profile`)
- **Request Headers:**
  - `Authorization: Bearer <accessToken>`
- **Responses:**
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "email": "organizer@eticket.com",
    "firstName": "Channthy",
    "lastName": "Tha",
    "organizationName": "Cambodia Tech Events Ltd.",
    "phoneNumber": "+85598765432",
    "role": "ORGANIZER",
    "createdAt": "2026-11-15T08:00:00.000Z",
    "updatedAt": "2026-11-15T08:00:00.000Z"
  },
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```
  - `401 Unauthorized`: If token is missing, expired, or invalid.
