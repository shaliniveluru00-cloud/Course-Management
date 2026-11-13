from django.urls import path

from .views import (
    ApproveEnrollmentRequest,
    AvailableCourseList,
    FacultyAssignmentCourseList,
    FacultyCourseAssignments,
    FacultyCourseList,
    FacultyCourseStudentList,
    FacultyPreviousCourseList,
    FacultyPreviousStudentList,
    FacultyRequestList,
    FacultyScheduleList,
    PreviousCourseList,
    RejectEnrollmentRequest,
    StudentCourseAssignmentList,
    StudentGradeList,
    StudentMarkList,
    StudentScheduleList,
    StudentCourseList,
    StudentEnroll,
)

urlpatterns = [
    # student: the three tabs
    path("student/courses/", StudentCourseList.as_view(), name="student-courses"),
    path("student/courses/available/", AvailableCourseList.as_view(), name="student-courses-available"),
    path("student/courses/previous/", PreviousCourseList.as_view(), name="student-courses-previous"),
    # student: schedule page
    path("student/schedule/", StudentScheduleList.as_view(), name="student-schedule"),
    # student: grades page
    path("student/grades/", StudentGradeList.as_view(), name="student-grades"),
    path("student/marks/", StudentMarkList.as_view(), name="student-marks"),
    # student: assignments of one course
    path("student/courses/<str:code>/assignments/", StudentCourseAssignmentList.as_view(), name="student-course-assignments"),
    # student: enroll (instant, or a request to the faculty)
    path("student/enrollments/", StudentEnroll.as_view(), name="student-enroll"),
    # faculty: My Courses page and the students of one course
    path("faculty/courses/", FacultyCourseList.as_view(), name="faculty-courses"),
    path("faculty/courses/<str:code>/students/", FacultyCourseStudentList.as_view(), name="faculty-course-students"),
    # faculty: assignments page (my courses, then the assignments of one, and creating one)
    path("faculty/assignments/", FacultyAssignmentCourseList.as_view(), name="faculty-assignment-courses"),
    path("faculty/courses/<str:code>/assignments/", FacultyCourseAssignments.as_view(), name="faculty-course-assignments"),
    # faculty: grades page (earlier courses, then the students of one)
    path("faculty/grades/", FacultyPreviousCourseList.as_view(), name="faculty-grades"),
    path("faculty/grades/<str:code>/students/", FacultyPreviousStudentList.as_view(), name="faculty-grades-students"),
    # faculty: schedule page
    path("faculty/schedule/", FacultyScheduleList.as_view(), name="faculty-schedule"),
    # faculty: the requests for their courses
    path("faculty/enrollment-requests/", FacultyRequestList.as_view(), name="faculty-requests"),
    path("faculty/enrollment-requests/<int:pk>/approve/", ApproveEnrollmentRequest.as_view(), name="faculty-request-approve"),
    path("faculty/enrollment-requests/<int:pk>/reject/", RejectEnrollmentRequest.as_view(), name="faculty-request-reject"),
]
