// =============================================================================
// VJU PORTAL API CLIENT SERVICE
// Theo đặc tả api-contract.md ở thư mục gốc repo
// Base URL: REACT_APP_API_BASE_URL, mặc định http://localhost:8000/api
// Đặt REACT_APP_USE_MOCK=true để dùng dữ liệu mock khi chưa chạy backend.
// =============================================================================

import * as mock from '../data/mockData';

export const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
export const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// Helper to store & read JWT
export const getAuthToken = () => localStorage.getItem('vju_token') || '';
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('vju_token', token);
  } else {
    localStorage.removeItem('vju_token');
  }
};

export const normalizeRole = (r) => {
  if (!r) return 'student';
  if (r === 'dept_head') return 'deptHead';
  return r;
};

export const getSavedRole = () => normalizeRole(localStorage.getItem('vju_role'));
export const setSavedRole = (role) => localStorage.setItem('vju_role', normalizeRole(role));

// 5 Dedicated Accounts corresponding to 5 Roles
export const ROLE_ACCOUNTS = {
  student: {
    role: 'student',
    roleCode: 'student',
    roleName: 'Sinh viên',
    email: 'student@vju.ac.vn',
    secondaryEmail: 'minhanh@vju.ac.vn',
    password: 'password123',
    defaultPassword: '123456',
    name: 'Nguyễn Minh Anh',
    department: 'Khóa K2021 - Khoa học Máy tính',
    homePath: '/student/dashboard',
    allowedPrefix: '/student',
    badgeColor: '#10B981',
    userObj: mock.users.student,
  },
  staff: {
    role: 'staff',
    roleCode: 'staff',
    roleName: 'Chuyên viên',
    email: 'staff@vju.ac.vn',
    secondaryEmail: 'nam.lh@vju.ac.vn',
    password: 'password123',
    defaultPassword: '123456',
    name: 'Lê Hoàng Nam',
    department: 'Phòng Đào tạo',
    homePath: '/staff',
    allowedPrefix: '/staff',
    badgeColor: '#3B82F6',
    userObj: mock.users.staff,
  },
  deptHead: {
    role: 'deptHead',
    roleCode: 'dept_head',
    roleName: 'Trưởng phòng',
    email: 'depthead@vju.ac.vn',
    secondaryEmail: 'thuha@vju.ac.vn',
    password: 'password123',
    defaultPassword: '123456',
    name: 'Trần Thu Hà',
    department: 'Phòng Đào tạo',
    homePath: '/dept-head',
    allowedPrefix: '/dept-head',
    badgeColor: '#8B5CF6',
    userObj: mock.users.deptHead,
  },
  principal: {
    role: 'principal',
    roleCode: 'principal',
    roleName: 'Hiệu trưởng',
    email: 'principal@vju.ac.vn',
    secondaryEmail: 'binh.nv@vju.ac.vn',
    password: 'password123',
    defaultPassword: '123456',
    name: 'PGS.TS Nguyễn Văn Bình',
    department: 'Ban Giám hiệu',
    homePath: '/principal/decisions',
    allowedPrefix: '/principal',
    badgeColor: '#F59E0B',
    userObj: mock.users.principal,
  },
  admin: {
    role: 'admin',
    roleCode: 'admin',
    roleName: 'Quản trị viên (Admin)',
    email: 'admin@vju.ac.vn',
    secondaryEmail: 'quantri@vju.ac.vn',
    password: 'password123',
    defaultPassword: '123456',
    name: 'Quản trị viên Hệ thống',
    department: 'Trung tâm CNTT & Quản trị mạng',
    homePath: '/admin/procedures',
    allowedPrefix: '/admin',
    badgeColor: '#AA2327',
    userObj: mock.users.admin,
  },
};

export const findAccountByEmail = (inputEmail) => {
  if (!inputEmail) return null;
  const lower = inputEmail.trim().toLowerCase();
  for (const key of Object.keys(ROLE_ACCOUNTS)) {
    const acc = ROLE_ACCOUNTS[key];
    if (
      acc.email.toLowerCase() === lower ||
      (acc.secondaryEmail && acc.secondaryEmail.toLowerCase() === lower) ||
      (acc.role === 'admin' && (lower.includes('admin') || lower.includes('quantri'))) ||
      (acc.role === 'deptHead' && (lower.includes('truongphong') || lower.includes('thuha') || lower.includes('depthead'))) ||
      (acc.role === 'staff' && (lower.includes('chuyenvien') || lower.includes('hoangnam') || lower.includes('nam.lh') || lower.includes('staff'))) ||
      (acc.role === 'principal' && (lower.includes('hieutruong') || lower.includes('vanbinh') || lower.includes('binh.nv') || lower.includes('principal'))) ||
      (acc.role === 'student' && (lower.includes('sinhvien') || lower.includes('minhanh') || lower.includes('student')))
    ) {
      return acc;
    }
  }
  return null;
};

