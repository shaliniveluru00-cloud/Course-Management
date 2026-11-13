"""
The Django admin site (http://localhost:8000/admin/) for users, students and faculty.

Log in with an account whose role is ADMIN (for example admin01). Django builds the
pages from our models; this file only chooses which columns, search boxes and filters to show.
"""
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin

from .models import Faculty, Student, User

admin.site.site_header = "Campus Course Management - Administration"
admin.site.site_title = "Campus Admin"
admin.site.index_title = "Manage students, faculty, courses and enrollments"


# ---------------------------------------------------------------- users


class StudentInline(admin.StackedInline):
    """Fill in the student details on the same page as the login account."""

    model = Student
    can_delete = False
    max_num = 1
    extra = 0


class FacultyInline(admin.StackedInline):
    """Fill in the faculty details on the same page as the login account."""

    model = Faculty
    can_delete = False
    max_num = 1
    extra = 0


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Show the role column and let admins filter/edit it in /admin
    list_display = ("username", "role", "is_active")
    list_filter = ("role", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Campus role", {"fields": ("role",)}),)
    # The "Add user" page also asks for the role
    add_fieldsets = UserAdmin.add_fieldsets + ((None, {"fields": ("role",)}),)
    inlines = [StudentInline, FacultyInline]

    def save_model(self, request, obj, form, change):
        # An account with the ADMIN role can use this admin site
        # (we only ever add this permission here, never take it away)
        if obj.role == User.Role.ADMIN:
            obj.is_staff = True
            obj.is_superuser = True
        super().save_model(request, obj, form, change)


# ---------------------------------------------------------------- students and faculty


def _set_login(modeladmin, request, queryset, active):
    """Turn the login on or off for the people selected (their data stays)."""
    count = 0
    for person in queryset.select_related("user"):
        person.user.is_active = active
        person.user.save(update_fields=["is_active"])
        count += 1
    word = "can log in again" if active else "can no longer log in"
    modeladmin.message_user(request, f"{count} account(s) {word}.", messages.SUCCESS)


@admin.action(description="Deactivate selected (they can no longer log in; records are kept)")
def deactivate_accounts(modeladmin, request, queryset):
    _set_login(modeladmin, request, queryset, False)


@admin.action(description="Reactivate selected (they can log in again)")
def activate_accounts(modeladmin, request, queryset):
    _set_login(modeladmin, request, queryset, True)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("roll_no", "name", "department", "year", "email", "login_active")
    search_fields = ("roll_no", "name", "email", "department", "user__username")
    list_filter = ("department", "year", "user__is_active")
    ordering = ("roll_no",)
    autocomplete_fields = ("user",)
    list_select_related = ("user",)
    actions = [deactivate_accounts, activate_accounts]

    @admin.display(boolean=True, description="Can log in", ordering="user__is_active")
    def login_active(self, student):
        return student.user.is_active


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "email", "number_of_courses", "login_active")
    search_fields = ("name", "email", "department", "user__username")
    list_filter = ("department", "user__is_active")
    ordering = ("name",)
    autocomplete_fields = ("user",)
    list_select_related = ("user",)
    actions = [deactivate_accounts, activate_accounts]

    @admin.display(description="Courses")
    def number_of_courses(self, faculty):
        return faculty.courses.count()

    @admin.display(boolean=True, description="Can log in", ordering="user__is_active")
    def login_active(self, faculty):
        return faculty.user.is_active
