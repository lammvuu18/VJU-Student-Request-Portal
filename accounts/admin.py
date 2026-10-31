from django.contrib import admin
from .models import Department, StudentRegistry, User

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('dept_id', 'name', 'code', 'is_active')
    search_fields = ('name', 'code')

@admin.register(StudentRegistry)
class StudentRegistryAdmin(admin.ModelAdmin):
    list_display = ('mssv', 'full_name', 'email', 'class_name', 'cohort', 'major', 'academic_status')
    search_fields = ('mssv', 'full_name', 'email', 'class_name')
    list_filter = ('academic_status', 'cohort', 'major')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'full_name', 'email', 'role', 'department', 'authority_level', 'account_status')
    search_fields = ('full_name', 'email')
    list_filter = ('role', 'department', 'account_status')
