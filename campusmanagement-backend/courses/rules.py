"""Business rules for enrolling, kept in one place so views and serializers agree."""

# Departments whose courses any student may join without approval (open electives).
OPEN_DEPARTMENTS = {"DS"}


def needs_approval(student_department, course_department):
    """True when a student is joining a course outside their own department.
    A course's department is the department of the faculty member who teaches it."""
    if not course_department or course_department in OPEN_DEPARTMENTS:
        return False
    return student_department != course_department
