"""
Functional tests for the courses app: enrolling, approval requests, faculty actions,
assignments and who may see what.

Each test builds its own small set of data in setUp (Django uses a temporary test
database, so the real db.sqlite3 is never touched), calls the real API URLs and
checks the response.   Run:  python manage.py test
"""
from datetime import date, timedelta

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Faculty, Student, User
from .models import (
    Assignment,
    Course,
    Enrollment,
    EnrollmentRequest,
    PreviousCourse,
    PreviousEnrollment,
    Submission,
)
from .rules import needs_approval


def make_student(number, department):
    user = User.objects.create_user(username=f"s{number}", password="pw", role="STUDENT")
    return Student.objects.create(
        user=user, roll_no=f"R{number}", name=f"Student {number}",
        email=f"s{number}@x.com", department=department,
    )


def make_faculty(number, department):
    user = User.objects.create_user(username=f"f{number}", password="pw", role="FACULTY")
    return Faculty.objects.create(
        user=user, name=f"Faculty {number}", email=f"f{number}@x.com", department=department
    )


class CourseTestBase(APITestCase):
    """Two departments (CS and EE) plus the open DS department, one course each."""

    def setUp(self):
        self.cs_student = make_student(1, "CS")
        self.cs_student_2 = make_student(2, "CS")
        self.cs_faculty = make_faculty(1, "CS")
        self.ee_faculty = make_faculty(2, "EE")
        self.ds_faculty = make_faculty(3, "DS")
        self.cs_course = Course.objects.create(
            code="CS101", name="Programming", credits=3, capacity=2, faculty=self.cs_faculty
        )
        self.ee_course = Course.objects.create(
            code="EE101", name="Circuits", credits=3, capacity=2, faculty=self.ee_faculty
        )
        self.ds_course = Course.objects.create(
            code="DS101", name="Data Basics", credits=3, capacity=2, faculty=self.ds_faculty
        )

    def login_as(self, user):
        """Skip the login request and attach a token for this user (or student / faculty row)."""
        user = getattr(user, "user", user)  # accepts a Student/Faculty row or a User
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def enroll(self, code):
        return self.client.post("/api/student/enrollments/", {"course": code}, format="json")


# ---------------------------------------------------------------- the department rule


class NeedsApprovalRuleTests(APITestCase):
    def test_own_department_needs_no_approval(self):
        self.assertFalse(needs_approval("CS", "CS"))

    def test_other_department_needs_approval(self):
        self.assertTrue(needs_approval("CS", "EE"))

    def test_open_elective_needs_no_approval(self):
        self.assertFalse(needs_approval("CS", "DS"))

    def test_course_without_department_needs_no_approval(self):
        self.assertFalse(needs_approval("CS", ""))


# ---------------------------------------------------------------- student: enrolling


class StudentEnrollTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        self.login_as(self.cs_student.user)

    def test_own_department_enrolls_instantly(self):
        res = self.enroll("CS101")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "enrolled")
        self.assertTrue(Enrollment.objects.filter(student=self.cs_student, course=self.cs_course).exists())

    def test_open_elective_enrolls_instantly(self):
        res = self.enroll("DS101")
        self.assertEqual(res.status_code, 201)

    def test_other_department_creates_a_request_not_an_enrollment(self):
        res = self.enroll("EE101")
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.data["status"], "requested")
        self.assertFalse(Enrollment.objects.filter(student=self.cs_student, course=self.ee_course).exists())
        self.assertEqual(EnrollmentRequest.objects.get().status, "pending")

    def test_code_is_not_case_sensitive(self):
        self.assertEqual(self.enroll(" cs101 ").status_code, 201)

    def test_unknown_course_is_404(self):
        self.assertEqual(self.enroll("NOPE1").status_code, 404)

    def test_missing_course_field_is_400(self):
        res = self.client.post("/api/student/enrollments/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_enroll_twice(self):
        self.enroll("CS101")
        res = self.enroll("CS101")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Enrollment.objects.filter(course=self.cs_course).count(), 1)

    def test_cannot_send_a_second_pending_request(self):
        self.enroll("EE101")
        res = self.enroll("EE101")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(EnrollmentRequest.objects.count(), 1)

    def test_full_course_is_refused(self):
        Enrollment.objects.create(student=self.cs_student_2, course=self.cs_course, enroll_date=date.today())
        other = make_student(3, "CS")
        Enrollment.objects.create(student=other, course=self.cs_course, enroll_date=date.today())
        res = self.enroll("CS101")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["message"], "This course is full.")

    def test_full_course_also_refuses_a_request(self):
        for number in (3, 4):
            Enrollment.objects.create(student=make_student(number, "EE"), course=self.ee_course, enroll_date=date.today())
        self.assertEqual(self.enroll("EE101").status_code, 400)
        self.assertEqual(EnrollmentRequest.objects.count(), 0)


class StudentListTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        Enrollment.objects.create(student=self.cs_student, course=self.cs_course, enroll_date=date.today())
        Enrollment.objects.create(student=self.cs_student_2, course=self.ee_course, enroll_date=date.today())
        self.login_as(self.cs_student)

    def test_enrolled_list_shows_only_my_courses(self):
        res = self.client.get("/api/student/courses/")
        self.assertEqual([c["code"] for c in res.data], ["CS101"])

    def test_available_list_hides_enrolled_courses_and_counts_seats(self):
        res = self.client.get("/api/student/courses/available/")
        codes = {c["code"]: c for c in res.data}
        self.assertNotIn("CS101", codes)
        self.assertEqual(codes["EE101"]["seats_left"], 1)  # capacity 2, one student taken

    def test_available_list_search(self):
        res = self.client.get("/api/student/courses/available/?search=circuits")
        self.assertEqual([c["code"] for c in res.data], ["EE101"])

    def test_assignments_of_a_course_i_am_not_in_is_404(self):
        self.assertEqual(self.client.get("/api/student/courses/EE101/assignments/").status_code, 404)

    def test_previous_courses_show_status_and_attendance(self):
        old = PreviousCourse.objects.create(code="OLD1", name="Old", credits=3, faculty=self.cs_faculty)
        PreviousEnrollment.objects.create(
            student=self.cs_student, course=old, grade="DX",
            classes_held=40, classes_attended=20, status="Failed",
        )
        res = self.client.get("/api/student/courses/previous/")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["status"], "Failed")


# ---------------------------------------------------------------- student: assignment status


class AssignmentStatusTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        Enrollment.objects.create(student=self.cs_student, course=self.cs_course, enroll_date=date.today())
        today = date.today()
        self.future = Assignment.objects.create(
            course=self.cs_course, title="Future", due_date=today + timedelta(days=5), max_marks=10
        )
        self.past = Assignment.objects.create(
            course=self.cs_course, title="Past", due_date=today - timedelta(days=5), max_marks=10
        )
        self.done = Assignment.objects.create(
            course=self.cs_course, title="Done", due_date=today - timedelta(days=5), max_marks=10
        )
        Submission.objects.create(assignment=self.done, student=self.cs_student, submitted_date=today - timedelta(days=6))
        self.login_as(self.cs_student)

    def test_status_is_computed_from_dates_and_submissions(self):
        res = self.client.get("/api/student/courses/CS101/assignments/")
        status = {a["title"]: a["status"] for a in res.data}
        self.assertEqual(status, {"Future": "pending", "Past": "missing", "Done": "submitted"})

    def test_another_students_submission_does_not_count_for_me(self):
        Enrollment.objects.create(student=self.cs_student_2, course=self.cs_course, enroll_date=date.today())
        Submission.objects.create(assignment=self.past, student=self.cs_student_2, submitted_date=date.today())
        res = self.client.get("/api/student/courses/CS101/assignments/")
        self.assertEqual({a["title"]: a["status"] for a in res.data}["Past"], "missing")


# ---------------------------------------------------------------- faculty: requests


class FacultyRequestTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        self.request_obj = EnrollmentRequest.objects.create(student=self.cs_student, course=self.ee_course)
        self.login_as(self.ee_faculty.user)

    def test_faculty_sees_pending_requests_for_own_courses(self):
        res = self.client.get("/api/faculty/enrollment-requests/")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["course_code"], "EE101")

    def test_other_faculty_does_not_see_the_request(self):
        self.login_as(self.cs_faculty.user)
        self.assertEqual(len(self.client.get("/api/faculty/enrollment-requests/").data), 0)

    def test_approve_enrolls_the_student(self):
        res = self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/approve/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "approved")
        self.assertTrue(Enrollment.objects.filter(student=self.cs_student, course=self.ee_course).exists())

    def test_reject_does_not_enroll_the_student(self):
        res = self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/reject/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "rejected")
        self.assertFalse(Enrollment.objects.filter(student=self.cs_student, course=self.ee_course).exists())

    def test_approve_is_refused_when_the_course_is_full(self):
        for number in (3, 4):
            Enrollment.objects.create(student=make_student(number, "EE"), course=self.ee_course, enroll_date=date.today())
        res = self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/approve/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["message"], "This course is full.")
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "pending")

    def test_a_request_can_only_be_decided_once(self):
        self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/reject/")
        res = self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/approve/")
        self.assertEqual(res.status_code, 400)

    def test_cannot_decide_a_request_for_someone_elses_course(self):
        self.login_as(self.cs_faculty.user)
        res = self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/approve/")
        self.assertEqual(res.status_code, 404)

    def test_decision_records_who_decided(self):
        self.client.post(f"/api/faculty/enrollment-requests/{self.request_obj.pk}/approve/")
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.decided_by, self.ee_faculty)
        self.assertIsNotNone(self.request_obj.decided_at)