export const loginWithRole = (roleKey) => {
  const normKey = normalizeRole(roleKey);
  const account = ROLE_ACCOUNTS[normKey] || ROLE_ACCOUNTS.student;
  const token = `mock-jwt-${account.role}-${Date.now()}`;
  setAuthToken(token);
  setSavedRole(account.role);
  localStorage.setItem('vju_user', JSON.stringify(account.userObj));
  return account;
};

export const logout = () => {
  localStorage.removeItem('vju_token');
  localStorage.removeItem('vju_role');
  localStorage.removeItem('vju_user');
};

export const getCurrentUser = () => {
  const raw = localStorage.getItem('vju_user');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  const currentRole = getSavedRole();
  const acc = ROLE_ACCOUNTS[currentRole] || ROLE_ACCOUNTS.student;
  return acc.userObj;
};

// Render free tier có thể mất gần 1 phút để khởi động lại backend sau khi ngủ
const REQUEST_TIMEOUT_MS = 60000;

// Đường dẫn backend trả về dạng /api/..., ghép với gốc của BASE_URL
const toAbsoluteUrl = (endpoint) => {
  if (/^https?:\/\//.test(endpoint)) return endpoint;
  if (endpoint.startsWith('/api/')) return BASE_URL.replace(/\/api\/?$/, '') + endpoint;
  return `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const handleUnauthorized = (endpoint) => {
  // Token hết hạn hoặc bị thu hồi: xóa phiên và quay về trang đăng nhập
  if (endpoint.startsWith('/auth/')) return;
  logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?error=' + encodeURIComponent('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
};

async function sendRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // FormData cần trình duyệt tự đặt Content-Type kèm boundary; GET không cần Content-Type
  if (options.body instanceof FormData || !options.body) {
    delete headers['Content-Type'];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(toAbsoluteUrl(endpoint), { ...options, headers, signal: controller.signal });
  } catch (err) {
    const networkErr = new Error(
      err.name === 'AbortError'
        ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
        : `Không kết nối được máy chủ (${BASE_URL}).`
    );
    networkErr.isNetworkError = true;
    throw networkErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildHttpError(res, endpoint) {
  const json = await res.json().catch(() => ({}));
  const err = new Error(json.error?.message || json.message || `Yêu cầu thất bại (mã ${res.status}).`);
  err.status = res.status;
  err.code = json.error?.code;
  if (res.status === 401) handleUnauthorized(endpoint);
  return err;
}

/**
 * Gọi API backend. Dữ liệu mock chỉ dùng khi bật REACT_APP_USE_MOCK=true và backend không kết nối được.
 */
async function apiFetch(endpoint, options = {}, mockFallbackFn = null) {
  let res;
  try {
    res = await sendRequest(endpoint, options);
  } catch (err) {
    if (USE_MOCK && mockFallbackFn) {
      console.info(`[API mock] Backend ${BASE_URL} không phản hồi, dùng dữ liệu mock cho "${endpoint}".`);
      return mockFallbackFn();
    }
    throw err;
  }

  if (!res.ok) throw await buildHttpError(res, endpoint);
  return res.json().catch(() => ({}));
}

/**
 * Tải file cần token về dạng object URL (dùng cho iframe xem trước). Người gọi tự revokeObjectURL.
 */
export async function fetchFileUrl(endpoint) {
  const res = await sendRequest(endpoint, { method: 'GET' });
  if (!res.ok) throw await buildHttpError(res, endpoint);
  return URL.createObjectURL(await res.blob());
}

/**
 * Tải file cần token (PDF kết quả, file đính kèm) rồi lưu về máy hoặc mở tab mới.
 * Backend không expose Content-Disposition qua CORS nên tên file lấy từ fileName truyền vào.
 */
export async function downloadFile(endpoint, fileName = 'tai-lieu', { openInNewTab = false } = {}) {
  const url = await fetchFileUrl(endpoint);

  if (openInNewTab) {
    window.open(url, '_blank', 'noopener');
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// =============================================================================
// 1. AUTH API (Contract Section 1)
// =============================================================================
export const authApi = {
  login: async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, () => {
      let mockRole = 'staff';
      let redirectUrl = '/staff';
      if (email.includes('admin') || email.includes('quantri')) { mockRole = 'admin'; redirectUrl = '/admin/procedures'; }
      else if (email.includes('truongphong') || email.includes('thuha') || email.includes('depthead')) { mockRole = 'dept_head'; redirectUrl = '/dept-head'; }
      else if (email.includes('hieutruong') || email.includes('vanbinh') || email.includes('principal')) { mockRole = 'principal'; redirectUrl = '/principal/decisions'; }
      else if (email.includes('st.vju.ac.vn')) {
        const err = new Error("Sinh viên chỉ có thể đăng nhập bằng tài khoản Google VJU (@st.vju.ac.vn), không được dùng mật khẩu.");
        err.status = 403;
        throw err;
      }
      return {
        success: true,
        data: {
          access_token: 'mock-jwt-token-' + mockRole + '-' + Date.now(),
          expires_in: 86400,
          user: {
            ...(mock.users[mockRole === 'dept_head' ? 'deptHead' : mockRole] || mock.users.staff),
            email,
            role: mockRole,
            redirect_url: redirectUrl,
          }
        },
        message: 'Đăng nhập thành công',
      };
    });
    if (res && res.data) {
      if (res.data.access_token) setAuthToken(res.data.access_token);
      if (res.data.user) {
        localStorage.setItem('vju_user', JSON.stringify(res.data.user));
        if (res.data.user.role) setSavedRole(res.data.user.role);
      }
    }
    return res;
  },

  loginGoogle: async (googleToken, email = null) => {
    const userEmail = email || (typeof googleToken === 'string' && googleToken.includes('@') ? googleToken : 'student01@st.vju.ac.vn');
    const res = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        google_token: googleToken || userEmail,
        id_token: googleToken || userEmail,
        email: userEmail
      }),
    }, () => {
      let mockRole = 'student';
      let redirectUrl = '/student/dashboard';
      if (userEmail.includes('admin')) { mockRole = 'admin'; redirectUrl = '/admin/procedures'; }
      else if (userEmail.includes('truongphong') || userEmail.includes('thuha')) { mockRole = 'dept_head'; redirectUrl = '/dept-head'; }
      else if (userEmail.includes('chuyenvien') || userEmail.includes('hoangnam')) { mockRole = 'staff'; redirectUrl = '/staff'; }
      else if (userEmail.includes('hieutruong') || userEmail.includes('vanbinh')) { mockRole = 'principal'; redirectUrl = '/principal/decisions'; }

      return {
        success: true,
        data: {
          access_token: 'mock-jwt-google-' + mockRole + '-' + Date.now(),
          expires_in: 86400,
          user: {
            ...(mock.users[mockRole === 'dept_head' ? 'deptHead' : mockRole] || mock.users.student),
            email: userEmail,
            role: mockRole,
            redirect_url: redirectUrl,
          }
        },
        message: 'Đăng nhập Google thành công',
      };
    });
    if (res && res.data) {
      if (res.data.access_token) setAuthToken(res.data.access_token);
      if (res.data.user) {
        localStorage.setItem('vju_user', JSON.stringify(res.data.user));
        if (res.data.user.role) setSavedRole(res.data.user.role);
      }
    }
    return res;
  },

  getMe: async () => {
    const currentRole = getSavedRole();
    const res = await apiFetch('/auth/me', { method: 'GET' }, () => {
      const user = getCurrentUser() || mock.users[currentRole] || mock.users.student;
      return {
        success: true,
        data: user,
      };
    });
    if (res && res.data) {
      localStorage.setItem('vju_user', JSON.stringify(res.data));
    }
    return res;
  },

  logout: async () => {
    try {
      return await apiFetch('/auth/logout', { method: 'POST' }, () => ({
        success: true,
        message: 'Đăng xuất thành công',
      }));
    } finally {
      logout();
    }
  },

  refreshToken: async (refreshToken) => {
    return apiFetch('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, () => ({
      success: true,
      data: {
        token: 'mock-new-jwt-token-' + Date.now(),
        expires_in: 86400,
      },
    }));
  },
};

// =============================================================================
// 2. PROCEDURES API (Contract Section 2)
// =============================================================================
export const procedureApi = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const endpoint = `/procedures${qs ? `?${qs}` : ''}`;

    return apiFetch(endpoint, { method: 'GET' }, () => {
      let filtered = [...mock.procedures];
      if (params.department_id) {
        filtered = filtered.filter(p => p.department_id === parseInt(params.department_id));
      }
      if (params.category && params.category !== 'all') {
        filtered = filtered.filter(p => p.category === params.category);
      }
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
      }
      return {
        success: true,
        data: filtered,
        total: filtered.length,
      };
    });
  },

  getDetail: async (id) => {
    return apiFetch(`/procedures/${id}`, { method: 'GET' }, () => {
      const p = mock.procedures.find(proc => proc.id === parseInt(id) || proc.type_id === parseInt(id)) || mock.procedures[0];
      return {
        success: true,
        data: p,
      };
    });
  },
};

// =============================================================================
// 3. STUDENT REQUESTS API (Contract Section 3)
// =============================================================================

// Ghép file đính kèm theo định dạng multipart backend yêu cầu:
// attachments[i][config_id], attachments[i][file]
const appendAttachments = (formData, attachments = []) => {
  attachments.forEach((item, idx) => {
    formData.append(`attachments[${idx}][config_id]`, String(item.config_id));
    formData.append(`attachments[${idx}][file]`, item.file);
  });
};

// Bỏ tham số rỗng hoặc 'all' trước khi đưa lên query string
const toQueryString = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
};

export const requestApi = {
  // params: { page, limit, status, type_id }
  getMyRequests: async (params = {}) => apiFetch(`/requests${toQueryString(params)}`, { method: 'GET' }),

  /**
   * payload: { type_id, form_data: {...}, attachments: [{ config_id, file }] }
   */
  create: async ({ type_id, form_data, attachments = [] }) => {
    const body = new FormData();
    body.append('type_id', String(type_id));
    body.append('form_data', JSON.stringify(form_data || {}));
    appendAttachments(body, attachments);
    return apiFetch('/requests', { method: 'POST', body });
  },

  getDetail: async (id) => apiFetch(`/requests/${id}`, { method: 'GET' }),

  cancel: async (id) => apiFetch(`/requests/${id}/cancel`, { method: 'PUT' }),

  // attachments: [{ config_id, file }]
  supplement: async (id, attachments = []) => {
    const body = new FormData();
    appendAttachments(body, attachments);
    return apiFetch(`/requests/${id}/supplements`, { method: 'POST', body });
  },

  getTimeline: async (id) => apiFetch(`/requests/${id}/timeline`, { method: 'GET' }),

  // payload: { star_rating, speed_score, attitude_score, convenience_score, comment_text }
  feedback: async (id, payload) => apiFetch(`/requests/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

// =============================================================================
// 4. PAYMENTS API (Contract Section 4) — backend chưa có, chỉ chạy ở chế độ mock
// =============================================================================
export const paymentApi = {
  create: async (payload) => {
    return apiFetch('/payments/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        order_id: `VJU-PAY-${Date.now()}`,
        payment_url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=true',
        qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=VJU-PAYMENT-MOCK',
        amount: payload.amount || 50000,
        currency: 'VND',
        expires_at: new Date(Date.now() + 900000).toISOString(),
      },
    }));
  },
};

