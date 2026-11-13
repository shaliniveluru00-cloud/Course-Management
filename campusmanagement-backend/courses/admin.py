"""
Admin pages for courses, enrollments, assignments, grades and so on.
Open http://localhost:8000/admin/ and log in as an ADMIN account.

Each class below says which columns to list, what to search and what to filter by.
The small `clean` methods add the same rules the website follows
(a course can't go over its capacity, marks can't exceed the maximum, and so on).
"""
from django import forms
from django.contrib import admin
from django.db.models import Count, F
from django.db.models.functions import Greatest

from .models import (
    Assignment,
    Course,
    CourseSchedule,
    Enrollment,
    EnrollmentRequest,
    Grade,
    PreviousCourse,
    PreviousEnrollment,
    Submission,
)

# ---------------------------------------------------------------- courses


class CourseForm(forms.ModelForm):
    def clean_capacity(self):
        capacity = self.cleaned_data["capacity"]
        if self.instance.pk:
            enrolled = self.instance.enrollments.count()
            if capacity < enrolled:
                raise forms.ValidationError(
                    f"{enrolled} students are already enrolled, so the capacity can't be below {enrolled}."
                )
        return capacity


class ScheduleInline(admin.StackedInline):
    """The time and room of the course, edited on the course page."""

    model = CourseSchedule
    max_num = 1
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    form = CourseForm
    list_display = ("code", "name", "faculty", "department", "credits", "capacity", "enrolled", "seats_left")
    search_fields = ("code", "name", "faculty__name")
    list_filter = ("faculty__department", "faculty")
    ordering = ("code",)
    autocomplete_fields = ("faculty",)
    inlines = [ScheduleInline]

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related("faculty")
            .annotate(enrolled_count=Count("enrollments"))
            .annotate(seats_left_count=Greatest(F("capacity") - F("enrolled_count"), 0))
        )

    @admin.display(description="Department", ordering="faculty__department")
    def department(self, course):
        return course.faculty.department

    @admin.display(description="Enrolled", ordering="enrolled_count")
    def enrolled(self, course):
        return course.enrolled_count

    @admin.display(description="Seats left", ordering="seats_left_count")
    def seats_left(self, course):
        return course.seats_left_count

    def has_delete_permission(self, request, obj=None):
        # A course that still has students can't be deleted: remove or move them first
        if obj is not None and obj.enrollments.exists():
            return False
        return super().has_delete_permission(request, obj)


@admin.register(CourseSchedule)
class CourseScheduleAdmin(admin.ModelAdmin):
    list_display = ("course", "start_time", "end_time", "room")
    search_fields = ("course__code", "course__name", "room")
    ordering = ("start_time", "course__code")
    autocomplete_fields = ("course",)
    list_select_related = ("course",)


# ---------------------------------------------------------------- enrollments


class EnrollmentForm(forms.ModelForm):
    def clean(self):
        data = super().clean()
        course = data.get("course")
        if course:
            # Not counting this enrollment itself, so moving a student to another course is checked too
            taken = course.enrollments.exclude(pk=self.instance.pk).count()
            if taken >= course.capacity:
                raise forms.ValidationError(f"{course.code} is full ({taken} of {course.capacity} seats taken).")
        return data


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """To move a student to another course, open the enrollment and change its course."""

    form = EnrollmentForm
    list_display = ("student", "course", "department", "enroll_date")
    search_fields = ("student__name", "student__roll_no", "course__code", "course__name")
    list_filter = ("course", "student__department")
    autocomplete_fields = ("student", "course")
    list_select_related = ("student", "course")
    date_hierarchy = "enroll_date"

    @admin.display(description="Student department", ordering="student__department")
    def department(self, enrollment):
        return enrollment.student.department


