from django.urls import path

from .views import (
    ApproveEnrollmentRequest,
    AvailableCourseList,
    FacultyRequestList,
    PreviousCourseList,
    RejectEnrollmentRequest,
    StudentCourseList,
    StudentEnroll,
)

urlpatterns = [
    # student: the three tabs
    path("student/courses/", StudentCourseList.as_view(), name="student-courses"),
    path("student/courses/available/", AvailableCourseList.as_view(), name="student-courses-available"),
    path("student/courses/previous/", PreviousCourseList.as_view(), name="student-courses-previous"),
    # student: enroll (instant, or a request to the faculty)
    path("student/enrollments/", StudentEnroll.as_view(), name="student-enroll"),
    # faculty: the requests for their courses
    path("faculty/enrollment-requests/", FacultyRequestList.as_view(), name="faculty-requests"),
    path("faculty/enrollment-requests/<int:pk>/approve/", ApproveEnrollmentRequest.as_view(), name="faculty-request-approve"),
    path("faculty/enrollment-requests/<int:pk>/reject/", RejectEnrollmentRequest.as_view(), name="faculty-request-reject"),
]
