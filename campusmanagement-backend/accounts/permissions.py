from rest_framework.permissions import BasePermission

from .models import User


class IsStudent(BasePermission):
    """Allows only logged-in users whose role is STUDENT."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == User.Role.STUDENT)

