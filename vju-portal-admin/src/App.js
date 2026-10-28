import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/common/AdminLayout';
import ProcedureList from './components/procedures/ProcedureList';
import ProcedureEdit from './components/procedures/ProcedureEdit';
import AccountManagement from './components/accounts/AccountManagement';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/procedures" replace />} />
          <Route path="/procedures" element={<ProcedureList />} />
          <Route path="/procedures/edit" element={<ProcedureEdit />} />
          <Route path="/accounts" element={<AccountManagement />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

export default App;