@admin.register(EnrollmentRequest)
class EnrollmentRequestAdmin(admin.ModelAdmin):
    """Requests are decided by the course's faculty on the website, so here they are view-only."""

    list_display = ("student", "course", "status", "requested_at", "decided_at", "decided_by")
    search_fields = ("student__name", "student__roll_no", "course__code")
    list_filter = ("status", "course")
    list_select_related = ("student", "course", "decided_by")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------- assignments and grades


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "due_date", "max_marks", "submissions")
    search_fields = ("title", "course__code", "course__name")
    list_filter = ("course",)
    ordering = ("course__code", "due_date")
    autocomplete_fields = ("course",)
    list_select_related = ("course",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(submission_count=Count("submissions"))

    @admin.display(description="Submissions", ordering="submission_count")
    def submissions(self, assignment):
        return assignment.submission_count


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("student", "assignment", "course", "submitted_date")
    search_fields = ("student__name", "student__roll_no", "assignment__title")
    list_filter = ("assignment__course",)
    autocomplete_fields = ("student", "assignment")
    list_select_related = ("student", "assignment__course")
    date_hierarchy = "submitted_date"

    @admin.display(description="Course", ordering="assignment__course__code")
    def course(self, submission):
        return submission.assignment.course.code


class GradeForm(forms.ModelForm):
    def clean(self):
        data = super().clean()
        submission, marks = data.get("submission"), data.get("marks")
        if submission and marks is not None and marks > submission.assignment.max_marks:
            raise forms.ValidationError(
                f"Marks can't be more than the maximum of {submission.assignment.max_marks} for this assignment."
            )
        return data


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    form = GradeForm
    list_display = ("student", "assignment", "marks", "out_of", "letter_grade")
    search_fields = (
        "submission__student__name",
        "submission__student__roll_no",
        "submission__assignment__title",
    )
    list_filter = ("letter_grade", "submission__assignment__course")
    autocomplete_fields = ("submission",)
    list_select_related = ("submission__student", "submission__assignment")

    @admin.display(description="Student", ordering="submission__student__name")
    def student(self, grade):
        return grade.submission.student

    @admin.display(description="Assignment", ordering="submission__assignment__title")
    def assignment(self, grade):
        return grade.submission.assignment.title

    @admin.display(description="Out of")
    def out_of(self, grade):
        return grade.submission.assignment.max_marks


# ---------------------------------------------------------------- earlier courses


@admin.register(PreviousCourse)
class PreviousCourseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "faculty", "credits", "students")
    search_fields = ("code", "name", "faculty__name")
    list_filter = ("faculty__department", "faculty")
    ordering = ("code",)
    autocomplete_fields = ("faculty",)
    list_select_related = ("faculty",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(student_count=Count("enrollments"))

    @admin.display(description="Students", ordering="student_count")
    def students(self, course):
        return course.student_count


class PreviousEnrollmentForm(forms.ModelForm):
    def clean(self):
        data = super().clean()
        held, attended = data.get("classes_held"), data.get("classes_attended")
        grade, status = data.get("grade"), data.get("status")
        if held is None or attended is None or not grade or not status:
            return data
        if attended > held:
            raise forms.ValidationError("Classes attended can't be more than classes held.")
        low_attendance = attended * 100 / held < 60
        if low_attendance and grade != "DX":
            raise forms.ValidationError("Attendance below 60% means the grade must be DX.")
        if grade == "DX" and not low_attendance:
            raise forms.ValidationError("Grade DX is only for attendance below 60%.")
        expected = "Failed" if grade in ("F", "DX") else "Completed"
        if status != expected:
            raise forms.ValidationError(f"Grade {grade} means the status must be {expected}.")
        return data


@admin.register(PreviousEnrollment)
class PreviousEnrollmentAdmin(admin.ModelAdmin):
    form = PreviousEnrollmentForm
    list_display = ("student", "course", "grade", "classes_attended", "classes_held", "attendance", "status")
    search_fields = ("student__name", "student__roll_no", "course__code", "course__name")
    list_filter = ("status", "grade", "course")
    autocomplete_fields = ("student", "course")
    list_select_related = ("student", "course")

    @admin.display(description="Attendance %")
    def attendance(self, enrollment):
        return enrollment.attendance_percent
