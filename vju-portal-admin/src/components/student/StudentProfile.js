import React from 'react';
import { users } from '../../data/mockData';
import './StudentPages.css';

function StudentProfile() {
  const student = users?.student || {};

  // Exact Figma values with fallback to mock data
  const fullName = student.name || student.full_name || 'Nguyễn Minh Anh';
  const studentCode = '23110150'; // Figma spec
  const email = '23110150@vnu.edu.vn'; // Figma spec
  const className = 'QH-2023-I/CQ-M-CLC'; // Figma spec
  const cohort = 'QH-2023'; // Figma spec
  const major = 'Khoa học máy tính'; // Figma spec
  const status = 'Đang học'; // Figma spec

  return (
    <div className="student-profile-container">
      {/* Page Title */}
      <h1 className="student-profile-title">Hồ sơ cá nhân</h1>

      {/* Profile Information Card */}
      <div className="student-profile-card">
        {/* Card Title */}
        <h2 className="student-profile-card-title">Thông tin của sinh viên</h2>
        <div style={{ alignSelf: 'stretch', height: 14 }} />
        <div className="req-detail-divider" />

        {/* Row 1: Họ và tên */}
        <div className="student-profile-row">
          <div className="student-profile-label">Họ và tên</div>
          <div className="student-profile-value">{fullName}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 2: Mã số sinh viên */}
        <div className="student-profile-row">
          <div className="student-profile-label">Mã số sinh viên</div>
          <div className="student-profile-value">{studentCode}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 3: Email */}
        <div className="student-profile-row">
          <div className="student-profile-label">Email</div>
          <div className="student-profile-value">{email}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 4: Lớp */}
        <div className="student-profile-row">
          <div className="student-profile-label">Lớp</div>
          <div className="student-profile-value">{className}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 5: Khóa */}
        <div className="student-profile-row">
          <div className="student-profile-label">Khóa</div>
          <div className="student-profile-value">{cohort}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 6: Ngành */}
        <div className="student-profile-row">
          <div className="student-profile-label">Ngành</div>
          <div className="student-profile-value">{major}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 7: Tình trạng học tập */}
        <div className="student-profile-row">
          <div className="student-profile-label">Tình trạng học tập</div>
          <div className="student-status-badge">
            <span className="student-status-badge-text">{status}</span>
          </div>
        </div>
        <div className="req-detail-divider" />
      </div>
    </div>
  );
}

export default StudentProfile;
