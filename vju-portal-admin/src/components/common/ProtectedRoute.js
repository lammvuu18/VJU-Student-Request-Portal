import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken, getSavedRole, normalizeRole, ROLE_ACCOUNTS } from '../../services/api';

/**
 * ProtectedRoute:
 * - If not authenticated (no token) -> Redirect to /login
 * - If authenticated but accessing an unauthorized role's routes -> Redirect to the user's role home path
 */
function ProtectedRoute({ allowedRole, children }) {
  const location = useLocation();
  const token = getAuthToken();
  const currentRole = getSavedRole();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const curNorm = normalizeRole(currentRole);
  const allowedNorm = normalizeRole(allowedRole);

  if (curNorm !== allowedNorm) {
    const userAccount = ROLE_ACCOUNTS[curNorm] || ROLE_ACCOUNTS.student;
    return <Navigate to={userAccount.homePath} replace />;
  }

  return children;
}

export default ProtectedRoute;