# ---------------------------------------------------------------- faculty: courses and assignments


class FacultyCourseTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        Enrollment.objects.create(student=self.cs_student, course=self.cs_course, enroll_date=date.today())
        self.login_as(self.cs_faculty.user)

    def test_my_courses_shows_only_my_courses_with_counts(self):
        res = self.client.get("/api/faculty/courses/")
        self.assertEqual([c["code"] for c in res.data], ["CS101"])

    def test_students_of_my_course(self):
        res = self.client.get("/api/faculty/courses/CS101/students/")
        self.assertEqual([s["roll_no"] for s in res.data], ["R1"])

    def test_students_of_someone_elses_course_is_404(self):
        self.assertEqual(self.client.get("/api/faculty/courses/EE101/students/").status_code, 404)


class CreateAssignmentTests(CourseTestBase):
    URL = "/api/faculty/courses/CS101/assignments/"

    def setUp(self):
        super().setUp()
        Enrollment.objects.create(student=self.cs_student, course=self.cs_course, enroll_date=date.today())
        self.good = {
            "title": "Quiz 1", "description": "Chapter 1",
            "due_date": str(date.today() + timedelta(days=7)), "max_marks": 20,
        }
        self.login_as(self.cs_faculty.user)

    def test_create_assignment(self):
        res = self.client.post(self.URL, self.good, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Assignment.objects.filter(course=self.cs_course, title="Quiz 1").exists())

    def test_enrolled_student_sees_it_as_pending(self):
        self.client.post(self.URL, self.good, format="json")
        self.login_as(self.cs_student.user)
        res = self.client.get("/api/student/courses/CS101/assignments/")
        self.assertEqual([(a["title"], a["status"]) for a in res.data], [("Quiz 1", "pending")])

    def test_due_date_in_the_past_is_refused(self):
        self.good["due_date"] = str(date.today() - timedelta(days=1))
        res = self.client.post(self.URL, self.good, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Due date", res.data["message"])

    def test_blank_title_is_refused(self):
        self.good["title"] = "   "
        self.assertEqual(self.client.post(self.URL, self.good, format="json").status_code, 400)

    def test_duplicate_title_is_refused(self):
        self.client.post(self.URL, self.good, format="json")
        self.good["title"] = "quiz 1"
        self.assertEqual(self.client.post(self.URL, self.good, format="json").status_code, 400)

    def test_zero_max_marks_is_refused(self):
        self.good["max_marks"] = 0
        self.assertEqual(self.client.post(self.URL, self.good, format="json").status_code, 400)

    def test_cannot_create_in_someone_elses_course(self):
        res = self.client.post("/api/faculty/courses/EE101/assignments/", self.good, format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Assignment.objects.count(), 0)


# ---------------------------------------------------------------- who may call what


class AccessRuleTests(CourseTestBase):
    def test_no_token_is_401(self):
        for url in ("/api/student/courses/", "/api/faculty/courses/"):
            self.assertEqual(self.client.get(url).status_code, 401)

    def test_student_cannot_use_faculty_endpoints(self):
        self.login_as(self.cs_student.user)
        self.assertEqual(self.client.get("/api/faculty/courses/").status_code, 403)
        self.assertEqual(self.client.get("/api/faculty/enrollment-requests/").status_code, 403)

    def test_faculty_cannot_use_student_endpoints(self):
        self.login_as(self.cs_faculty.user)
        self.assertEqual(self.client.get("/api/student/courses/").status_code, 403)
        self.assertEqual(self.enroll("CS101").status_code, 403)

    def test_garbage_token_is_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(self.client.get("/api/student/courses/").status_code, 401)


# ---------------------------------------------------------------- faculty: earlier courses


class FacultyGradesTests(CourseTestBase):
    def setUp(self):
        super().setUp()
        self.old = PreviousCourse.objects.create(code="OLD1", name="Old", credits=3, faculty=self.cs_faculty)
        PreviousEnrollment.objects.create(
            student=self.cs_student, course=self.old, grade="A",
            classes_held=40, classes_attended=38, status="Completed",
        )
        PreviousEnrollment.objects.create(
            student=self.cs_student_2, course=self.old, grade="DX",
            classes_held=40, classes_attended=20, status="Failed",
        )
        self.login_as(self.cs_faculty.user)

    def test_faculty_sees_results_of_their_earlier_course(self):
        res = self.client.get("/api/faculty/grades/OLD1/students/")
        self.assertEqual({r["status"] for r in res.data}, {"Completed", "Failed"})
        self.assertEqual(len(res.data), 2)

    def test_other_faculty_gets_404_for_that_course(self):
        self.login_as(self.ee_faculty.user)
        self.assertEqual(self.client.get("/api/faculty/grades/OLD1/students/").status_code, 404)
