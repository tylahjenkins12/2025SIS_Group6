#!/usr/bin/env python3
"""
Test script for the complete MVP quiz flow
Run this to simulate the entire lecturer + student experience
"""

import asyncio
import websockets
import json
import requests
import time
from datetime import datetime

BASE_URL = "http://localhost:8080"
WS_URL = "ws://localhost:8080"

async def test_complete_mvp_flow():
    """Test the complete MVP flow from start to finish"""
    
    print("🎓 Starting MVP Quiz Flow Test...")
    
    # Step 1: Create a session
    print("\n1. Creating session...")
    session_data = {
        "lecturer_name": "Dr. Test",
        "course_name": "AI Testing 101",
        "transcription_interval_minutes": 5,  # 5 minute intervals
        "answer_time_seconds": 20         # 20 seconds to answer
    }
    
    response = requests.post(f"{BASE_URL}/start-session", json=session_data)
    if response.status_code != 201:
        print(f"❌ Failed to create session: {response.text}")
        return
    
    session_info = response.json()
    session_id = session_info["sessionId"]
    print(f"✅ Session created: {session_id}")
    print(f"   Lecturer: {session_info['lecturerName']}")
    print(f"   Course: {session_info['courseName']}")
    print(f"   Question Interval: {session_info['questionInterval']}s")
    print(f"   Answer Time: {session_info['answerTime']}s")
    
    # Step 2: Connect lecturer and students via WebSocket
    print(f"\n2. Connecting participants...")
    
    async def lecturer_client():
        uri = f"{WS_URL}/ws/lecturer/{session_id}"
        async with websockets.connect(uri) as websocket:
            print("👨‍🏫 Lecturer connected")
            
            # Wait a moment then send transcript chunks
            await asyncio.sleep(2)
            
            # Simulate transcript chunks that will trigger question generation
            transcript_chunks = [
                "Today we're learning about artificial intelligence and machine learning.",
                "Machine learning is a subset of AI that focuses on algorithms that improve through experience.",
                "There are three main types of machine learning: supervised, unsupervised, and reinforcement learning.",
                "Supervised learning uses labeled data to train models that can make predictions on new data.",
                "Common supervised learning algorithms include linear regression, decision trees, and neural networks."
            ]
            
            for i, chunk in enumerate(transcript_chunks):
                message = {
                    "type": "transcript_chunk",
                    "chunk": chunk
                }
                await websocket.send(json.dumps(message))
                print(f"📝 Sent transcript chunk {i+1}")
                await asyncio.sleep(5)  # Wait 5 seconds between chunks
            
            # Keep listening for responses
            try:
                async for message in websocket:
                    data = json.loads(message)
                    if data["type"] == "new_question":
                        print(f"❓ Question generated: {data['question']['questionText']}")
                        print(f"   Options: {data['question']['options']}")
                        print(f"   Answer time: {data['answerTimeSeconds']}s")
                    elif data["type"] == "analytics_update":
                        analytics = data["analytics"]
                        print(f"📊 Analytics: {analytics['active_students']} students, {analytics['total_questions']} questions")
                    elif data["type"] == "leaderboard_update":
                        leaderboard = data["leaderboard"]["students"][:3]  # Top 3
                        print("🏆 Leaderboard update:")
                        for i, student in enumerate(leaderboard, 1):
                            print(f"   {i}. Student {student['student_id']}: {student['score']} points")
            except websockets.exceptions.ConnectionClosed:
                print("👨‍🏫 Lecturer disconnected")
    
    async def student_client(student_name):
        uri = f"{WS_URL}/ws/student/{session_id}"
        async with websockets.connect(uri) as websocket:
            print(f"👨‍🎓 {student_name} connected")
            
            try:
                async for message in websocket:
                    data = json.loads(message)
                    if data["type"] == "new_question":
                        question = data["question"]
                        print(f"👨‍🎓 {student_name} received question: {question['questionText']}")
                        
                        # Simulate student answering (randomly pick correct or incorrect)
                        import random
                        correct_answer = question["correctAnswer"]
                        options = question["options"]
                        
                        # 70% chance of correct answer for realistic testing
                        if random.random() < 0.7:
                            selected = correct_answer
                        else:
                            # Pick a wrong answer
                            wrong_options = [opt for opt in options if opt != correct_answer]
                            selected = random.choice(wrong_options) if wrong_options else options[0]
                        
                        # Simulate response time (2-8 seconds)
                        response_time = random.randint(2000, 8000)
                        
                        answer_message = {
                            "type": "answer_submission",
                            "data": {
                                "question_id": question["id"],
                                "selected_option": selected,
                                "response_time_ms": response_time
                            }
                        }
                        
                        # Wait a bit to simulate thinking time
                        await asyncio.sleep(response_time / 1000)
                        await websocket.send(json.dumps(answer_message))
                        print(f"👨‍🎓 {student_name} answered: {selected} (in {response_time}ms)")
                    
                    elif data["type"] == "answer_result":
                        is_correct = data["is_correct"]
                        emoji = "✅" if is_correct else "❌"
                        print(f"👨‍🎓 {student_name} result: {emoji}")
                    
                    elif data["type"] == "session_ended":
                        results = data["results"]
                        # Find this student's position
                        student_id = f"student_{id(websocket)}"
                        print(f"👨‍🎓 {student_name} - Session ended! Final results received")
                        break
                        
            except websockets.exceptions.ConnectionClosed:
                print(f"👨‍🎓 {student_name} disconnected")
    
    # Step 3: Run the simulation
    print("🚀 Starting simulation...")
    
    # Create tasks for lecturer and multiple students
    tasks = [
        lecturer_client(),
        student_client("Alice"),
        student_client("Bob"), 
        student_client("Charlie"),
        student_client("Diana")
    ]
    
    # Run for 60 seconds then end session
    try:
        await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=60)
    except asyncio.TimeoutError:
        print("\n⏰ Test timeout reached")
    
    # Step 4: End the session and get results
    print(f"\n3. Ending session...")
    try:
        response = requests.post(f"{BASE_URL}/sessions/{session_id}/end")
        if response.status_code == 200:
            results = response.json()["results"]
            print("🏁 Session ended successfully!")
            print(f"   Duration: {results['session_duration_seconds']}s")
            print(f"   Total participants: {results['total_participants']}")
            print(f"   Total questions: {results['total_questions']}")
            
            print("\n🏆 Final Podium:")
            for i, student in enumerate(results["top_three"], 1):
                print(f"   {i}. {student['student_id']}: {student['score']} points ({student['correct_answers']}/{student['total_answers']})")
            
            if results["struggling_students"]:
                print(f"\n⚠️  Students who need help:")
                for student in results["struggling_students"]:
                    accuracy = (student['correct_answers'] / student['total_answers'] * 100) if student['total_answers'] > 0 else 0
                    print(f"   {student['student_id']}: {accuracy:.1f}% accuracy")
        else:
            print(f"❌ Failed to end session: {response.text}")
    except Exception as e:
        print(f"❌ Error ending session: {e}")
    
    print("\n🎉 MVP Test Complete!")

if __name__ == "__main__":
    print("Make sure the backend is running on localhost:8080")
    print("Starting test in 3 seconds...")
    time.sleep(3)
    asyncio.run(test_complete_mvp_flow())