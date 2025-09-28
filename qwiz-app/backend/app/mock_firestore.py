"""
Mock Firestore implementation for local development
This provides the same interface as google.cloud.firestore but stores data in memory
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import uuid


class MockDocument:
    def __init__(self, data: Optional[Dict[str, Any]] = None, exists: bool = True):
        self._data = data or {}
        self._exists = exists

    def exists(self) -> bool:
        return self._exists

    def to_dict(self) -> Dict[str, Any]:
        return self._data.copy()

    def get(self, field_path: str) -> Any:
        return self._data.get(field_path)


class MockDocumentReference:
    def __init__(self, collection_ref: 'MockCollectionReference', doc_id: str):
        self._collection_ref = collection_ref
        self._id = doc_id

    @property
    def id(self) -> str:
        return self._id

    def set(self, data: Dict[str, Any]) -> None:
        """Set document data"""
        self._collection_ref._data[self._id] = data.copy()

    def get(self) -> MockDocument:
        """Get document data"""
        if self._id in self._collection_ref._data:
            return MockDocument(self._collection_ref._data[self._id], exists=True)
        else:
            return MockDocument(exists=False)

    def update(self, data: Dict[str, Any]) -> None:
        """Update document data"""
        if self._id in self._collection_ref._data:
            self._collection_ref._data[self._id].update(data)
        else:
            self._collection_ref._data[self._id] = data.copy()

    def delete(self) -> None:
        """Delete document"""
        if self._id in self._collection_ref._data:
            del self._collection_ref._data[self._id]

    def collection(self, name: str) -> 'MockCollectionReference':
        """Get subcollection"""
        subcoll_path = f"{self._collection_ref._path}/{self._id}/{name}"
        if subcoll_path not in self._collection_ref._client._collections:
            self._collection_ref._client._collections[subcoll_path] = {}
        return MockCollectionReference(self._collection_ref._client, subcoll_path)


class MockCollectionReference:
    def __init__(self, client: 'MockFirestoreClient', path: str):
        self._client = client
        self._path = path
        self._data = client._collections.setdefault(path, {})

    def document(self, doc_id: Optional[str] = None) -> MockDocumentReference:
        """Get document reference"""
        if doc_id is None:
            doc_id = str(uuid.uuid4())
        return MockDocumentReference(self, doc_id)

    def add(self, data: Dict[str, Any]) -> tuple:
        """Add document with auto-generated ID"""
        doc_id = str(uuid.uuid4())
        self._data[doc_id] = data.copy()
        return datetime.now(timezone.utc), MockDocumentReference(self, doc_id)

    def on_snapshot(self, callback):
        """Mock snapshot listener - returns a simple function to unsubscribe"""
        def unsubscribe():
            pass
        return unsubscribe


class MockFirestoreClient:
    def __init__(self, project: str):
        self.project = project
        self._collections: Dict[str, Dict[str, Any]] = {}

    def collection(self, name: str) -> MockCollectionReference:
        """Get collection reference"""
        if name not in self._collections:
            self._collections[name] = {}
        return MockCollectionReference(self, name)


def create_mock_firestore_client(project: str) -> MockFirestoreClient:
    """Create a mock Firestore client for local development"""
    return MockFirestoreClient(project)