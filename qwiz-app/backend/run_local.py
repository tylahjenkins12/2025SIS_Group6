#!/usr/bin/env python3
"""
Simple script to run the backend locally for development
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Qwiz Backend locally...")
    print("📍 Backend will be available at: http://localhost:8080")
    print("🔌 WebSocket endpoint: ws://localhost:8080/ws")
    print("📋 API documentation: http://localhost:8080/docs")
    print("\n⏹️  Press Ctrl+C to stop\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=False,  # Disable auto-reload for stable WebSocket connections
        log_level="info"
    )