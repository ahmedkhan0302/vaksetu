# Middleware Architecture

This document outlines the purpose, configuration, and limitations of the Next.js Middleware implemented in this project (`middleware.ts`).

## 1. Purpose

The core function of the middleware in this application is **Supabase Session Management**. 

Because we are using Next.js App Router and Server Components, the authentication token (stored in a cookie) must be kept alive across requests. The middleware intercepts all qualifying incoming requests and calls `updateSession(request)` (imported from `@/lib/supabase/middleware`). This function refreshes the Supabase authentication session before the request hits the application logic, ensuring that Server Components and API routes always have access to an up-to-date user session.

> [!NOTE]
> The middleware itself does **not** block access or redirect unauthenticated users to a login page. UI-level blocking and redirection are handled explicitly by the `<AuthGate>` component within protected layouts.

## 2. Matching Strategy

By default, Next.js Middleware runs on *every* single HTTP request. To optimize performance and prevent unnecessary computations or cookie parsing, a regex `matcher` is configured in `middleware.ts`.

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**What this matcher does:**
* It intercepts all main application routes (e.g., `/dashboard`, `/api/...`, page routes).
* **Exclusions:** It explicitly ignores requests that match:
  * `_next/static`: Compiled static files (JavaScript, CSS).
  * `_next/image`: Optimized images served by `next/image`.
  * `favicon.ico`: The site icon.
  * Common image extensions (`.svg`, `.png`, `.jpg`, `.webp`, etc.).

**Why?** Static assets never need authentication session refreshes. Running the session refresh logic on every single image load would drastically reduce performance and unnecessarily repeatedly check Supabase sessions.

## 3. Important Limitations

When maintaining or extending the middleware, keep the following Next.js architectural constraints in mind:

1. **Edge Runtime:** The middleware runs on the Next.js Edge Runtime, not a standard Node.js environment. You cannot use native Node.js modules (like `fs`, `crypto`, or native database drivers) directly inside `middleware.ts`. All imported libraries must be Edge-compatible.
2. **Execution Timing:** Middleware executes *before* any routing or rendering. If the middleware functions take too long, your entire application TTFB (Time to First Byte) will slow down. Keep logic within this file extremely lightweight.
3. **No Direct Database Queries:** Because it runs on the edge and needs to be fast, middleware should avoid heavy database queries. For complex authorization or data-fetching, rely on Server Components instead.
