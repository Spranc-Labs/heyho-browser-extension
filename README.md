# Browser Extension Backend Service

## 1. Overview

This backend service is the central data and authentication hub for the [Your Browser Extension Name]. Its primary responsibilities are:

1.  **Data Ingestion & Processing**: To collect, process, and securely store user browsing data sent from the browser extension.
2.  **User Authentication**: To manage user identity, including logins via email/password and Single Sign-On (SSO).
3.  **Data Federation**: To act as a central platform, exposing user data to other approved applications through a secure, permission-based API.

---

## 2. Core Architectural Principles

*   **Anonymous-First Data Collection**: The system is designed to provide value to users even before they create an account. All data collected from a non-authenticated user is associated with a persistent, anonymous client ID.
*   **Centralized & Claimable Data**: When a user logs in, all their previously anonymous data is "claimed" and associated with their canonical user account, providing a seamless history.
*   **Stateless Authentication (JWT)**: The service uses JSON Web Tokens (JWTs) for authenticating requests from the primary browser extension, ensuring secure and scalable communication.
*   **Delegated Authorization (OAuth 2.0)**: To share data with third-party applications, the service acts as an OAuth 2.0 provider, allowing users to grant specific, revocable permissions to other apps.

---

## 3. Data Flow: The Anonymous-to-Verified Claiming Process

This is the critical flow for ensuring no data is lost when a user decides to sign up.

1.  **Anonymous ID Generation**: When a user first installs the extension, the extension generates a persistent, unique `anonymous_client_id` (UUID) and stores it in `browser.storage.local`.
2.  **Data Tagging**: All browsing activity (page visits, aggregates, etc.) recorded by the extension is tagged with this `anonymous_client_id`.
3.  **User Authentication**: The user logs in or signs up through the extension. The backend verifies their identity and returns a **JWT** containing their canonical `user_id`.
4.  **Claim Request**: The extension makes a one-time API call to `POST /api/v1/users/claim-anonymous-data`, sending the `anonymous_client_id` in the request body and the user's JWT in the `Authorization` header.
5.  **Backend Association**: The backend verifies the JWT, extracts the `user_id`, and runs an atomic database update to associate all records tagged with the `anonymous_client_id` to the user's `user_id`.

---

## 4. API Endpoints

### Authentication Endpoints

These endpoints are for managing user identity.

#### `POST /api/v1/auth/login`
*   **Description**: Authenticates a user with email and password.
*   **Request Body**: `{ "email": "user@example.com", "password": "password123" }`
*   **Success Response**: `{ "token": "<JWT>" }`

#### `POST /api/v1/auth/sso/google` (Example)
*   **Description**: Authenticates or signs up a user via Google SSO.
*   **Request Body**: `{ "sso_token": "<Google_SSO_Token>" }`
*   **Success Response**: `{ "token": "<JWT>" }`

### Data Management Endpoints

#### `POST /api/v1/users/claim-anonymous-data`
*   **Description**: Associates all data from an anonymous ID with the authenticated user. This is the core of the "claiming" process.
*   **Authentication**: **Required (JWT)**.
*   **Request Body**: `{ "anonymous_client_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef" }`
*   **Success Response**: `200 OK` with `{ "status": "success", "claimed_records": 105 }`

### Data Access Endpoints (for Extension & 3rd Party Apps)

These endpoints provide access to the processed user data.

#### `GET /api/v1/insights`
*   **Description**: Retrieves personalized insights for the authenticated user.
*   **Authentication**: **Required (User JWT or App OAuth 2.0 Access Token)**.
*   **Success Response**: `{ "insights": [...] }`

#### `GET /api/v1/activity/summary`
*   **Description**: Retrieves a summary of the user's recent activity.
*   **Authentication**: **Required (User JWT or App OAuth 2.0 Access Token)**.
*   **Query Parameters**: `?period=weekly`
*   **Success Response**: `{ "summary": { ... } }`

---

## 5. Setup and Local Development

### Prerequisites
*   Node.js (v18.x or later)
*   PostgreSQL (or other specified database)
*   npm or yarn

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration
Create a `.env` file in the root of the project and add the following environment variables:

```
# Server Configuration
PORT=3000

# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase"

# JWT Configuration
JWT_SECRET="your-super-secret-and-long-jwt-secret"
JWT_EXPIRES_IN="7d"

# OAuth 2.0 Configuration (for when you act as a provider)
# Add client IDs and secrets for approved third-party apps here
```

### Running the Server
*   **Development**: `npm run dev`
*   **Production**: `npm start`

### Running Tests
```bash
npm test
```

---

## CI/CD & Code Quality

![CI](https://github.com/Spranc-Labs/heyho-browser-extension/workflows/CI/badge.svg)

### Automated Checks

This project uses **GitHub Actions** for continuous integration and **Husky** for pre-commit hooks.

#### GitHub Actions CI

Every push and pull request triggers automated checks:

- ✅ **Code Quality** - ESLint + Prettier
- ✅ **Unit Tests** - Jest test suite
- ✅ **Full Validation** - Combined checks
- ✅ **Security Audit** - npm audit for vulnerabilities

**View CI configuration:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

#### Pre-commit Hooks (Husky)

Automatically runs before each commit:

1. **lint-staged** - Lints and formats only staged files
2. **Jest tests** - Runs full test suite

**Installation:**
```bash
npm install  # Husky installs automatically
```

**Bypass (not recommended):**
```bash
git commit --no-verify
```

### Code Quality Commands

```bash
# Check code quality
npm run quality

# Auto-fix issues
npm run quality:fix

# Run ESLint
npm run lint
npm run lint:fix

# Run Prettier
npm run format
npm run format:check

# Run all validation (lint + format + test)
npm run validate
```

### Test Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Current Test Status

- **Total Tests:** 79
- **Passing:** 45 (57%)
- **Failing:** 34 (43% - IndexedDB mocking issues in jsdom)

**Note:** Some tests fail due to IndexedDB not being fully supported in jsdom test environment. These tests work correctly in the actual browser extension. We're working on improving the test mocking setup.

### Development Guidelines

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines including:
- JavaScript best practices
- Code quality standards
- Architecture patterns
- Security guidelines
