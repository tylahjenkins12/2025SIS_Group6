# app/analytics.py
from datetime import datetime
from typing import Dict, Optional

from app.schemas import (
    StudentJoinEvent, StudentLeaveEvent, QuestionGeneratedEvent, 
    AnswerSubmittedEvent, SessionAnalytics, SessionEnd
)

class AnalyticsService:
    """Service for tracking and aggregating real-time session analytics."""
    
    def __init__(self, db_client, session_manager):
        self.db = db_client
        self.session_manager = session_manager
        # In-memory tracking for real-time calculations
        self.active_students: Dict[str, set] = {}  # session_id -> set of student_ids
        self.session_stats: Dict[str, Dict] = {}   # session_id -> stats
        self.student_scores: Dict[str, Dict[str, Dict]] = {}  # session_id -> student_id -> score_data
        self.student_names: Dict[str, Dict[str, str]] = {}  # session_id -> student_id -> name
        self.student_answers: Dict[str, Dict[str, list]] = {}  # session_id -> student_id -> list of answers
        
    def set_student_name(self, session_id: str, student_id: str, name: str):
        """Set or update a student's display name."""
        if session_id not in self.student_names:
            self.student_names[session_id] = {}
        self.student_names[session_id][student_id] = name

    async def track_student_join(self, session_id: str, student_id: str, student_name: str = None):
        """Track when a student joins a session."""
        event = StudentJoinEvent(student_id=student_id, session_id=session_id)

        # Add to in-memory tracking
        if session_id not in self.active_students:
            self.active_students[session_id] = set()
            self.student_scores[session_id] = {}
            self.student_names[session_id] = {}
            self.student_answers[session_id] = {}
        self.active_students[session_id].add(student_id)

        # Store student name if provided
        if student_name:
            self.student_names[session_id][student_id] = student_name

        # Initialize student score tracking
        if student_id not in self.student_scores[session_id]:
            self.student_scores[session_id][student_id] = {
                'score': 0,
                'correct_answers': 0,
                'total_answers': 0,
                'total_response_time': 0
            }

        # Initialize student answers tracking
        if student_id not in self.student_answers[session_id]:
            self.student_answers[session_id][student_id] = []

        # Save event to Firestore
        analytics_ref = self.db.collection('sessions').document(session_id).collection('analytics')
        await self._save_event(analytics_ref, 'student_join', event.model_dump())

        # Update and broadcast session analytics
        await self._update_session_analytics(session_id)
        
    async def track_student_leave(self, session_id: str, student_id: str):
        """Track when a student leaves a session."""
        event = StudentLeaveEvent(student_id=student_id, session_id=session_id)
        
        # Remove from in-memory tracking
        if session_id in self.active_students:
            self.active_students[session_id].discard(student_id)
        
        # Save event to Firestore
        analytics_ref = self.db.collection('sessions').document(session_id).collection('analytics')
        await self._save_event(analytics_ref, 'student_leave', event.model_dump())
        
        # Update and broadcast session analytics
        await self._update_session_analytics(session_id)
        
    async def track_question_generated(self, session_id: str, question_id: str, method: str = "AI"):
        """Track when a question is generated."""
        event = QuestionGeneratedEvent(
            question_id=question_id, 
            session_id=session_id, 
            generation_method=method
        )
        
        # Save event to Firestore
        analytics_ref = self.db.collection('sessions').document(session_id).collection('analytics')
        await self._save_event(analytics_ref, 'question_generated', event.model_dump())
        
        # Update session stats
        if session_id not in self.session_stats:
            self.session_stats[session_id] = {'questions': 0, 'answers': 0, 'total_response_time': 0}
        self.session_stats[session_id]['questions'] += 1
        
        # Update and broadcast session analytics
        await self._update_session_analytics(session_id)
        
    async def track_answer_submitted(self, session_id: str, student_id: str,
                                   question_id: str, selected_option: str,
                                   correct_answer: str, response_time_ms: Optional[int] = None):
        """Track when a student submits an answer."""
        is_correct = selected_option == correct_answer

        # Calculate points earned
        points_earned = 0
        if is_correct:
            base_score = 100
            speed_bonus = max(0, 50 - (response_time_ms // 100)) if response_time_ms else 0
            points_earned = base_score + speed_bonus

        event = AnswerSubmittedEvent(
            student_id=student_id,
            session_id=session_id,
            question_id=question_id,
            selected_option=selected_option,
            correct_answer=correct_answer,
            is_correct=is_correct,
            response_time_ms=response_time_ms
        )

        # Get question details from Firestore for answer tracking
        try:
            question_ref = self.db.collection('sessions').document(session_id).collection('questions').document(question_id)
            question_doc = question_ref.get()
            question_text = "Question not found"
            if question_doc.exists:
                question_data = question_doc.to_dict()
                question_text = question_data.get('questionText', 'Question not found')
        except Exception as e:
            print(f"Error fetching question details: {e}")
            question_text = "Question not found"

        # Store answer details for end-of-session results
        if session_id in self.student_answers and student_id in self.student_answers[session_id]:
            self.student_answers[session_id][student_id].append({
                'question_id': question_id,
                'question_text': question_text,
                'student_answer': selected_option,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'points_earned': points_earned
            })

        # Save event to Firestore
        analytics_ref = self.db.collection('sessions').document(session_id).collection('analytics')
        await self._save_event(analytics_ref, 'answer_submitted', event.model_dump())

        # Update session stats
        if session_id not in self.session_stats:
            self.session_stats[session_id] = {'questions': 0, 'answers': 0, 'total_response_time': 0, 'correct_answers': 0}

        stats = self.session_stats[session_id]
        stats['answers'] = stats.get('answers', 0) + 1
        if is_correct:
            stats['correct_answers'] = stats.get('correct_answers', 0) + 1
        if response_time_ms:
            stats['total_response_time'] = stats.get('total_response_time', 0) + response_time_ms

        # Update individual student scores
        if session_id in self.student_scores and student_id in self.student_scores[session_id]:
            student_data = self.student_scores[session_id][student_id]
            student_data['total_answers'] += 1
            if is_correct:
                student_data['correct_answers'] += 1
                student_data['score'] += points_earned
            if response_time_ms:
                student_data['total_response_time'] += response_time_ms
        
        # Update and broadcast session analytics
        await self._update_session_analytics(session_id)

        # Also broadcast updated leaderboard after each answer
        leaderboard = await self.get_leaderboard(session_id)
        await self.session_manager.broadcast(session_id, {
            "type": "leaderboard_update",
            "leaderboard": leaderboard  # Already a dict
        })
        
    async def get_session_analytics(self, session_id: str) -> SessionAnalytics:
        """Get current analytics summary for a session."""
        active_count = len(self.active_students.get(session_id, set()))
        stats = self.session_stats.get(session_id, {})
        
        # Calculate averages
        avg_response_time = None
        if stats.get('answers', 0) > 0 and stats.get('total_response_time', 0) > 0:
            avg_response_time = stats['total_response_time'] / stats['answers']
            
        accuracy = None
        if stats.get('answers', 0) > 0:
            accuracy = (stats.get('correct_answers', 0) / stats['answers']) * 100
        
        return SessionAnalytics(
            session_id=session_id,
            active_students=active_count,
            total_questions=stats.get('questions', 0),
            total_answers=stats.get('answers', 0),
            average_response_time_ms=avg_response_time,
            accuracy_percentage=accuracy
        )
        
    async def _update_session_analytics(self, session_id: str):
        """Update and broadcast current session analytics."""
        analytics = await self.get_session_analytics(session_id)

        # Broadcast to all connected clients in the session
        await self.session_manager.broadcast(session_id, {
            "type": "analytics_update",
            "analytics": analytics.model_dump(mode='json')
        })
        
    async def _save_event(self, collection_ref, event_type: str, event_data: dict):
        """Save an analytics event to Firestore."""
        try:
            # Convert datetime objects to Firestore timestamps
            if 'timestamp' in event_data and isinstance(event_data['timestamp'], datetime):
                event_data['timestamp'] = event_data['timestamp']
            
            # Add event type and save
            event_data['event_type'] = event_type
            collection_ref.add(event_data)
        except Exception as e:
            print(f"Error saving analytics event: {e}")
            
    async def get_leaderboard(self, session_id: str, limit: int = 10) -> dict:
        """Get current session leaderboard with student names."""
        student_list = []

        if session_id in self.student_scores:
            student_names = self.student_names.get(session_id, {})

            for student_id, data in self.student_scores[session_id].items():
                avg_response_time = None
                if data['total_answers'] > 0 and data['total_response_time'] > 0:
                    avg_response_time = data['total_response_time'] / data['total_answers']

                # Use student name if available, otherwise use student_id
                display_name = student_names.get(student_id, f"Student {student_id[-4:]}")

                student_list.append({
                    "student_id": display_name,  # Using display name for compatibility
                    "score": data['score'],
                    "correct_answers": data['correct_answers'],
                    "total_answers": data['total_answers'],
                    "average_response_time_ms": avg_response_time
                })

        # Sort by score (highest first)
        student_list.sort(key=lambda x: x['score'], reverse=True)

        return {
            "session_id": session_id,
            "students": student_list[:limit]
        }

    def get_student_session_results(self, session_id: str, student_id: str) -> dict:
        """Get detailed session results for a specific student."""
        # Get student's score and stats
        student_score_data = {}
        if session_id in self.student_scores and student_id in self.student_scores[session_id]:
            student_score_data = self.student_scores[session_id][student_id]

        # Get student name
        student_name = "Unknown Student"
        if session_id in self.student_names and student_id in self.student_names[session_id]:
            student_name = self.student_names[session_id][student_id]

        # Calculate rank
        final_rank = 0
        total_students = 0
        if session_id in self.student_scores:
            # Sort students by score
            sorted_students = sorted(
                self.student_scores[session_id].items(),
                key=lambda x: x[1]['score'],
                reverse=True
            )
            total_students = len(sorted_students)
            for idx, (sid, _) in enumerate(sorted_students, 1):
                if sid == student_id:
                    final_rank = idx
                    break

        # Get question results
        question_results = []
        if session_id in self.student_answers and student_id in self.student_answers[session_id]:
            question_results = self.student_answers[session_id][student_id]

        return {
            "student_id": student_id,
            "student_name": student_name,
            "final_score": student_score_data.get('score', 0),
            "final_rank": final_rank,
            "total_students": total_students,
            "correct_answers": student_score_data.get('correct_answers', 0),
            "total_answers": student_score_data.get('total_answers', 0),
            "question_results": question_results
        }

    def get_lecturer_session_summary(self, session_id: str) -> dict:
        """Compile comprehensive session summary for lecturer."""
        # Get all student IDs
        student_ids = list(self.student_scores.get(session_id, {}).keys())
        student_names = self.student_names.get(session_id, {})

        # Calculate overall statistics
        total_students = len(student_ids)
        total_correct = 0
        total_answers = 0
        total_response_time = 0

        # Compile student summaries (sorted by score)
        student_summaries = []
        for student_id in student_ids:
            student_data = self.student_scores[session_id][student_id]
            student_name = student_names.get(student_id, f"Student {student_id[-4:]}")

            avg_response_time = None
            if student_data['total_answers'] > 0 and student_data['total_response_time'] > 0:
                avg_response_time = student_data['total_response_time'] / student_data['total_answers']

            accuracy = 0
            if student_data['total_answers'] > 0:
                accuracy = (student_data['correct_answers'] / student_data['total_answers']) * 100

            student_summaries.append({
                "student_id": student_id,
                "student_name": student_name,
                "score": student_data['score'],
                "correct_answers": student_data['correct_answers'],
                "total_answers": student_data['total_answers'],
                "accuracy": round(accuracy, 1),
                "avg_response_time_ms": avg_response_time
            })

            total_correct += student_data['correct_answers']
            total_answers += student_data['total_answers']
            total_response_time += student_data['total_response_time']

        # Sort students by score (highest first)
        student_summaries.sort(key=lambda x: x['score'], reverse=True)

        # Add rank to each student
        for idx, student in enumerate(student_summaries, 1):
            student['rank'] = idx

        # Compile question breakdown
        question_stats = {}
        if session_id in self.student_answers:
            for student_id, answers in self.student_answers[session_id].items():
                for answer in answers:
                    q_id = answer['question_id']
                    if q_id not in question_stats:
                        question_stats[q_id] = {
                            'question_id': q_id,
                            'question_text': answer['question_text'],
                            'correct_answer': answer['correct_answer'],
                            'total_attempts': 0,
                            'correct_attempts': 0,
                            'student_responses': []
                        }

                    question_stats[q_id]['total_attempts'] += 1
                    if answer['is_correct']:
                        question_stats[q_id]['correct_attempts'] += 1

                    student_name = student_names.get(student_id, f"Student {student_id[-4:]}")
                    question_stats[q_id]['student_responses'].append({
                        'student_name': student_name,
                        'answer': answer['student_answer'],
                        'is_correct': answer['is_correct'],
                        'points_earned': answer['points_earned']
                    })

        # Convert to list and calculate percentages
        question_breakdown = []
        for q_data in question_stats.values():
            accuracy = 0
            if q_data['total_attempts'] > 0:
                accuracy = (q_data['correct_attempts'] / q_data['total_attempts']) * 100

            question_breakdown.append({
                'question_id': q_data['question_id'],
                'question_text': q_data['question_text'],
                'correct_answer': q_data['correct_answer'],
                'total_attempts': q_data['total_attempts'],
                'correct_attempts': q_data['correct_attempts'],
                'accuracy': round(accuracy, 1),
                'student_responses': q_data['student_responses']
            })

        # Calculate overall statistics
        overall_accuracy = 0
        if total_answers > 0:
            overall_accuracy = (total_correct / total_answers) * 100

        avg_response_time = None
        if total_answers > 0 and total_response_time > 0:
            avg_response_time = total_response_time / total_answers

        return {
            "session_id": session_id,
            "total_students": total_students,
            "total_questions": len(question_breakdown),
            "total_answers": total_answers,
            "overall_accuracy": round(overall_accuracy, 1),
            "avg_response_time_ms": avg_response_time,
            "student_summaries": student_summaries,
            "question_breakdown": question_breakdown
        }

    async def end_session(self, session_id: str) -> dict:
        """End session and send results to all students and lecturer summary to lecturers."""
        print(f"🏁 Ending session {session_id}")

        # Get list of all students in this session
        student_ids = list(self.student_scores.get(session_id, {}).keys())

        # Compile all student results
        all_student_results = {}
        for student_id in student_ids:
            student_results = self.get_student_session_results(session_id, student_id)
            all_student_results[student_id] = student_results
            print(f"📊 Compiled results for student {student_id}: Rank #{student_results['final_rank']} with score {student_results['final_score']}")

        # Compile lecturer session summary (BEFORE clearing data)
        lecturer_summary = self.get_lecturer_session_summary(session_id)
        print(f"📈 Compiled session summary for lecturer: {lecturer_summary['total_students']} students, {lecturer_summary['total_questions']} questions, {lecturer_summary['overall_accuracy']}% accuracy")

        # Broadcast session end with all results to students (frontend will filter for their student_id)
        await self.session_manager.broadcast(session_id, {
            "type": "session_ended",
            "all_results": all_student_results
        })

        # Send session summary to lecturer only
        await self.session_manager.broadcast_to_lecturers(session_id, {
            "type": "session_summary",
            "summary": lecturer_summary
        })

        # Clear session data from memory (MVP - no historical storage)
        total_students = len(student_ids)
        if session_id in self.active_students:
            del self.active_students[session_id]
        if session_id in self.session_stats:
            del self.session_stats[session_id]
        if session_id in self.student_scores:
            del self.student_scores[session_id]
        if session_id in self.student_names:
            del self.student_names[session_id]
        if session_id in self.student_answers:
            del self.student_answers[session_id]

        print(f"✅ Session {session_id} ended. Results sent to {total_students} students.")

        return {
            "session_id": session_id,
            "total_students": total_students
        }