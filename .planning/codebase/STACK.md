# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.x - Used across all packages and applications for type-safe development
- JavaScript (ES2022 target) - Runtime compilation target for both frontend and backend

**Secondary:**
- YAML - Configuration files (firebase.json, apphosting.yaml, pnpm-workspace.yaml)

## Runtime

**Environment:**
- Node.js 20 (required minimum, specified in root and api package.json)

**Package Manager:**
- pnpm 10.23.0 - Monorepo package management with workspaces
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core Frontend:**
- Next.js 16.1.6 - React framework for `apps/web`, handles SSR and static generation
- React 19.2.3 - Core UI library with server components support
- React DOM 19.2.3 - DOM rendering for React applications

**Core Backend:**
- Hono 4.12.2 - Lightweight web framework running on Firebase Cloud Functions in `apps/api`
- Firebase Functions 6.6.0 - Serverless function runtime with Node.js 20
- Firebase Admin SDK 12.7.0 - Server-side Firebase service access in API backend

**Authentication:**
- NextAuth.js 5.0.0-beta.30 - Session management and auth flow in Next.js frontend
- Credentials provider - Custom email/password authentication via API

**Data & State Management:**
- TanStack React Query 5.90.21 - Server state management and caching for API data
- TanStack React Form 1.28.3 - Form state and validation management
- TanStack React Table 8.21.3 - Data table component library
- TanStack React Virtual 3.13.19 - Virtual scrolling for large lists

**Client SDK:**
- Firebase SDK 12.9.0 - Client-side Firebase integration (Analytics, Functions)

**Testing & Dev:**
- Turbo 2.8.10 - Monorepo build orchestration and caching
- TypeScript 5.x - Type checking across all workspaces
- ESLint 9.x - Code linting (eslint-config-next for web app)

## Key Dependencies

**Shared Packages:**
- Zod 3.24.0 (api), 4.3.6 (web) - Runtime schema validation and type inference

**Authentication & Security:**
- bcryptjs 3.0.3 - Password hashing in API (SALT_ROUNDS = 12)
- @hono/zod-validator 0.7.6 - Zod validation middleware for Hono routes

**UI Components & Styling:**
- shadcn 3.8.5 - Component library pre-built integrations
- Radix UI 1.4.3 - Headless UI primitives for accessible components
- Base UI React 1.2.0 - Additional UI component library
- Tailwind CSS 4.x - Utility-first styling (@tailwindcss/postcss v4)
- class-variance-authority 0.7.1 - Component variant management
- clsx 2.1.1 - Conditional className utilities
- tailwind-merge 3.5.0 - Tailwind class conflict resolution

**UI Components:**
- Lucide React 0.575.0 - Icon library
- cmdk 1.1.1 - Command palette component
- input-otp 1.4.2 - OTP input field
- vaul 1.1.2 - Drawer/sheet component
- embla-carousel-react 8.6.0 - Carousel component
- react-day-picker 9.13.2 - Calendar date picker
- react-hook-form 7.71.2 - Form field management
- react-resizable-panels 4.6.5 - Resizable layout panels
- @hookform/resolvers 5.2.2 - Form validation resolvers for zod

**Data Visualization:**
- recharts 2.15.4 - React charting library

**Utilities:**
- date-fns 4.1.0 - Date manipulation and formatting
- next-themes 0.4.6 - Dark/light theme management
- sonner 2.0.7 - Toast notifications

## Configuration

**Environment:**
- Environment variables stored as secrets in Firebase App Hosting
- Development uses `.env.local` pattern (not committed, uses Firebase emulators)
- Production secrets configured in Firebase Console

**Required Environment Variables:**
Frontend (NEXT_PUBLIC prefixed):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_API_URL` - API endpoint URL

Backend:
- `API_URL` - API endpoint for internal requests
- `AUTH_SECRET` - NextAuth session encryption
- `AUTH_URL` - NextAuth base URL for callbacks

**Build Configuration:**
- `tsconfig.json` at root configures shared extends
- `apps/api/tsconfig.json` - Target ES2022, module NodeNext, output to `lib/`
- `apps/web/next.config.ts` - Minimal Next.js config (bootstrap only)
- `turbo.json` - Defines build tasks (build, dev, lint, clean) with caching

**TypeScript Path Aliases (API):**
```
@/*: ./src/*
@/types/*: ./src/types/*
@/models/*: ./src/models/*
@/repositories/*: ./src/repositories/*
@/services/*: ./src/services/*
@/usecases/*: ./src/usecases/*
@/routes/*: ./src/routes/*
@/middleware/*: ./src/middleware/*
@/lib/*: ./src/lib/*
```

## Platform Requirements

**Development:**
- Node.js 20 or higher
- pnpm 10.23.0
- Firebase CLI 13.29.0+ for emulator support
- Firebase emulators: Functions (port 5001), Firestore (8080), RTDB (9000), Storage (9199), Auth (9099), UI (4000)

**Production:**
- Firebase Cloud Functions (Node.js 20 runtime)
- Firebase App Hosting (Next.js deployment)
- Region: asia-southeast1 (specified in firebase.json)

**Deployment:**
- `firebase deploy --only functions` - Deploys API functions
- `firebase apphosting:deploy --root apps/web` - Deploys web application
- App Hosting config: 100 concurrent connections, 1 CPU, 512MB RAM, 0-10 instances, auto-scaling

---

*Stack analysis: 2026-02-25*
