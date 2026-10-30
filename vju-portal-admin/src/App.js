import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Styles
import './styles/variables.css';
import './styles/global.css';

// Common components & layouts
import AppLayout from './components/common/AppLayout';
import AdminLayout from './components/layouts/AdminLayout';

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
  { label: 'Trang chủ', path: '/student', icon: '🏠' },
  { label: 'Danh mục thủ tục', path: '/student/procedures', icon: '📋' },
  { label: 'Yêu cầu của tôi', path: '/student/dashboard', icon: '📄' },
  { label: 'Hồ sơ', path: '/student/profile', icon: '👤' },
];

const deptHeadSidebar = [
  { label: 'Tổng quan', path: '/dept-head', icon: '📊' },
  { label: 'Tất cả yêu cầu', path: '/dept-head/requests', icon: '📋' },
  { label: 'Thống kê', path: '/dept-head/statistics', icon: '📈' },
];

const staffSidebar = [
  { label: 'Tổng quan', path: '/staff', icon: '📊' },
  { label: 'Yêu cầu được giao', path: '/staff/requests', icon: '📋' },
];

const principalSidebar = [
  { label: 'Quyết định', path: '/principal/decisions', icon: '📝' },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Student Routes */}
        <Route path="/student" element={<AppLayout userName={users.student.name} sidebarItems={studentSidebar} />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="procedures" element={<ProcedureCatalog />} />
          <Route path="catalog" element={<Navigate to="/student/procedures" replace />} />
          <Route path="procedure/:id" element={<ProcedureDetail />} />
          <Route path="request/new" element={<RequestForm />} />
          <Route path="request/new/:procedureId" element={<RequestForm />} />
          <Route path="request/success" element={<RequestSuccess />} />
          <Route path="request/supplement" element={<SupplementForm />} />
          <Route path="request/supplement/success" element={<SupplementSuccess />} />
          <Route path="request/result" element={<ReceiveResult />} />
          <Route path="feedback" element={<FeedbackForm />} />
          <Route path="request/:id" element={<RequestDetail />} />
          <Route path="request/:id/supplement" element={<SupplementForm />} />
          <Route path="request/:id/supplement/success" element={<SupplementSuccess />} />
          <Route path="request/:id/receive" element={<ReceiveResult />} />
          <Route path="request/:id/feedback" element={<FeedbackForm />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Dept Head Routes */}
        <Route path="/dept-head" element={<AppLayout userName={users.deptHead.name} sidebarItems={deptHeadSidebar} />}>
          <Route index element={<DeptHeadOverview />} />
          <Route path="requests" element={<DeptHeadRequestList />} />
          <Route path="request/:id" element={<DeptHeadRequestDetail />} />
          <Route path="statistics" element={<DeptHeadStatistics />} />
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<AppLayout userName={users.staff.name} sidebarItems={staffSidebar} />}>
          <Route index element={<StaffOverview />} />
          <Route path="requests" element={<StaffRequestList />} />
          <Route path="request/:id" element={<StaffRequestDetail />} />
          <Route path="request/:id/review" element={<StaffReviewForm />} />
          <Route path="request/:id/issue" element={<StaffIssueResult />} />
        </Route>

        {/* Principal Routes */}
        <Route path="/principal" element={<AppLayout userName={users.principal.name} sidebarItems={principalSidebar} />}>
          <Route index element={<Navigate to="/principal/decisions" replace />} />
          <Route path="decisions" element={<PrincipalDecisionList />} />
          <Route path="decision/:id" element={<PrincipalDecisionDetail />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
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