// =============================================================================
// 5. RESULTS & ATTACHMENTS (Contract Section 5) — cần token nên tải qua fetch
// =============================================================================
export const resultApi = {
  // pdfDownloadUrl là result.pdf_download_url trong chi tiết đơn (/api/results/:id/download)
  download: (pdfDownloadUrl, fileName) => downloadFile(pdfDownloadUrl, fileName || 'ket-qua.pdf'),
  preview: (pdfDownloadUrl) => downloadFile(pdfDownloadUrl, 'ket-qua.pdf', { openInNewTab: true }),
};

export const attachmentApi = {
  // downloadUrl là attachments[i].download_url trong chi tiết đơn
  download: (downloadUrl, fileName) => downloadFile(downloadUrl, fileName),
  preview: (downloadUrl, fileName) => downloadFile(downloadUrl, fileName, { openInNewTab: true }),
};

// =============================================================================
// 6. FEEDBACK API (Contract Section 6)
// =============================================================================
export const feedbackApi = {
  submit: async (requestId, payload) => requestApi.feedback(requestId, payload),
};

// =============================================================================
// 7. VERIFICATION API (Contract Section 7) — public, không cần token
// =============================================================================
export const verifyApi = {
  verifyDocument: async (code) => apiFetch(`/verify/${encodeURIComponent(code)}`, { method: 'GET' }),
};

