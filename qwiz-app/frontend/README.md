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
The app uses a custom event bus (`bus.ts`) for real-time communication:
- **BroadcastChannel**: Primary communication method
- **localStorage**: Fallback for cross-tab sync
- **Event Types**: MCQ publishing, answer submission, leaderboard updates

## 🚀 Development

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm

### Getting Started

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
```

## 📱 User Flows

### Lecturer Workflow
1. Navigate to `/lecturer` to create a session
2. Generate unique session code
3. Go to `/lecturer/session?code=ABC123` to manage session
4. Publish pre-written MCQ questions
5. Monitor real-time student responses and leaderboard
6. View answer distribution charts after each round

### Student Workflow  
1. Navigate to `/student` to join a session
2. Enter session code and nickname
3. Go to `/student/play` for quiz interface
4. Answer questions within time limits
5. View live leaderboard and round results

## 🐳 Docker Deployment

### Build & Run
```bash
# Build the image
docker build -t qwiz-frontend .

# Run the container
docker run -p 3000:3000 qwiz-frontend
```

### Dockerfile Details
- **Multi-stage build**: Optimized for production
- **Standalone output**: Self-contained Next.js server
- **Alpine runner**: Minimal production image
- **Port 3000**: Default Next.js port

## 🔧 Configuration Files

- **`next.config.ts`**: Next.js configuration with standalone output
- **`tailwind.config.js`**: Tailwind CSS customization
- **`tsconfig.json`**: TypeScript compiler settings
- **`postcss.config.mjs`**: PostCSS processing for Tailwind
- **`eslint.config.mjs`**: Code linting rules

## 🔗 Integration with Backend

The frontend currently operates in isolation with:
- **Mock Data**: Sample MCQ questions in `/lecturer/session`
- **Local Event Bus**: In-memory cross-tab communication
- **Session Storage**: Temporary storage for session codes/names

### Backend Connection Points
When integrating with the backend:
- Replace mock data with API calls to FastAPI backend
- Update event bus to use WebSocket/Server-Sent Events
- Add environment variables for API endpoints
- Implement proper error handling for network requests

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
- Event bus for cross-component communication
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