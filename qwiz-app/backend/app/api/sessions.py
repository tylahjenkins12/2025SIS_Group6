import json
import uuid
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

# Note: The import below assumes that db and session_manager are accessible this way.
from app.dependencies import db, session_manager, analytics_service
from app.schemas import SessionCreate, StudentAnswer, LecturerQuestionSelection
from app.services import generate_three_questions_with_llm


router = APIRouter()

# Store a temporary transcript per session
temp_transcripts = {}
last_transcript_time = {}
session_start_times = {}

# Store question options temporarily (chunk_id -> list of questions)
question_options_cache = {}

# Default constants
MIN_TRANSCRIPT_LENGTH = 20


def generate_short_session_code() -> str:
    """Generate a short 6-character session code (alphanumeric, uppercase)."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def generate_question_options_for_lecturer(session_id: str, transcript_chunk: str):
    """
    Generate question options from transcript chunk. Behavior depends on session's question release mode:
    - Active mode: Send 3 options to lecturer for selection
    - Passive mode: Auto-select first question and release immediately
    """
    try:
        if len(transcript_chunk.strip()) < MIN_TRANSCRIPT_LENGTH:
            print(f"Transcript chunk too short ({len(transcript_chunk)} chars), skipping question generation")
            return

        # Get session configuration to check release mode
        session_ref = db.collection("sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            print(f"Session {session_id} not found")
            return

        session_data = session_doc.to_dict()
        question_release_mode = session_data.get("questionReleaseMode", "active")

        print(f"Generating question options from transcript chunk (mode: {question_release_mode})...")
        question_options = await generate_three_questions_with_llm(transcript_chunk)
        print(f"Question generation result: {len(question_options) if question_options else 0} questions generated")
    except Exception as e:
        print(f"Error in generate_question_options_for_lecturer: {e}")
        import traceback

        traceback.print_exc()
        return

    if question_options and len(question_options) > 0:
        chunk_id = str(uuid.uuid4())

        if question_release_mode == "passive":
            # Passive mode: Auto-select first question and release immediately
            selected_question = question_options[0]

            # Save the selected question to Firestore
            question_id = str(uuid.uuid4())
            question_ref = db.collection("sessions").document(session_id).collection("questions").document(question_id)
            question_ref.set(
                {
                    "id": question_id,
                    "questionText": selected_question.questionText,
                    "options": selected_question.options,
                    "correctAnswer": selected_question.correctAnswer,
                    "explanation": selected_question.explanation,
                    "generatedBy": "AI",
                    "timestamp": datetime.now(timezone.utc),
                    "chunkId": chunk_id,
                    "transcriptChunk": (
                        transcript_chunk[:200] + "..." if len(transcript_chunk) > 200 else transcript_chunk
                    ),
                }
            )

            # Broadcast question directly to all students
            await session_manager.broadcast(
                session_id,
                {
                    "type": "new_question",
                    "question": {
                        "id": question_id,
                        "question_text": selected_question.questionText,
                        "options": selected_question.options,
                        "answer_time_seconds": session_data.get("answerTimeSeconds", 30),
                    },
                    "auto_released": True,
                },
            )

            print(f"Auto-released question to students for session {session_id}")

        else:
            # Active mode: Store questions in cache and send 3 questions to lecturer for selection
            question_options_cache[chunk_id] = {
                "session_id": session_id,
                "questions": question_options,
                "transcript_chunk": transcript_chunk,
            }

            await session_manager.broadcast(
                session_id,
                {
                    "type": "question_options",
                    "chunk_id": chunk_id,
                    "questions": [
                        {
                            "index": i,
                            "question_text": q.questionText,
                            "options": q.options,
                            "correct_answer": q.correctAnswer,
                        }
                        for i, q in enumerate(question_options)
                    ],
                    "transcript_chunk": (
                        transcript_chunk[:200] + "..." if len(transcript_chunk) > 200 else transcript_chunk
                    ),
                },
            )

            print(f"Sent {len(question_options)} question options to lecturer for session {session_id}")
    else:
        await session_manager.broadcast(
            session_id, {"type": "error", "message": "Failed to generate question options from transcript chunk."}
        )


@router.post("/start-session", status_code=201)
async def start_session(session_data: SessionCreate):
    """
    Creates a new session with lecturer configuration.
    """
    # Generate a short session code instead of using UUID
    session_code = generate_short_session_code()

    # Ensure the session code is unique (check Firestore)
    print(f"Checking uniqueness for session code: {session_code}")
    max_attempts = 10
    for attempt in range(max_attempts):
        session_ref_check = db.collection("sessions").document(session_code)
        try:
            doc = session_ref_check.get()
            if not doc.exists:
                print(f"Session code {session_code} is unique")
                break
        except Exception as e:
            print(f"Error checking session existence: {e}")
            # If there's an error checking, assume the session doesn't exist and continue
            break
        session_code = generate_short_session_code()
        print(f"Session code exists, trying new code: {session_code}")
        if attempt == max_attempts - 1:
            raise HTTPException(status_code=500, detail="Could not generate unique session code")

    session_id = session_code
    session_start_time = datetime.now(timezone.utc)

    try:
        # Save the session to Firestore with lecturer configuration
        session_ref = db.collection("sessions").document(session_code)
        session_ref.set(
            {
                "createdAt": session_start_time,
                "lecturerName": session_data.lecturer_name,
                "courseName": session_data.course_name,
                "answerTimeSeconds": session_data.answer_time_seconds,
                "transcriptionIntervalSeconds": session_data.transcription_interval_minutes * 60,
                "questionReleaseMode": session_data.question_release_mode,
                "status": "active",
                "lecturerTranscript": "",
            }
        )

        # Initialize temporary transcript and last timestamp
        temp_transcripts[session_id] = ""
        last_transcript_time[session_id] = session_start_time

        # Store session start time for duration calculation
        session_start_times[session_id] = session_start_time

        # Start the real-time listener for this session's questions
        session_manager.start_listener(session_id)

        print(f"Session {session_id} created successfully.")
        return {
            "sessionId": session_id,
            "lecturerName": session_data.lecturer_name,
            "courseName": session_data.course_name,
            "answerTime": session_data.answer_time_seconds,
            "transcriptionInterval": session_data.transcription_interval_minutes * 60,
        }

    except Exception as e:
        print(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Error creating session")


@router.post("/select-question", status_code=201)
async def select_question(selection_data: LecturerQuestionSelection):
    """
    Lecturer selects one of the 3 generated questions to release to students.
    """
    try:
        # Validate session exists
        session_ref = db.collection("sessions").document(selection_data.session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        # Retrieve the question options from cache
        chunk_data = question_options_cache.get(selection_data.chunk_id)
        if not chunk_data:
            raise HTTPException(status_code=404, detail="Question options not found for this chunk")

        # Get the selected question
        questions = chunk_data["questions"]
        if selection_data.selected_question_index < 0 or selection_data.selected_question_index >= len(questions):
            raise HTTPException(status_code=400, detail="Invalid question index")

        selected_question = questions[selection_data.selected_question_index]
        session_data = session_doc.to_dict()

        print(
            f"Lecturer selected question {selection_data.selected_question_index} for chunk {selection_data.chunk_id}"
        )

        # Save the selected question to Firestore
        question_id = str(uuid.uuid4())
        question_ref = (
            db.collection("sessions").document(selection_data.session_id).collection("questions").document(question_id)
        )
        question_ref.set(
            {
                "id": question_id,
                "questionText": selected_question.questionText,
                "options": selected_question.options,
                "correctAnswer": selected_question.correctAnswer,
                "explanation": selected_question.explanation,
                "generatedBy": "AI",
                "timestamp": datetime.now(timezone.utc),
                "chunkId": selection_data.chunk_id,
                "transcriptChunk": (
                    chunk_data["transcript_chunk"][:200] + "..."
                    if len(chunk_data["transcript_chunk"]) > 200
                    else chunk_data["transcript_chunk"]
                ),
            }
        )

        print(f"✅ Question saved to Firestore with ID: {question_id}")
        print(f"🎓 Firestore listener will broadcast to students automatically")

        # Clean up the cache
        del question_options_cache[selection_data.chunk_id]

        # Broadcast confirmation to lecturer
        await session_manager.broadcast(
            selection_data.session_id,
            {
                "type": "question_selected",
                "message": f"Question {selection_data.selected_question_index + 1} has been selected and released to students",
                "chunk_id": selection_data.chunk_id,
                "question_id": question_id,
            },
        )

        return {
            "status": "success",
            "message": "Question selected and released to students",
            "selected_index": selection_data.selected_question_index,
            "question_id": question_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error selecting question: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error processing question selection")


@router.websocket("/ws/{client_type}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, client_type: str, session_id: str):
    """
    Handles WebSocket connections for lecturers and students.
    """
    # Check if the session exists in Firestore
    session_ref = db.collection("sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        await websocket.close(code=1008, reason="Session not found")
        return

    # Add the new connection to the session manager
    await session_manager.connect(session_id, websocket, client_type)

    # Temporary ID until we get the student's name
    temp_student_id = f"temp_{id(websocket)}"
    student_id = temp_student_id
    student_name = None

    try:
        # No automatic generation loop needed - questions are generated per transcript chunk

        while True:
            # Receive data from the WebSocket
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")

            if client_type == "lecturer":
                if message_type == "transcript_chunk":
                    # Process transcript chunk and generate 3 questions for lecturer
                    transcript_chunk = message.get("chunk", "")
                    timestamp = message.get("timestamp", "")

                    print(f"Transcript chunk received at {timestamp}: {transcript_chunk}")

                    # Send acknowledgment to frontend
                    await websocket.send_json(
                        {"type": "transcript_received", "chunk_length": len(transcript_chunk), "timestamp": timestamp}
                    )

                    # Generate 3 question options for lecturer selection
                    await generate_question_options_for_lecturer(session_id, transcript_chunk)

                elif message_type == "end_session":
                    # Handle session end request from lecturer
                    print(f"🏁 Lecturer requested to end session {session_id}")
                    result = await analytics_service.end_session(session_id)
                    print(f"✅ Session ended successfully: {result}")

                    # Send confirmation to lecturer
                    await websocket.send_json(
                        {
                            "type": "session_end_confirmed",
                            "session_id": session_id,
                            "total_students": result.get("total_students", 0),
                        }
                    )

            elif client_type == "student":
                if message_type == "student_name":
                    # Student is sending their actual name - use it as the persistent ID
                    student_name = message.get("name", f"Student {temp_student_id[-4:]}")

                    # Use the student name as the unique identifier
                    student_id = student_name
                    print(f"📝 Student connected with name: {student_name}")

                    # Set student name in analytics service
                    analytics_service.set_student_name(session_id, student_id, student_name)

                    # Track student join (this will reuse existing score if they reconnect)
                    await analytics_service.track_student_join(session_id, student_id, student_name)
                    print(f"🎓 Student {student_name} joined session {session_id} - broadcasting to lecturer")
                    await session_manager.broadcast(
                        session_id, {"type": "student_joined", "student_id": student_id, "student_name": student_name}
                    )
                    print(f"✅ Broadcast sent for student {student_name}")

                elif message_type == "answer_submission":
                    # Handle student answer submission
                    try:
                        answer_data = StudentAnswer(**message.get("data", {}))

                        # Get the correct answer from Firestore
                        question_ref = (
                            db.collection("sessions")
                            .document(session_id)
                            .collection("questions")
                            .document(answer_data.question_id)
                        )
                        question_doc = question_ref.get()

                        if question_doc.exists:
                            question_data = question_doc.to_dict()
                            correct_answer = question_data.get("correctAnswer")
                            explanation = question_data.get("explanation", "")

                            # Track the answer submission
                            await analytics_service.track_answer_submitted(
                                session_id=session_id,
                                student_id=student_id,
                                question_id=answer_data.question_id,
                                selected_option=answer_data.selected_option,
                                correct_answer=correct_answer,
                                response_time_ms=answer_data.response_time_ms,
                            )

                            # Send confirmation back to student with explanation
                            is_correct = answer_data.selected_option == correct_answer
                            await websocket.send_json(
                                {
                                    "type": "answer_result",
                                    "question_id": answer_data.question_id,
                                    "is_correct": is_correct,
                                    "correct_answer": correct_answer,
                                    "explanation": explanation,
                                }
                            )
                        else:
                            await websocket.send_json({"type": "error", "message": "Question not found"})
                    except Exception as e:
                        print(f"Error handling answer submission: {e}")
                        await websocket.send_json({"type": "error", "message": "Invalid answer format"})

    except WebSocketDisconnect:
        # A client has disconnected, remove them from the session
        session_manager.disconnect(session_id, websocket)

        # Track student leaving if it's a student connection
        if client_type == "student":
            await analytics_service.track_student_leave(session_id, student_id)

            # Broadcast to lecturer that a student left
            await session_manager.broadcast(session_id, {"type": "student_left", "student_id": student_id})

    except Exception as e:
        print(f"An error occurred in the WebSocket loop: {e}")
        # Clean up on unexpected error
        session_manager.disconnect(session_id, websocket)

        # Track student leaving if it's a student connection
        if client_type == "student":
            await analytics_service.track_student_leave(session_id, student_id)

            # Broadcast to lecturer that a student left
            await session_manager.broadcast(session_id, {"type": "student_left", "student_id": student_id})


@router.get("/sessions/{session_id}/analytics")
async def get_session_analytics(session_id: str):
    """
    Get real-time analytics for a specific session.
    """
    try:
        # Check if session exists
        session_ref = db.collection("sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get current analytics
        analytics = await analytics_service.get_session_analytics(session_id)
        return {"analytics": analytics.model_dump()}

    except Exception as e:
        print(f"Error retrieving session analytics: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving analytics")


@router.get("/sessions/{session_id}/config")
async def get_session_config(session_id: str):
    """
    Get session configuration (transcription interval, answer time, question release mode).
    """
    try:
        # Check if session exists
        session_ref = db.collection("sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        session_data = session_doc.to_dict()
        return {
            "sessionId": session_id,
            "transcriptionIntervalSeconds": session_data.get("transcriptionIntervalSeconds", 300),
            "answerTimeSeconds": session_data.get("answerTimeSeconds", 30),
            "questionReleaseMode": session_data.get("questionReleaseMode", "active"),
            "lecturerName": session_data.get("lecturerName", ""),
            "courseName": session_data.get("courseName", ""),
        }

    except Exception as e:
        print(f"Error retrieving session config: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving session configuration")


@router.get("/sessions/{session_id}/leaderboard")
async def get_session_leaderboard(session_id: str):
    """
    Get current session leaderboard.
    """
    try:
        # Check if session exists
        session_ref = db.collection("sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get leaderboard
        leaderboard = await analytics_service.get_leaderboard(session_id)
        return {"leaderboard": leaderboard.model_dump()}

    except Exception as e:
        print(f"Error retrieving leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving leaderboard")


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    """
    End a quiz session and return final results.
    """
    try:
        # Check if session exists
        session_ref = db.collection("sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        # Update session status
        session_ref.update({"status": "ended", "endedAt": datetime.now(timezone.utc)})

        # Get session start time
        start_time = session_start_times.get(session_id, datetime.now(timezone.utc))

        # End session and get results
        results = await analytics_service.end_session(session_id, start_time)

        # Clean up session data
        if session_id in temp_transcripts:
            del temp_transcripts[session_id]
        if session_id in last_transcript_time:
            del last_transcript_time[session_id]
        if session_id in session_start_times:
            del session_start_times[session_id]

        # Remove Firestore listener
        session_manager.remove_listener(session_id)

        return {"results": results.model_dump()}

    except Exception as e:
        print(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail="Error ending session")