// =============================================================================
// 8. NOTIFICATIONS API (Contract Section 8)
// =============================================================================
export const notificationApi = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/notifications${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => ({
      success: true,
      data: [
        {
          notification_id: 1,
          title: 'Hồ sơ đã được phê duyệt',
          message: 'Yêu cầu REQ-20261030-001 của bạn đã được Hiệu trưởng ký số thành công.',
          type: 'approved',
          is_read: false,
          target_url: '/student/request/REQ-20261030-001',
          created_at: '2026-10-30T10:00:00',
        },
        {
          notification_id: 2,
          title: 'Yêu cầu bổ sung hồ sơ',
          message: 'Yêu cầu REQ-20261030-003 cần bổ sung giấy tiếp nhận từ đơn vị thực tập.',
          type: 'supplement',
          is_read: false,
          target_url: '/student/request/REQ-20261030-003',
          created_at: '2026-10-29T14:30:00',
        },
        {
          notification_id: 3,
          title: 'Thanh toán lệ phí thành công',
          message: 'Giao dịch thanh toán 30.000 VNĐ cho mã yêu cầu REQ-20261030-004 đã hoàn tất.',
          type: 'payment',
          is_read: true,
          target_url: '/student/request/REQ-20261030-004',
          created_at: '2026-10-28T09:15:00',
        },
      ],
      unread_count: 2,
    }));
  },

  markAsRead: async (id) => {
    return apiFetch(`/notifications/${id}/read`, { method: 'PUT' }, () => ({
      success: true,
      message: 'Đã đánh dấu đã đọc',
    }));
  },

  markAllAsRead: async () => {
    return apiFetch('/notifications/read-all', { method: 'PUT' }, () => ({
      success: true,
      message: 'Đã đánh dấu tất cả là đã đọc',
    }));
  },
};

