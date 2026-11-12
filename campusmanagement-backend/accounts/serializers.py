from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Faculty, Student, User


class LoginSerializer(serializers.Serializer):
    """
    Checks the three things the login page sends:
    username, password and the selected role.
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.Role.choices)

    def to_internal_value(self, data):
        # The login page sends "Student" / "Faculty" / "Admin"; our roles are
        # stored as "STUDENT" / "FACULTY" / "ADMIN", so make the match case-insensitive.
        data = data.copy()
        if isinstance(data.get("role"), str):
            data["role"] = data["role"].strip().upper()
        return super().to_internal_value(data)

    def validate(self, data):
        # 1. Is the username + password correct?
        user = authenticate(username=data["username"], password=data["password"])
        if user is None:
            raise serializers.ValidationError("Invalid username or password.")

        # 2. Did they pick the right role button (Student / Faculty / Admin)?
        if user.role != data["role"]:
            raise serializers.ValidationError(
                f"This account is not registered as {data['role'].title()}."
            )

        data["user"] = user
        return data

    def build_response(self):
        """Create the login tokens + basic user info to send back."""
        user = self.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role  # put the role inside the token too
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }


class UserSerializer(serializers.ModelSerializer):
    """Basic account info plus the person's details from the students/faculty table."""

    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "role", "profile"]

    def get_profile(self, user):
        # Follow the link user -> student / faculty row (matched by id)
        if user.role == User.Role.STUDENT:
            s = Student.objects.filter(pk=user.pk).first()
            if s:
                return {"name": s.name, "roll_no": s.roll_no, "email": s.email,
                        "department": s.department, "year": s.year}
        elif user.role == User.Role.FACULTY:
            f = Faculty.objects.filter(pk=user.pk).first()
            if f:
                return {"name": f.name, "email": f.email, "department": f.department}
        # Admins have no extra table
        return {"name": user.username.title()}
