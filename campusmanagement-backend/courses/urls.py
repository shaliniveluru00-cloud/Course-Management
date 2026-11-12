from django.urls import path

from .views import StudentCourseList

urlpatterns = [
    path("student/courses/", StudentCourseList.as_view(), name="student-courses"),
]