// =============================================================================
// 9. STAFF & DEPARTMENT HEAD API (Contract Section 9)
// Quy trình 1 cấp: TP phân công → CV duyệt / từ chối / yêu cầu bổ sung → hẹn nhận bản cứng → bàn giao
// =============================================================================
const putJson = (endpoint, payload = {}) => apiFetch(endpoint, {
  method: 'PUT',
  body: JSON.stringify(payload),
});

export const staffApi = {
  // params: { page, limit, internal_status, type_id }
  getInbox: async (params = {}) => apiFetch(`/staff/inbox${toQueryString(params)}`, { method: 'GET' }),

  getDepartmentMembers: async () => apiFetch('/staff/department-members', { method: 'GET' }),

  getRejectionReasons: async () => apiFetch('/rejection-reasons', { method: 'GET' }),

  // TP phân công chuyên viên
  assign: async (requestId, assignedStaffId) =>
    putJson(`/staff/requests/${requestId}/assign`, { assigned_staff_id: assignedStaffId }),

  // CV duyệt, backend sinh PDF kết quả
  approve: async (requestId, note = '') =>
    putJson(`/staff/requests/${requestId}/approve`, note ? { note } : {}),

  // Gửi reason_id, hoặc note ít nhất 20 ký tự khi không chọn lý do có sẵn
  reject: async (requestId, { reason_id = null, note = '' } = {}) =>
    putJson(`/staff/requests/${requestId}/reject`, {
      ...(reason_id ? { reason_id } : {}),
      ...(note ? { note } : {}),
    }),

  requestSupplement: async (requestId, note) =>
    putJson(`/staff/requests/${requestId}/request-supplement`, { note }),

  // payload: { pickup_date: ISO datetime, pickup_location, pickup_note }
  assignPickup: async (requestId, payload) =>
    putJson(`/staff/requests/${requestId}/assign-pickup`, payload),

  confirmHandover: async (requestId) =>
    putJson(`/staff/requests/${requestId}/confirm-handover`),

  revoke: async (requestId, note = '') =>
    putJson(`/staff/requests/${requestId}/revoke`, note ? { note } : {}),
};

