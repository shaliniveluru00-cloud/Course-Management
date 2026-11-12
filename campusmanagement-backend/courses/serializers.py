from rest_framework import serializers

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    # Not a column on Course: pulled from the linked Faculty row
    faculty_name = serializers.CharField(source="faculty.name", read_only=True)

    class Meta:
        model = Course
        fields = ["code", "name", "credits", "faculty_name"]
