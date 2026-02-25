# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.x - Used in both web and API applications for type-safe development

**Secondary:**
- JavaScript (ES2017+) - Output target for Next.js frontend

## Runtime

**Environment:**
- Node.js 20+ - Required for both development and production (specified in root `package.json`)
- Firebase Functions Runtime: Node.js 20 (specified in `firebase.json`)

**Package Manager:**
- pnpm 10.23.0 - Workspace monorepo management with `pnpm-lock.yaml` lockfile
- Lockfile: Present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- Next.js 16.1.6 - React meta-framework for web application (`apps/web`)
  - Built-in API routes at `src/app/api/`
  - File-based routing system
  - Server-side rendering and static generation

- React 19.2.3 - UI library with React DOM 19.2.3
  - React 19 with latest features

**API Framework:**
- Hono 4.6.0 - Lightweight web framework for Firebase Cloud Functions
  - Handles HTTP routing and middleware
  - Integrated with Firebase Functions at `apps/api/src/index.ts`
  - CORS and logging middleware configured

**Authentication:**
- NextAuth 5.0.0-beta.30 - Authentication library for Next.js
  - Credentials provider for email/password authentication
  - JWT token handling
  - Session management with `SessionProvider`
  - Auth routes: `src/app/api/auth/[...nextauth]/route.ts`

**Build/Dev Tools:**
- Turbo 2.x - Monorepo build orchestration and task runner
  - Manages build, dev, and lint tasks across workspaces
- TypeScript 5.6.0 - Type checking and compilation
- ESLint 9.x - Code linting
- Tailwind CSS 4 - Utility-first CSS framework with `@tailwindcss/postcss`
  - Tailwind Merge 3.5.0 for classname merging
- PostCSS 4 - CSS processor for Tailwind

**Form & Validation:**
- React Hook Form 7.71.2 - Form state management
- Zod 4.3.6 - TypeScript-first schema validation
- @hookform/resolvers 5.2.2 - Integration layer for form validation

**State Management & Data Fetching:**
- TanStack React Query 5.90.21 - Data fetching and caching
- TanStack React Form 1.28.3 - Headless form library
- TanStack React Table 8.21.3 - Headless table library
- TanStack React Virtual 3.13.19 - Virtual scrolling for large lists

**UI Components:**
- Base UI React 1.2.0 - Headless component library
- Radix UI 1.4.3 - Low-level UI component primitives
- shadcn 3.8.5 - Copy/paste component system
- Lucide React 0.575.0 - Icon library
- cmdk 1.1.1 - Command menu component

**Utilities:**
- date-fns 4.1.0 - Date manipulation and formatting
- react-day-picker 9.13.2 - Calendar date picker
- clsx 2.1.1 - Classname conditional utility
- class-variance-authority 0.7.1 - Component variant management
- input-otp 1.4.2 - OTP input component
- react-resizable-panels 4.6.5 - Resizable layout panels
- embla-carousel-react 8.6.0 - Carousel component
- react-hook-form 7.71.2 - Form state management
- sonner 2.0.7 - Toast notifications
- vaul 1.1.2 - Drawer component
- recharts 2.15.4 - React charting library
- next-themes 0.4.6 - Theme switching (dark/light mode)

**Testing:**
- Not detected in current dependencies (no test framework configured)

## Key Dependencies

**Critical:**
- firebase 12.9.0 - Firebase SDK for client-side integration
  - Realtime Database
  - Analytics
  - Cloud Functions client
- firebase-admin 12.7.0 - Firebase Admin SDK for server-side operations
- firebase-functions 6.1.0 - Firebase Cloud Functions SDK
  - Region: asia-southeast1
  - Runtime: Node.js 20

**Infrastructure:**
- hono 4.6.0 - Web framework for Cloud Functions
- @tanstack/react-query 5.90.21 - Data synchronization

## Configuration

**Environment:**
- Web app uses `NEXT_PUBLIC_*` environment variables for client-side Firebase config
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- API URL: `NEXT_PUBLIC_API_URL` or `API_URL`
- NextAuth: `AUTH_SECRET`, `AUTH_URL`
- Example env: `apps/web/.env.local.example`

**Build:**
- TypeScript compilation configs:
  - Web: `apps/web/tsconfig.json` (target: ES2017, module: esnext)
  - API: `apps/api/tsconfig.json` (target: ES2022, module: NodeNext, outDir: ./lib)
- Next.js config: `apps/web/next.config.ts` (minimal, uses defaults)
- Firebase config: `apps/api/firebase.json`
  - Functions source: `.` (root of api app)
  - Emulators enabled for local development (functions, firestore, database, storage, auth, UI)

## Platform Requirements

**Development:**
- Node.js >= 20
- pnpm >= 10.23.0
- Firebase CLI (for emulators and deployment)
- Internet connection for Firebase services

**Production:**
- Google Firebase Cloud Platform (asia-southeast1 region)
- Firebase Hosting (for web app)
- Firebase Cloud Functions (for API)
- Firestore database
- Firebase Storage
- Firebase Authentication
- Firebase Realtime Database

---

*Stack analysis: 2026-02-25*