// =============================================================================
// 10. PRINCIPAL API (Contract Section 10)
// =============================================================================
export const principalApi = {
  getPendingSignatures: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/principal/pending-signatures${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => ({
      success: true,
      data: mock.decisions,
      total: mock.decisions.length,
    }));
  },

  signSmartCA: async (payload) => {
    return apiFetch('/principal/sign-smartca', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        transaction_id: `VNPT-TXN-${Date.now()}`,
        status: 'pending_push',
        message: 'Vui lòng mở ứng dụng VNPT/Viettel SmartCA trên thiết bị để xác thực sinh trắc học hoàn tất ký số.',
        expires_in_seconds: 180,
      },
      message: 'Lệnh ký số đã được gửi đến thiết bị di động của Hiệu trưởng',
    }));
  },

  returnToHead: async (requestId, payload) => {
    return apiFetch(`/principal/requests/${requestId}/return-to-head`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã trả lại hồ sơ cho Trưởng phòng kiểm tra lại',
      data: {
        request_id: requestId,
        internal_status: 'Chờ TP phê duyệt',
      },
    }));
  },
};

// =============================================================================
// 11. ADMIN API (Contract Section 11)
// =============================================================================
export const adminApi = {
  getProcedures: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/admin/procedures${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => ({
      success: true,
      data: mock.procedures,
      total: mock.procedures.length,
    }));
  },

  createProcedure: async (payload) => {
    return apiFetch('/admin/procedures', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        type_id: Date.now(),
        ...payload,
      },
      message: 'Tạo thủ tục mới thành công',
    }));
  },

  updateProcedure: async (id, payload) => {
    return apiFetch(`/admin/procedures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        type_id: id,
        ...payload,
      },
      message: 'Cập nhật cấu hình thủ tục thành công',
    }));
  },

  deleteProcedure: async (id) => {
    return apiFetch(`/admin/procedures/${id}`, { method: 'DELETE' }, () => ({
      success: true,
      message: 'Xóa thủ tục thành công',
    }));
  },

  getUsers: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => {
      let list = [];
      if (params.role === 'student') list = mock.students;
      else if (params.role === 'staff') list = mock.staff;
      else if (params.role === 'principal') list = [mock.principal];
      else list = [...mock.students, ...mock.staff, mock.principal];

      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        list = list.filter(u =>
          (u.name && u.name.toLowerCase().includes(kw)) ||
          (u.email && u.email.toLowerCase().includes(kw)) ||
          (u.mssv && u.mssv.toLowerCase().includes(kw))
        );
      }

      return {
        success: true,
        data: list,
        pagination: {
          current_page: parseInt(params.page || 1),
          total_pages: Math.ceil(list.length / (params.limit || 10)),
          total_items: list.length,
        },
      };
    });
  },

  createUser: async (payload) => {
    return apiFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        user_id: Date.now(),
        ...payload,
      },
      message: 'Tạo tài khoản người dùng thành công',
    }));
  },

  updateUser: async (id, payload) => {
    return apiFetch(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      data: {
        user_id: id,
        ...payload,
      },
      message: 'Cập nhật thông tin tài khoản thành công',
    }));
  },

  importStudents: async (formData) => {
    return apiFetch('/admin/users/import-students', {
      method: 'POST',
      body: formData,
    }, () => ({
      success: true,
      data: {
        imported_count: 50,
        failed_count: 0,
        errors: [],
      },
      message: 'Import danh sách sinh viên từ Excel thành công (50 tài khoản)',
    }));
  },

  getRejectionReasons: async () => {
    return apiFetch('/rejection-reasons', { method: 'GET' }, () => ({
      success: true,
      data: mock.rejectionReasons,
    }));
  },

  getDashboard: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/admin/dashboard${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => ({
      success: true,
      data: mock.adminDashboard,
    }));
  },
};

// Unified export
const api = {
  auth: authApi,
  procedures: procedureApi,
  requests: requestApi,
  payments: paymentApi,
  results: resultApi,
  attachments: attachmentApi,
  feedback: feedbackApi,
  verify: verifyApi,
  notifications: notificationApi,
  staff: staffApi,
  principal: principalApi,
  admin: adminApi,
};

export default api;
