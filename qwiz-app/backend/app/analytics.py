# app/analytics.py

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional
from google.cloud import firestore
from app.schemas import (
    StudentJoinEvent, StudentLeaveEvent, QuestionGeneratedEvent, 
    AnswerSubmittedEvent, SessionAnalytics, StudentScore, Leaderboard, SessionEnd
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
        
    async def track_student_join(self, session_id: str, student_id: str):
        """Track when a student joins a session."""
        event = StudentJoinEvent(student_id=student_id, session_id=session_id)
        
        # Add to in-memory tracking
        if session_id not in self.active_students:
            self.active_students[session_id] = set()
            self.student_scores[session_id] = {}
        self.active_students[session_id].add(student_id)
        
        # Initialize student score tracking
        if student_id not in self.student_scores[session_id]:
            self.student_scores[session_id][student_id] = {
                'score': 0,
                'correct_answers': 0,
                'total_answers': 0,
                'total_response_time': 0
            }
        
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
        event = AnswerSubmittedEvent(
            student_id=student_id,
            session_id=session_id,
            question_id=question_id,
            selected_option=selected_option,
            correct_answer=correct_answer,
            is_correct=is_correct,
            response_time_ms=response_time_ms
        )
        
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
                # Simple scoring: 100 points for correct answer, bonus for speed
                base_score = 100
                speed_bonus = max(0, 50 - (response_time_ms // 100)) if response_time_ms else 0
                student_data['score'] += base_score + speed_bonus
            if response_time_ms:
                student_data['total_response_time'] += response_time_ms
        
        # Update and broadcast session analytics
        await self._update_session_analytics(session_id)
        
        # Also broadcast updated leaderboard after each answer
        leaderboard = await self.get_leaderboard(session_id)
        await self.session_manager.broadcast(session_id, {
            "type": "leaderboard_update",
            "leaderboard": leaderboard.model_dump()
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
            "analytics": analytics.model_dump()
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
            
    async def get_leaderboard(self, session_id: str, limit: int = 10) -> Leaderboard:
        """Get current session leaderboard."""
        student_scores = []
        
        if session_id in self.student_scores:
            for student_id, data in self.student_scores[session_id].items():
                avg_response_time = None
                if data['total_answers'] > 0 and data['total_response_time'] > 0:
                    avg_response_time = data['total_response_time'] / data['total_answers']
                    
                student_scores.append(StudentScore(
                    student_id=student_id,
                    score=data['score'],
                    correct_answers=data['correct_answers'],
                    total_answers=data['total_answers'],
                    average_response_time_ms=avg_response_time
                ))
        
        # Sort by score (highest first)
        student_scores.sort(key=lambda x: x.score, reverse=True)
        
        return Leaderboard(
            session_id=session_id,
            students=student_scores[:limit]
        )
        
    async def end_session(self, session_id: str, session_start_time: datetime) -> SessionEnd:
        """End session and return final results."""
        leaderboard = await self.get_leaderboard(session_id, limit=100)  # Get all students
        
        # Get top 3 for podium
        top_three = leaderboard.students[:3]
        
        # Find struggling students (accuracy < 50%)
        struggling_students = []
        for student in leaderboard.students:
            if student.total_answers > 0:
                accuracy = student.correct_answers / student.total_answers
                if accuracy < 0.5:
                    struggling_students.append(student)
        
        # Calculate session duration
        duration = int((datetime.now() - session_start_time).total_seconds())
        
        # Clear session data from memory (MVP - no historical storage)
        if session_id in self.active_students:
            del self.active_students[session_id]
        if session_id in self.session_stats:
            del self.session_stats[session_id]
        if session_id in self.student_scores:
            del self.student_scores[session_id]
        
        session_end = SessionEnd(
            session_id=session_id,
            top_three=top_three,
            total_participants=len(leaderboard.students),
            total_questions=self.session_stats.get(session_id, {}).get('questions', 0),
            session_duration_seconds=duration,
            struggling_students=struggling_students
        )
        
        # Broadcast final results
        await self.session_manager.broadcast(session_id, {
            "type": "session_ended",
            "results": session_end.model_dump()
        })
        
        return session_end