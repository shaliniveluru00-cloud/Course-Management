from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: {"username": "...", "password": "...", "role": "STUDENT|FACULTY|ADMIN"}
    """

    permission_classes = [AllowAny]  # anyone can try to log in

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            # Flatten errors into one message the frontend can show directly
            errors = serializer.errors
            message = (errors.get("non_field_errors") or ["Please fill in all fields."])[0]
            return Response(
                {"message": str(message), "errors": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(serializer.build_response(), status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET /api/auth/me/
    Header: Authorization: Bearer <access token>
    Returns who is logged in. Useful to test the token works.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
