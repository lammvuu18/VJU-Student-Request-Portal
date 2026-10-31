import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Styles
import './styles/variables.css';
import './styles/global.css';

// Common components & layouts
import AppLayout from './components/common/AppLayout';
import AdminLayout from './components/layouts/AdminLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { getAuthToken, getSavedRole, ROLE_ACCOUNTS, normalizeRole } from './services/api';

// Auth
import LoginPage from './components/auth/LoginPage';

// Student pages
import StudentDashboard from './components/student/StudentDashboard';
import ProcedureCatalog from './components/student/ProcedureCatalog';
import ProcedureDetail from './components/student/ProcedureDetail';
import RequestForm from './components/student/RequestForm';
import RequestSuccess from './components/student/RequestSuccess';
import RequestDetail from './components/student/RequestDetail';
import SupplementForm from './components/student/SupplementForm';
import SupplementSuccess from './components/student/SupplementSuccess';
import ReceiveResult from './components/student/ReceiveResult';
import FeedbackForm from './components/student/FeedbackForm';
import FeedbackSuccess from './components/student/FeedbackSuccess';
import StudentProfile from './components/student/StudentProfile';

// Dept Head pages
import DeptHeadOverview from './components/depthead/DeptHeadOverview';
import DeptHeadRequestList from './components/depthead/DeptHeadRequestList';
import DeptHeadRequestDetail from './components/depthead/DeptHeadRequestDetail';
import DeptHeadStatistics from './components/depthead/DeptHeadStatistics';

// Staff pages
import StaffOverview from './components/staff/StaffOverview';
import StaffRequestList from './components/staff/StaffRequestList';
import StaffRequestDetail from './components/staff/StaffRequestDetail';
import StaffReviewForm from './components/staff/StaffReviewForm';
import StaffIssueResult from './components/staff/StaffIssueResult';

// Principal pages
import PrincipalDecisionList from './components/principal/PrincipalDecisionList';
import PrincipalDecisionDetail from './components/principal/PrincipalDecisionDetail';

// Admin pages
import ProcedureList from './features/admin/procedures/ProcedureList';
import ProcedureEdit from './features/admin/procedures/ProcedureEdit';
import AccountManagement from './features/admin/accounts/AccountManagement';

// Import user data
import { users } from './data/mockData';

// Sidebar configs per role
const studentSidebar = [
  { label: 'Yêu cầu của tôi', path: '/student/dashboard' },
  { label: 'Danh mục thủ tục', path: '/student/procedures' },
  { label: 'Hồ sơ cá nhân', path: '/student/profile' },
];

const deptHeadSidebar = [
  { label: 'Tổng quan', path: '/dept-head' },
  { label: 'Tất cả yêu cầu', path: '/dept-head/requests' },
  { label: 'Thống kê phòng', path: '/dept-head/statistics' },
];

const staffSidebar = [
  { label: 'Tổng quan', path: '/staff' },
  { label: 'Tất cả yêu cầu', path: '/staff/requests' },
];

