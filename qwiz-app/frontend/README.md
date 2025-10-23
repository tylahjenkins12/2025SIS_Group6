# Qwiz Frontend

Interactive real-time quiz application frontend built with Next.js for live lecture engagement.

## Overview

The frontend provides interfaces for both lecturers and students to participate in live quiz sessions with real-time updates via WebSocket connections.

### Key Features
- **Real-time Quiz Interface**: Live question display with countdown timers
- **Student Participation**: Join sessions with unique codes, answer MCQs
- **Lecturer Dashboard**: Manage quiz questions and monitor student responses
- **Live Leaderboard**: Real-time score tracking and rankings
- **Results Visualization**: Interactive charts showing answer distributions
- **WebSocket Communication**: Real-time updates from backend

## Local Development Setup

**See [LOCAL_SETUP.md](../LOCAL_SETUP.md)** for complete setup instructions.

### Quick Start

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

**Routes:**
- `/` - Home page
- `/lecturer` - Lecturer session creation
- `/lecturer/session` - Lecturer session management
- `/student` - Student session join
- `/student/play` - Student quiz interface

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3
- **State Management:** React hooks
- **Real-time:** WebSocket connections to backend
- **Deployment:** Docker + Google Cloud Run

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── lecturer/          # Lecturer interface
│   │   ├── page.tsx      # Session creation
│   │   └── session/      # Session management
│   ├── student/          # Student interface
│   │   ├── page.tsx     # Session join
│   │   └── play/        # Quiz participation
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # Reusable UI components
│   ├── Chart.tsx       # Data visualization
│   └── ui.tsx          # UI primitives
├── lib/
│   └── usebackendWS.ts # WebSocket hook for backend connection
└── types.ts            # TypeScript definitions
```

## Available Scripts

```bash
npm run dev            # Start development server (http://localhost:3000)
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## Configuration Files

- **`next.config.ts`** - Next.js configuration
- **`tailwind.config.js`** - Tailwind CSS customization
- **`postcss.config.mjs`** - PostCSS (required by Tailwind)
- **`tsconfig.json`** - TypeScript compiler settings
- **`eslint.config.mjs`** - ESLint rules
- **`jest.config.js`** - Jest test configuration (includes inline Babel config for tests only)
- **`Dockerfile`** - Container configuration

## Styling

Built with Tailwind CSS utility-first approach:
- Custom color variables for theming
- Responsive mobile-first design
- Dark mode support (system preference)
- Reusable component patterns

## WebSocket Integration

The frontend connects to the backend via WebSocket for real-time updates:

```typescript
// Custom hook for WebSocket connection
const { sendMessage, lastMessage } = useBackendWS(sessionId);
```

**Events handled:**
- New questions published
- Leaderboard updates
- Session status changes
- Student join/leave events

## Deployment

### Docker Build

```bash
docker build -t qwiz-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_BACKEND_URL=http://backend:8080 qwiz-frontend
```

### Google Cloud Run

See [main README](../README.md#deployment-to-the-production-environment) for Cloud Run deployment instructions.

## Testing

**Framework:** Jest + React Testing Library (Babel configured inline in jest.config.js for tests only)

```bash
npm test               # Run all tests (17 tests)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

**Test files:**
- `src/components/__tests__/ui.test.tsx` - UI components (Button, Input, Badge, ConfirmDialog)
- `src/components/__tests__/Chart.test.tsx` - Chart rendering
- `src/__tests__/validation.test.ts` - Validation logic (session codes, names, scoring)

## Related Documentation

- **[Local Setup Guide](../LOCAL_SETUP.md)** - Complete development environment setup
- **[Main README](../README.md)** - Project overview and deployment
- **[Backend README](../backend/README.md)** - Backend API documentation
