from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    # Swap an old refresh token for a new access token
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
