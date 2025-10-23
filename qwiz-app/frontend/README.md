# Qwiz App Frontend

Interactive real-time quiz application frontend built with Next.js for the Software Innovation Studio project at UTS.

## 🎯 Overview

The frontend provides an intuitive interface for both lecturers and students to participate in live quiz sessions. Lecturers can create and manage quiz sessions, while students can join sessions and answer questions in real-time with live scoring.

### Key Features
- **Real-time Quiz Interface**: Live question display with countdown timers
- **Student Participation**: Join sessions with unique codes, answer MCQs
- **Lecturer Dashboard**: Manage quiz questions and monitor student responses
- **Live Leaderboard**: Real-time score tracking and rankings
- **Results Visualization**: Interactive charts showing answer distributions
- **Cross-tab Synchronization**: Events sync across multiple browser tabs

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3
- **State Management**: React hooks + local event bus
- **Real-time Communication**: BroadcastChannel API / localStorage fallback
- **Build**: Standalone output for Docker deployment

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── lecturer/          # Lecturer interface
│   │   ├── page.tsx      # Session creation
│   │   └── session/      # Session management
│   ├── student/          # Student interface  
│   │   ├── page.tsx     # Session joining
│   │   └── play/        # Quiz participation
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # Reusable UI components
│   ├── Chart.tsx       # Data visualization
│   └── ui.tsx          # UI primitives
├── lib/
│   └── bus.ts          # Event bus for real-time communication
└── types.ts            # TypeScript definitions
```

### Event System

## 🚀 Development

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm

### Getting Started

this can reference local setup but should show something? maybe where to access frontend?
<!-- 
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```
   
3. **Open application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Lecturer interface: `/lecturer`
   - Student interface: `/student`

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
``` -->


## 🔧 Configuration Files
- **`next.config.ts`**: Next.js configuration with standalone output
- **`tailwind.config.js`**: Tailwind CSS customization
- **`tsconfig.json`**: TypeScript compiler settings
- **`postcss.config.mjs`**: PostCSS processing for Tailwind
- **`eslint.config.mjs`**: Code linting rules

## 🎨 Styling & UI

### Design System
- **Tailwind CSS**: Utility-first styling
- **Custom Variables**: CSS custom properties for theming
- **Dark Mode**: Automatic system preference detection
- **Responsive**: Mobile-first design approach

### Component Library
- **Cards**: Flexible container components
- **Buttons**: Various styles and states
- **Charts**: Interactive data visualization
- **Badges**: Status and information display

## 🔍 Development Notes

### State Management
- Uses React hooks for local state
- No external state management library needed

### Performance Optimizations
- Next.js automatic code splitting
- Standalone build for minimal Docker image
- Static generation where applicable
- Efficient re-renders with proper key props

### Browser Compatibility
- Modern browsers with BroadcastChannel support
- Graceful fallback to localStorage for older browsers
- SSR-safe code with proper hydration

---

**Part of the Qwiz App ecosystem** - See main project README for full system overview and deployment instructions.