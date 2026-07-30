# Authentication API

This document outlines the frontend contract for the E-Shop Aggregator authentication system.

## Overview
The authentication system uses a dual-token mechanism:
- **Access Token**: A short-lived (15m) JWT returned in JSON responses. It must be included in the `Authorization` header (`Bearer <token>`) for protected routes.
- **Refresh Token**: A long-lived (7d) opaque 256-bit random token sent automatically by the server via an `HttpOnly`, `SameSite=Lax` cookie named `refreshtoken`. Only its SHA-256 digest is stored server-side.

## Endpoints

### 1. Register
- **URL**: `POST /api/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "displayName": "Test User"
  }
  ```
- **Success (201)**: Returns the created user object and an `accessToken`. Sets the `refreshtoken` cookie.
- **Error (409)**: If the email is already in use.

### 2. Login
- **URL**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Success (200)**: Returns the user object and an `accessToken`. Sets the `refreshtoken` cookie.
- **Error (401)**: Invalid credentials.

### 3. Refresh Tokens
- **URL**: `POST /api/auth/refresh`
- **Body**: None
- **Headers**: The browser automatically sends the `refreshtoken` cookie.
- **Success (200)**: Returns a new `accessToken`. The server rotates the `refreshtoken` cookie.
- **Error (401)**: If the cookie is missing, expired, or invalid. If a revoked token is used, the entire token family is invalidated.

### 4. Get Current User (Me)
- **URL**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Success (200)**: Returns the current user profile (from the JWT payload).
- **Error (401)**: If the access token is missing or invalid.

### 5. Logout
- **URL**: `POST /api/auth/logout`
- **Body**: None
- **Headers**: The browser automatically sends the `refreshtoken` cookie.
- **Success (204)**: Revokes the specific refresh token and clears the cookie.

### 6. Logout All
- **URL**: `POST /api/auth/logout-all`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Success (204)**: Revokes ALL active sessions (refresh tokens) for the user across all devices. Does not clear the cookie (the client should handle this if needed, or simply call `/logout` after).

## Security Notes
- The frontend should **never** store the Access Token in `localStorage` or `sessionStorage` if it can be avoided (in-memory variable is preferred).
- The Refresh Token is completely inaccessible to JavaScript due to the `HttpOnly` flag.
- Requests to `/refresh` or `/logout` must be made with `credentials: 'include'` (or equivalent in Axios/Fetch) so the browser attaches the cookie.
