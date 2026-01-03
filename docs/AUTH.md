# Authentication System (Better Auth)

This project uses **Better Auth** with **Prisma** (PostgreSQL) for authentication.

## 1. Setup & Configuration

### Environment Variables
Ensure the following are set in `.env`:
```bash
# Database
DATABASE_URL=postgresql://Husam:murtakaz123@localhost:5432/murtakaz?schema=public

# Better Auth
BETTER_AUTH_SECRET=your_generated_secret_key
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### Prisma Schema
The `prisma/schema.prisma` file includes the required models for Better Auth:
- `User` (extended with application fields like `role`, `orgId`, `password`)
- `Session`
- `Account`
- `Verification`

### Key Files
- **Configuration**: `web/src/lib/auth.ts` - Main Better Auth config (server-side).
- **Client**: `web/src/lib/auth-client.ts` - React client for frontend use.
- **API Route**: `web/src/app/api/auth/[...all]/route.ts` - Handles auth endpoints.
- **Middleware**: `web/src/middleware.ts` - Protects routes by checking for the session token.

## 2. Usage in Components

### Client-Side (React Hooks)
Use the `authClient` to sign in, sign out, or get the session.

```tsx
"use client";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const signIn = async () => {
    await authClient.signIn.email({
      email: "admin@murtakaz.com",
      password: "password123",
      callbackURL: "/dashboard",
    });
  };

  return <button onClick={signIn}>Sign In</button>;
}
```

### Server-Side
Use the `auth` instance from `@/lib/auth` to protect routes or actions.

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getUserSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
```

## 3. Roles & Permissions

- **SUPER_ADMIN**: Has access to `/admin` routes to manage Organizations and Users.
- **ADMIN / EXECUTIVE / etc.**: Standard application roles.

## 4. Default Accounts

A Super Admin account has been seeded:
- **Email**: `superadmin@murtakaz.com`
- **Password**: `password123`

To log in:
1. Navigate to `/auth/login`.
2. Enter the credentials above.
3. You will be redirected to the Admin Dashboard.

## 5. Middleware Protection
The `middleware.ts` is configured to:
1. Check for the `better-auth.session_token` cookie.
2. Redirect unauthenticated users to `/auth/login` (preserving the requested path via `?next=...`).
3. Allow public paths like `/auth/*`, `/about`, `/pricing`, etc.
