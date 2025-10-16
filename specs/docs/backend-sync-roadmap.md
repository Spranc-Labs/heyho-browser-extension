# Backend Sync Roadmap

This document provides a detailed, step-by-step roadmap for building the backend sync service, as outlined in the main [Roadmap](./roadmap.md). The goal is to securely and efficiently sync `pageVisits` and `tabAggregates` data from the browser extension to a central backend.

## Phase 1: Backend Scaffolding

**Goal:** Set up the basic infrastructure for the backend service.

*   **Step 1: Choose a Tech Stack**: Decide on the programming language, framework, and database for the backend. For example, Node.js with Express and PostgreSQL, or Python with FastAPI and MySQL.
*   **Step 2: Set up the Project**: Initialize a new project for the backend service, including a version control system (e.g., Git).
*   **Step 3: Database Schema**: Design and create the database schema to store `pageVisits` and `tabAggregates` data. The schema should be optimized for efficient querying and aggregation.
*   **Step 4: API Scaffolding**: Create the basic API structure with placeholder endpoints for authentication and data synchronization.

## Phase 2: Authentication and Authorization

**Goal:** Implement a secure authentication system to ensure that only authorized users can sync data.

*   **Step 1: Authentication Strategy**: Choose an authentication strategy, such as OAuth 2.0 or JWT-based authentication.
*   **Step 2: User Model**: Create a `User` model in the database to store user information.
*   **Step 3: Registration and Login**: Implement API endpoints for user registration and login. These endpoints will issue authentication tokens.
*   **Step 4: Authenticated Routes**: Protect the data synchronization endpoints so that they can only be accessed by authenticated users.

## Phase 3: Data Synchronization

**Goal:** Implement the core logic for syncing data from the extension to the backend.

*   **Step 1: API Endpoints**: Implement the API endpoints for receiving `pageVisits` and `tabAggregates` data. These endpoints should be designed to handle batches of data to minimize the number of requests.
*   **Step 2: Data Validation**: Implement data validation to ensure that the data received from the extension is well-formed and consistent with the database schema.
*   **Step 3: Upsert Logic**: Implement "upsert" (update or insert) logic to avoid creating duplicate records. The backend should be able to handle cases where the same data is sent multiple times.
*   **Step 4: Extension Implementation**: In the browser extension, create a new module for handling the synchronization process. This module will be responsible for:
    *   Periodically checking for new data to sync.
    *   Batching the data to be sent to the backend.
    *   Handling authentication with the backend.
    *   Sending the data to the backend API.
    *   Marking the data as synced in the local database.

## API Design

### Authentication

*   `POST /api/auth/register`: Register a new user.
*   `POST /api/auth/login`: Log in a user and receive an authentication token.

### Data Synchronization

*   `POST /api/sync/page-visits`: Sync a batch of `pageVisits` data.
*   `POST /api/sync/tab-aggregates`: Sync a batch of `tabAggregates` data.

#### Request Body (for `POST /api/sync/page-visits`)

```json
{
  "visits": [
    { "id": "pv_123", "url": "https://example.com", ... },
    { "id": "pv_456", "url": "https://google.com", ... }
  ]
}
```

#### Request Body (for `POST /api/sync/tab-aggregates`)

```json
{
  "aggregates": [
    { "tabId": 1, "totalActiveDuration": 12345, ... },
    { "tabId": 2, "totalActiveDuration": 67890, ... }
  ]
}
```

## See Also

*   [Roadmap](./roadmap.md)
*   [Page Visits Specification](./page-visits.md)
*   [Tab Aggregates Specification](./tab-aggregates.md)
