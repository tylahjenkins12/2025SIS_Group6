# 🚀 Local Development Setup

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd qwiz-app/backend
   ```

2. **Activate virtual environment:**
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server:**
   ```bash
   python run_local.py
   ```

   The backend will be available at:
   - 🌐 **API**: http://localhost:8080
   - 📡 **WebSocket**: ws://localhost:8080/ws
   - 📚 **API Docs**: http://localhost:8080/docs

## Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd qwiz-app/frontend
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at: http://localhost:3000

## 🔗 How Frontend Connects to Backend

The frontend is configured to connect to the local backend via:

- **API calls**: `http://localhost:8080` (configured in `.env.local`)
- **WebSocket**: `ws://localhost:8080` (configured in `.env.local`)

## 🔧 Testing Backend Connection

### **Comprehensive Test Page**
Visit **http://localhost:3000/test-connection** for a complete test suite that includes:

1. **🌐 Backend Health Check** - Tests if backend is responding
2. **📝 Session Creation** - Tests session creation API endpoint
3. **🔌 WebSocket Connection** - Tests real-time WebSocket connectivity
4. **💬 WebSocket Messaging** - Tests bi-directional communication
5. **🎤 Speech Recognition** - Tests browser speech-to-text capability
6. **📡 Transcription to Backend** - Tests full transcription workflow

### **Manual Testing Steps**

1. **Start both backend and frontend servers**
2. **Go to http://localhost:3000/test-connection**
3. **Click "🚀 Run All Tests"** to run the complete test suite
4. **Check each test result** - all should show ✅ green checkmarks
5. **Test microphone manually** by clicking the mic button and speaking

### **Alternative: Test via Lecturer Flow**

1. Go to http://localhost:3000/lecturer
2. Fill in the session form with:
   - Lecturer Name
   - Course Name
   - Transcription Interval (5-60 seconds)
3. Click "Start session"
4. Click the microphone button to start speech recognition
5. Speak - the system will send transcript chunks to backend every X seconds

## 🐛 Troubleshooting

- **Backend config errors**: Check that `.env` file exists and has valid values
- **Frontend API errors**: Verify `.env.local` has correct backend URLs
- **WebSocket connection issues**: Make sure backend is running and accessible on port 8080
- **Speech recognition not working**: Use Chrome/Edge browsers (Firefox has limited support)
- **Next.js workspace root warning**: Fixed by setting `outputFileTracingRoot` in `next.config.ts`

## ✅ Fixed Issues

- ✅ **Backend configuration validation errors** - Added proper field definitions and `extra = "ignore"`
- ✅ **Firestore authentication issues** - Implemented mock Firestore for local development
- ✅ **Session creation failures** - Fixed Firestore integration with mock implementation
- ✅ **WebSocket connection problems** - Verified WebSocket connectivity and messaging
- ✅ **Speech recognition integration** - Complete transcription workflow working
- ✅ **Next.js workspace root warning** - Configured `outputFileTracingRoot` to prevent lockfile confusion
- ✅ **Frontend-backend connection** - Set up proper environment variables for local development

## 🎯 Local Development Mode

The system now uses **Mock Firestore** for local development, which means:
- ✅ No Google Cloud authentication required
- ✅ No Firestore setup needed
- ✅ All data stored in memory (perfect for testing)
- ✅ Same API interface as real Firestore
- 🔄 **For production**: Set `USE_MOCK_FIRESTORE=false` in `.env`