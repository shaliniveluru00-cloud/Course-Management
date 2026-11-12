from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsStudent

from .models import Course
from .serializers import CourseSerializer


class StudentCourseList(ListAPIView):
    """
    GET /api/student/courses/
    The courses the logged-in student is enrolled in.
    """

    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        # A Student row shares its primary key with the User, so request.user.pk
        # is the student id. Only this student's enrollments are matched.
        return (
            Course.objects
            .filter(enrollments__student_id=self.request.user.pk)
            .select_related("faculty")
            .order_by("code")
        )
