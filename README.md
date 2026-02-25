# Klayim

Monorepo with Turborepo, Hono API on Firebase Functions, and Next.js web app.

## Structure

```
├── apps/
│   ├── api/                    # Hono API (Firebase Functions)
│   │   └── src/
│   │       ├── types/          # Type definitions & DTOs
│   │       ├── models/         # Domain entities
│   │       ├── repositories/   # Data access layer (Firestore)
│   │       ├── usecases/       # Application business logic
│   │       ├── services/       # Domain services (Auth, Storage)
│   │       ├── routes/         # HTTP routes/controllers
│   │       ├── middleware/     # Middleware (auth, etc.)
│   │       ├── lib/            # Firebase initialization
│   │       └── index.ts        # Entry point
│   └── web/                    # Next.js web app (App Router + Tailwind)
│       └── src/
│           ├── app/            # Next.js App Router
│           └── lib/            # Firebase client SDK
└── packages/                   # Shared packages
```

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure Firebase:
   - Update `apps/api/.firebaserc` with your project ID
   - Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in values

3. Run development:
   ```bash
   pnpm dev
   ```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all apps |
| `pnpm api:emulators` | Start Firebase emulators |
| `pnpm api:deploy` | Deploy API to Firebase Functions |

## API Architecture (Clean Architecture)

- **types/** - Type definitions, interfaces, DTOs
- **models/** - Domain entities with business rules
- **repositories/** - Data access layer (Firestore operations)
- **usecases/** - Application business logic (one class per use case)
- **services/** - Domain services (Auth, Storage)
- **routes/** - HTTP handlers (Hono routes)
- **middleware/** - Request middleware (authentication)
- **lib/** - Infrastructure (Firebase initialization)

## Firebase Emulators

Run `pnpm api:emulators` to start:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- RTDB: http://localhost:9000
- Storage: http://localhost:9199
- Auth: http://localhost:9099
- Emulator UI: http://localhost:4000
