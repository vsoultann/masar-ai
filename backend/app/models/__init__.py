"""SQLAlchemy models.  Importing this package registers every table."""
from app.models.activity import ChatMessage, RecommendationRun, SavedCareer
from app.models.catalog import Career, Course
from app.models.profile import StudentProfile
from app.models.user import User

__all__ = ["Career", "ChatMessage", "Course", "RecommendationRun",
           "SavedCareer", "StudentProfile", "User"]
