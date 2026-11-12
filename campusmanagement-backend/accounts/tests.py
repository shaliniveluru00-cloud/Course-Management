from rest_framework.test import APITestCase

from .models import User

LOGIN_URL = "/api/auth/login/"


class LoginTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student001", password="Stu@2026_001", role="STUDENT"
        )
        User.objects.create_user(
            username="faculty01", password="Fac@2026_01", role="FACULTY"
        )

    def login(self, username, password, role):
        return self.client.post(
            LOGIN_URL,
            {"username": username, "password": password, "role": role},
            format="json",
        )

    def test_correct_login_returns_tokens(self):
        res = self.login("student001", "Stu@2026_001", "STUDENT")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertEqual(res.data["user"]["role"], "STUDENT")

    def test_wrong_password_is_rejected(self):
        res = self.login("student001", "wrong", "STUDENT")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["message"], "Invalid username or password.")

    def test_wrong_role_is_rejected(self):
        res = self.login("faculty01", "Fac@2026_01", "STUDENT")
        self.assertEqual(res.status_code, 400)
        self.assertIn("not registered as Student", res.data["message"])

    def test_missing_fields_are_rejected(self):
        res = self.client.post(LOGIN_URL, {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_me_requires_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

        token = self.login("student001", "Stu@2026_001", "STUDENT").data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["username"], "student001")

    def test_password_is_stored_hashed(self):
        self.assertNotEqual(self.student.password, "Stu@2026_001")

    def test_frontend_origin_is_allowed(self):
        res = self.client.options(
            LOGIN_URL,
            HTTP_ORIGIN="http://localhost:5175",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(res["access-control-allow-origin"], "http://localhost:5175")
