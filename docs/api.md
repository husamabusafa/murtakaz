# API (Prototype)

The prototype uses a minimal set of Next.js route handlers to support demo sessions.

## `GET /api/session`

Returns the current demo user inferred from the `murtakaz_demo_user` cookie.

Response:

- `{ "user": { "id": "...", "name": "...", "role": "...", ... } }`

## `POST /api/session/login`

Sets the demo session cookie.

Request body:

- `{ "userId": "user-admin" }`

Responses:

- `200` `{ "ok": true, "user": { ... } }`
- `400` `{ "error": "Invalid userId" }`

## `POST /api/session/logout`

Clears the demo session cookie.

Response:

- `{ "ok": true }`

