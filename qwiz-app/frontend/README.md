# 🎨 Qwiz Frontend

React-based user interface for the Qwiz real-time quiz platform, built with Next.js and TypeScript.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build
npm start
```

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Real-time:** Event Bus with BroadcastChannel API
- **API Client:** Fetch API with WebSocket support

### Project Structure
```
src/
├── app/                    # Next.js pages
│   ├── lecturer/          # Lecturer interface
│   │   ├── page.tsx       # Dashboard
│   │   └── session/       # Active session management
│   ├── student/           # Student interface  
│   │   ├── page.tsx       # Join page
│   │   └── play/          # Quiz participation
│   └── layout.tsx         # Root layout
├── components/            
│   ├── ui/                # Base components (Card, Button, Input)
│   └── Chart.tsx          # Results visualization
├── lib/
│   ├── api.ts             # Backend API client
│   └── bus.ts             # Cross-tab event system
└── types.ts               # Shared TypeScript definitions
```

## 👥 User Flows

### 👨‍🏫 Lecturer Flow

1. **Session Creation** (`/lecturer`)
   - Calls `POST /api/sessions/create`
   - Receives unique session code
   - Redirects to session management

2. **Session Management** (`/lecturer/session`)
   - WebSocket connection to `/ws/lecturer/{sessionId}`
   - Upload lecture content → `POST /api/questions/generate`
   - Publish questions → `POST /api/questions/publish`
   - Real-time student count via WebSocket events
   - Live response tracking and charts

3. **Results Display**
   - Automatic chart updates as responses arrive
   - Answer distribution visualization
   - Export results → `GET /api/sessions/{id}/results`

### 🧑‍🎓 Student Flow

1. **Join Session** (`/student`)
   - Enter code → `POST /api/sessions/join`
   - Validates session exists and is active
   - Stores student info in session storage

2. **Quiz Participation** (`/student/play`)
   - WebSocket connection to `/ws/student/{sessionId}`
   - Receives questions via `question-published` events
   - Submit answers → `POST /api/answers/submit`
   - Real-time leaderboard updates
   - Auto-advance to next question

## 🔌 API Integration

### Configuration
```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const WS_URL = API_URL.replace(/^http/, 'ws');
```

### Key API Calls
```typescript
// Create session
const session = await api.post('/sessions/create', { lecturerId });

// Join session
const student = await api.post('/sessions/join', { code, name });

// Generate questions from content
const questions = await api.post('/questions/generate', { 
  sessionId, 
  content 
});

// Submit answer
await api.post('/answers/submit', { 
  questionId, 
  studentId, 
  answer 
});
```

### WebSocket Events
```typescript
// Lecturer events
ws.on('student-joined', (data) => updateStudentCount());
ws.on('answer-submitted', (data) => updateChart());

// Student events  
ws.on('question-published', (question) => displayQuestion());
ws.on('question-ended', (results) => showResults());
ws.on('leaderboard-update', (scores) => updateLeaderboard());
```

## 🎯 Components

### Event Bus System
Synchronizes state across browser tabs for same user:
```typescript
import bus from '@/lib/bus';

// Lecturer publishes question
bus.emit('question-published', questionData);

// All lecturer tabs receive update
bus.on('question-published', (data) => {
  setCurrentQuestion(data);
});
```

### UI Components
```tsx
// Reusable primitives
<Card>
  <CardBody>
    <Button onClick={publishQuestion}>
      Publish Question
    </Button>
  </CardBody>
</Card>

// Chart for results
<Chart 
  data={responses}
  correctAnswer={question.correct}
  showPercentages
/>
```

## 🎨 Styling Guidelines

- **Color Scheme:** Blue primary, gray secondary
- **Responsive:** Mobile-first with `md:` and `lg:` breakpoints  
- **Layout:** Max width containers, consistent spacing
- **Components:** Card-based design with subtle shadows

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:8080  # Backend URL
```

### Build Configuration
- **Output:** Standalone for Docker deployment
- **TypeScript:** Strict mode disabled for rapid development
- **ESLint:** Configured with Next.js defaults

## 🐳 Docker Support

```bash
# Build and run
docker build -t qwiz-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:8080 \
  qwiz-frontend
```

## 🧪 Testing

```bash
# Unit tests (Jest + React Testing Library)
npm test

# E2E tests (Playwright) 
npm run test:e2e
```

## 📊 State Management

- **Session State:** React Context for global session data
- **Local State:** useState for component-specific data
- **Persistence:** sessionStorage for student info
- **Real-time:** WebSocket + Event Bus for live updates

## 🚦 Error Handling

- Network errors display toast notifications
- WebSocket reconnection with exponential backoff
- Form validation before API calls
- Loading states during async operations

## 📱 Progressive Enhancement

- Works without JavaScript (SSR pages)
- Offline fallback for submitted answers
- Responsive design for all screen sizes
- Keyboard navigation support

---

📚 For backend API documentation, see [backend README](../backend/README.md)  
🔧 For deployment and infrastructure, see [main README](../README.md)