from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    # Opening just http://localhost:8000/ goes straight to the admin site
    path("", RedirectView.as_view(url="/admin/")),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("courses.urls")),
]
