import React, { useState, useEffect } from 'react';
import { users } from '../../data/mockData';
import { authApi } from '../../services/api';
import './StudentPages.css';

function StudentProfile() {
  const fallback = users?.student || {};
  const [profile, setProfile] = useState(fallback);

  useEffect(() => {
    let isMounted = true;
    async function fetchMe() {
      try {
        const res = await authApi.getMe();
        if (isMounted && res && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch /auth/me:', err);
      }
    }
    fetchMe();
    return () => {
      isMounted = false;
    };
  }, []);

  const fullName = profile.full_name || profile.name || fallback.name || 'Nguyễn Minh Anh';
  const studentCode = profile.mssv || '21CS001';
  const email = profile.email || 'minhanh@st.vju.ac.vn';
  const className = profile.class_name || profile.lop || 'QH-2023-I/CQ-M-CLC';
  const cohort = profile.cohort || profile.khoa || 'QH-2023';
  const major = profile.major || profile.nganh || 'Khoa học máy tính';

  // Map academic_status to display label & style
  const academicStatus = profile.academic_status || 'active';
  let statusText = 'Đang học';
  let badgeStyle = {};

  if (academicStatus === 'suspended') {
    statusText = 'Bảo lưu';
    badgeStyle = {
      background: '#FEF3C7',
      color: '#B45309',
      border: '1px solid #FCD34D',
      fontWeight: 600,
    };
  } else if (academicStatus === 'graduated') {
    statusText = 'Đã tốt nghiệp';
    badgeStyle = {
      background: '#E0E7FF',
      color: '#4338CA',
      border: '1px solid #C7D2FE',
    };
  } else if (academicStatus === 'dismissed') {
    statusText = 'Buộc thôi học';
    badgeStyle = {
      background: '#FEE2E2',
      color: '#DC2626',
      border: '1px solid #FCA5A5',
    };
  } else {
    statusText = 'Đang học';
  }

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
          <div className="student-status-badge" style={badgeStyle}>
            <span
              className="student-status-badge-text"
              style={badgeStyle.color ? { color: badgeStyle.color } : {}}
            >
              {statusText}
            </span>
          </div>
        </div>
        <div className="req-detail-divider" />
      </div>
    </div>
  );
}

export default StudentProfile;
