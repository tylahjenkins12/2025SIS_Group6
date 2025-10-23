#!/usr/bin/env python3
"""
Test WebSocket connection to the backend
"""
import asyncio
import websockets
import json
import sys

async def test_websocket():
    # Use a real session ID - we'll create it via API first
    session_id = "aa63ead2-2c08-4666-8065-ffb351bea280"  # From our session creation test
    uri = f"ws://localhost:8080/ws/lecturer/{session_id}"

    print(f"🔌 Testing WebSocket connection to: {uri}")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")

            # Send a test transcript chunk
            test_message = {
                "type": "transcript_chunk",
                "chunk": "This is a test transcript from the WebSocket tester",
                "timestamp": "2025-01-16T10:30:00.000Z"
            }

            print(f"📤 Sending test message: {test_message}")
            await websocket.send(json.dumps(test_message))

            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Received response: {response}")

                # Parse the response
                response_data = json.loads(response)
                if response_data.get("type") == "transcript_received":
                    print("✅ Backend acknowledged transcript successfully!")
                else:
                    print(f"📋 Received other message type: {response_data.get('type')}")

            except asyncio.TimeoutError:
                print("⏰ No response received within 5 seconds")

    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")

        if "404" in str(e):
            print("💡 This might be because the session doesn't exist.")
            print("   Try creating a session first via the API.")
        elif "Connection refused" in str(e):
            print("💡 Make sure the backend server is running on port 8080")

if __name__ == "__main__":
    print("🧪 WebSocket Connection Test")
    asyncio.run(test_websocket())