const principalSidebar = [
  { label: 'Danh sách quyết định', path: '/principal/decisions' },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={
            getAuthToken() ? (
              <Navigate
                to={
                  (ROLE_ACCOUNTS[normalizeRole(getSavedRole())] || ROLE_ACCOUNTS.student).homePath
                }
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <AppLayout userName={users.student.name} sidebarItems={studentSidebar} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="procedures" element={<ProcedureCatalog />} />
          <Route path="catalog" element={<Navigate to="/student/procedures" replace />} />
          <Route path="procedure/:id" element={<ProcedureDetail />} />
          <Route path="request/new" element={<RequestForm />} />
          <Route path="request/new/:procedureId" element={<RequestForm />} />
          <Route path="request/payment" element={<RequestForm initialStep={2} />} />
          <Route path="request/payment/:procedureId" element={<RequestForm initialStep={2} />} />
          <Route path="request/success" element={<RequestSuccess />} />
          <Route path="request/supplement" element={<SupplementForm />} />
          <Route path="request/supplement/success" element={<SupplementSuccess />} />
          <Route path="request/result" element={<ReceiveResult />} />
          <Route path="feedback" element={<FeedbackForm />} />
          <Route path="feedback/success" element={<FeedbackSuccess />} />
          <Route path="request/:id" element={<RequestDetail />} />
          <Route path="request/:id/supplement" element={<SupplementForm />} />
          <Route path="request/:id/supplement/success" element={<SupplementSuccess />} />
          <Route path="request/:id/receive" element={<ReceiveResult />} />
          <Route path="request/:id/feedback" element={<FeedbackForm />} />
          <Route path="request/:id/feedback/success" element={<FeedbackSuccess />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Dept Head Routes */}
        <Route
          path="/dept-head"
          element={
            <ProtectedRoute allowedRole="deptHead">
              <AppLayout userName={users.deptHead.name} sidebarItems={deptHeadSidebar} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DeptHeadOverview />} />
          <Route path="requests" element={<DeptHeadRequestList />} />
          <Route path="request/supplement" element={<DeptHeadRequestDetail defaultOpenSupplement={true} />} />
          <Route path="request/supplement-sent" element={<DeptHeadRequestDetail defaultStatus="Cần bổ sung" defaultToast="Đã gửi yêu cầu bổ sung cho SV" />} />
          <Route path="request/reject" element={<DeptHeadRequestDetail defaultOpenReject={true} />} />
          <Route path="request/reject-modal" element={<DeptHeadRequestDetail defaultOpenReject={true} />} />
          <Route path="request/rejected" element={<DeptHeadRequestDetail defaultStatus="Từ chối" defaultToast="Đã từ chối yêu cầu VJU-2026-0840" />} />
          <Route path="request/c4d" element={<DeptHeadRequestDetail defaultStatus="Từ chối" defaultToast="Đã từ chối yêu cầu VJU-2026-0840" />} />
          <Route path="request/:id" element={<DeptHeadRequestDetail />} />
          <Route path="statistics" element={<DeptHeadStatistics />} />
        </Route>

        {/* Staff Routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRole="staff">
              <AppLayout userName={users.staff.name} sidebarItems={staffSidebar} />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffOverview />} />
          <Route path="requests" element={<StaffRequestList />} />
          <Route path="request/transfer" element={<StaffRequestDetail />} />
          <Route path="request/transferred" element={<StaffRequestDetail defaultStatus="Đã chuyển PB" defaultToast="Đã chuyển yêu cầu sang Phòng KHTC" />} />
          <Route path="request/review" element={<StaffReviewForm />} />
          <Route path="request/appeal-review" element={<StaffReviewForm />} />
          <Route path="review" element={<StaffReviewForm />} />
          <Route path="request/issue" element={<StaffIssueResult />} />
          <Route path="request/result" element={<StaffIssueResult />} />
          <Route path="issue" element={<StaffIssueResult />} />
          <Route path="request/:id" element={<StaffRequestDetail />} />
          <Route path="request/:id/review" element={<StaffReviewForm />} />
          <Route path="request/:id/appeal-review" element={<StaffReviewForm />} />
          <Route path="request/:id/issue" element={<StaffIssueResult />} />
        </Route>

        {/* Principal Routes */}
        <Route
          path="/principal"
          element={
            <ProtectedRoute allowedRole="principal">
              <AppLayout userName={users.principal.name} sidebarItems={principalSidebar} />
            </ProtectedRoute>
          }
        >
          <Route index element={<PrincipalDecisionList />} />
          <Route path="decisions" element={<PrincipalDecisionList />} />
          <Route path="decision" element={<PrincipalDecisionDetail />} />
          <Route path="decision/detail" element={<PrincipalDecisionDetail />} />
          <Route path="decision/:id" element={<PrincipalDecisionDetail />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="procedures" replace />} />
          <Route path="procedures" element={<ProcedureList />} />
          <Route path="procedures/edit" element={<ProcedureEdit />} />
          <Route path="accounts" element={<AccountManagement />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
