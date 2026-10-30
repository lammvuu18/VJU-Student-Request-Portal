import React from 'react';
import { users } from '../../data/mockData';
import './StudentPages.css';

function StudentProfile() {
  const student = users.student;

  return (
    <div className="student-profile">
      <h1 className="page-title">Hồ sơ cá nhân</h1>
      <p className="page-subtitle">Thông tin sinh viên</p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          <div className="profile-header">
            <div className="profile-avatar">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="34" stroke="#E2E5EA" strokeWidth="2"/>
                <circle cx="36" cy="28" r="10" fill="#9CA3AF"/>
                <path d="M16 60c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#9CA3AF"/>
              </svg>
            </div>
            <div className="profile-name-info">
              <h2>{student.name}</h2>
              <p>{student.mssv} — {student.nganh}</p>
            </div>
          </div>

          <table className="info-table" style={{ marginTop: 24 }}>
            <tbody>
              <tr><th>Họ và tên</th><td>{student.name}</td></tr>
              <tr><th>MSSV</th><td>{student.mssv}</td></tr>
              <tr><th>Email</th><td>{student.email}</td></tr>
              <tr><th>Ngành</th><td>{student.nganh}</td></tr>
              <tr><th>Lớp</th><td>{student.lop}</td></tr>
              <tr><th>Khóa</th><td>{student.khoa}</td></tr>
              <tr><th>Trạng thái</th><td style={{ color: '#059669', fontWeight: 600 }}>Đang học</td></tr>
              <tr><th>Ngày nhập học</th><td>01/09/2022</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
