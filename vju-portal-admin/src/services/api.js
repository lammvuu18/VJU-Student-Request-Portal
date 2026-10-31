// =============================================================================
// VJU PORTAL API CLIENT SERVICE
// Conforming to Specification: d:\VJU_EF\api-contract.md
// Base URL: http://localhost:8080/api
// Supports automatic fallback to mock data when backend server is offline.
// =============================================================================

import * as mock from '../data/mockData';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// Helper to store & read JWT
export const getAuthToken = () => localStorage.getItem('vju_token') || '';
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('vju_token', token);
  } else {
    localStorage.removeItem('vju_token');
  }
};

export const getSavedRole = () => localStorage.getItem('vju_role') || 'student';
export const setSavedRole = (role) => localStorage.setItem('vju_role', role);

export const getSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('vju_user')) || null;
  } catch (e) {
    return null;
  }
};
export const setSavedUser = (user) => {
  if (user) {
    localStorage.setItem('vju_user', JSON.stringify(user));
    if (user.role) setSavedRole(user.role);
  } else {
    localStorage.removeItem('vju_user');
  }
};


/**
 * Core fetch wrapper with timeout, Authorization header, and fallback to mock data
 */
async function apiFetch(endpoint, options = {}, mockFallbackFn = null) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If body is FormData, delete Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for local backend

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.error?.message || json.message || 'API request failed');
      err.status = res.status;
      err.code = json.error?.code;
      throw err;
    }
    return json;
  } catch (err) {
    // If backend returned HTTP error (401, 403, 400...), raise it to let UI handle real business rules
    if (err.status) {
      throw err;
    }
    // If backend is offline or network error, use contract mock fallback
    if (mockFallbackFn) {
      console.info(`[API Service Fallback] Backend at ${BASE_URL} not responding. Using mock data for "${endpoint}".`);
      return mockFallbackFn();
    }
    throw err;
  }
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
      if (email.includes('admin')) { mockRole = 'admin'; redirectUrl = '/admin'; }
      else if (email.includes('truongphong') || email.includes('thuha')) { mockRole = 'dept_head'; redirectUrl = '/dept-head'; }
      else if (email.includes('hieutruong') || email.includes('vanbinh')) { mockRole = 'principal'; redirectUrl = '/principal'; }
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
            ...mock.users[mockRole === 'dept_head' ? 'deptHead' : mockRole],
            role: mockRole,
            redirect_url: redirectUrl,
          }
        },
        message: 'Đăng nhập thành công',
      };
    });
    if (res && res.data) {
      setAuthToken(res.data.access_token);
      setSavedUser(res.data.user);
    }
    return res;
  },

  loginGoogle: async (googleToken, email = null) => {
    const res = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        google_token: googleToken,
        id_token: googleToken,
        email: email
      }),
    }, () => {
      const userEmail = email || (typeof googleToken === 'string' && googleToken.includes('@') ? googleToken : 'minhanh@st.vju.ac.vn');
      let mockRole = 'student';
      let redirectUrl = '/student';

      if (userEmail.includes('admin')) { mockRole = 'admin'; redirectUrl = '/admin'; }
      else if (userEmail.includes('truongphong') || userEmail.includes('thuha')) { mockRole = 'dept_head'; redirectUrl = '/dept-head'; }
      else if (userEmail.includes('chuyenvien') || userEmail.includes('hoangnam')) { mockRole = 'staff'; redirectUrl = '/staff'; }
      else if (userEmail.includes('hieutruong') || userEmail.includes('vanbinh')) { mockRole = 'principal'; redirectUrl = '/principal'; }

      return {
        success: true,
        data: {
          access_token: 'mock-jwt-google-' + mockRole + '-' + Date.now(),
          expires_in: 86400,
          user: {
            ...mock.users[mockRole === 'dept_head' ? 'deptHead' : mockRole],
            email: userEmail,
            role: mockRole,
            redirect_url: redirectUrl,
          }
        },
        message: 'Đăng nhập Google thành công',
      };
    });
    if (res && res.data) {
      setAuthToken(res.data.access_token);
      setSavedUser(res.data.user);
    }
    return res;
  },

  getMe: async () => {
    const currentRole = getSavedRole();
    const res = await apiFetch('/auth/me', { method: 'GET' }, () => {
      const user = getSavedUser() || mock.users[currentRole] || mock.users.student;
      return {
        success: true,
        data: user,
      };
    });
    if (res && res.data) {
      setSavedUser(res.data);
    }
    return res;
  },

  logout: async () => {
    setAuthToken(null);
    setSavedUser(null);
    return apiFetch('/auth/logout', { method: 'POST' }, () => ({
      success: true,
      message: 'Đăng xuất thành công',
    }));
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
export const requestApi = {
  getMyRequests: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const endpoint = `/requests/my${qs ? `?${qs}` : ''}`;

    return apiFetch(endpoint, { method: 'GET' }, () => {
      let list = [...mock.allRequests];
      if (params.status && params.status !== 'all') {
        list = list.filter(r => r.status === params.status || r.internal_status === params.status);
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

  create: async (payload) => {
    return apiFetch('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => {
      const reqId = Date.now();
      const code = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900 + 100))}`;
      const proc = mock.procedures.find(p => p.type_id === payload.type_id || p.id === payload.type_id) || mock.procedures[0];

      return {
        success: true,
        data: {
          request_id: reqId,
          request_code: code,
          status: proc.is_fee_required ? 'Chờ thanh toán' : 'Đã gửi',
          internal_status: proc.is_fee_required ? 'Chờ thanh toán' : 'Chờ phân công',
          sla_deadline: new Date(Date.now() + proc.sla_total_days * 86400000).toISOString(),
          is_fee_required: proc.is_fee_required,
          fee_amount: proc.fee_amount || 0,
        },
        message: 'Tạo yêu cầu thành công',
      };
    });
  },

  getDetail: async (id) => {
    return apiFetch(`/requests/${id}`, { method: 'GET' }, () => {
      const req = mock.allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || mock.allRequests[0];
      return {
        success: true,
        data: req,
      };
    });
  },

  cancel: async (id, reason = '') => {
    return apiFetch(`/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, () => ({
      success: true,
      message: 'Hủy yêu cầu thành công',
      data: {
        request_id: id,
        status: 'Đã hủy',
      },
    }));
  },

  supplement: async (id, payload) => {
    return apiFetch(`/requests/${id}/supplement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Nộp bổ sung hồ sơ thành công',
      data: {
        request_id: id,
        status: 'Đang xử lý',
        internal_status: 'CV đang thẩm định',
      },
    }));
  },

  getTimeline: async (id) => {
    return apiFetch(`/requests/${id}/timeline`, { method: 'GET' }, () => {
      const req = mock.allRequests.find(r => r.id === id || String(r.request_id) === String(id)) || mock.allRequests[0];
      return {
        success: true,
        data: [
          { action: 'Nộp yêu cầu', actor_name: req.student || 'Sinh viên', created_at: req.created_at || '2026-10-28T10:00:00', note: 'Khởi tạo hồ sơ trực tuyến' },
          { action: 'Tiếp nhận hồ sơ', actor_name: req.assignee || 'Chuyên viên', created_at: req.date || '2026-10-29T08:30:00', note: 'Đã nhận hồ sơ và kiểm tra thông tin' },
          { action: 'Cập nhật trạng thái', actor_name: 'Hệ thống VJU', created_at: req.date || '2026-10-29T15:00:00', note: `Trạng thái: ${req.status}` },
        ],
      };
    });
  },
};

// =============================================================================
// 4. PAYMENTS API (Contract Section 4)
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

  getStatus: async (orderId) => {
    return apiFetch(`/payments/${orderId}/status`, { method: 'GET' }, () => ({
      success: true,
      data: {
        order_id: orderId,
        payment_status: 'SUCCESS',
        paid_at: new Date().toISOString(),
        payment_method: 'VNPay',
      },
    }));
  },
};

// =============================================================================
// 5. RESULTS API (Contract Section 5)
// =============================================================================
export const resultApi = {
  download: (requestId) => {
    return `${BASE_URL}/results/${requestId}/download`;
  },
  preview: (requestId) => {
    return `${BASE_URL}/results/${requestId}/preview`;
  },
};

// =============================================================================
// 6. FEEDBACK API (Contract Section 6)
// =============================================================================
export const feedbackApi = {
  submit: async (payload) => {
    return apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Gửi đánh giá thành công. Cảm ơn bạn đã đóng góp ý kiến!',
    }));
  },
};

// =============================================================================
// 7. VERIFICATION API (Contract Section 7)
// =============================================================================
export const verifyApi = {
  verifyDocument: async (code) => {
    return apiFetch(`/verify/${code}`, { method: 'GET' }, () => ({
      success: true,
      data: {
        is_valid: true,
        verification_code: code,
        document_type: 'Giấy xác nhận sinh viên',
        request_code: 'REQ-20261030-001',
        student_name: 'Nguyễn Quốc Anh',
        mssv: '21CS001',
        issued_at: '2026-10-29T15:00:00',
        signed_by: 'PGS.TS Nguyễn Văn Bình - Hiệu trưởng',
        cert_serial: '5401:0023:A9F1:4832:B120:7761',
      },
    }));
  },
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
// =============================================================================
export const staffApi = {
  getInbox: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/staff/inbox${qs ? `?${qs}` : ''}`, { method: 'GET' }, () => {
      let list = [...mock.allRequests];
      if (params.status && params.status !== 'all') {
        list = list.filter(r => r.internal_status === params.status || r.status === params.status);
      }
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        list = list.filter(r =>
          r.id.toLowerCase().includes(kw) ||
          r.student.toLowerCase().includes(kw) ||
          r.mssv.toLowerCase().includes(kw) ||
          r.procedure.toLowerCase().includes(kw)
        );
      }
      return {
        success: true,
        data: list,
        pagination: {
          current_page: parseInt(params.page || 1),
          total_pages: Math.ceil(list.length / 10),
          total_items: list.length,
        },
      };
    });
  },

  assign: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Phân công chuyên viên thành công',
      data: {
        request_id: requestId,
        assigned_to_user_id: payload.assigned_to_user_id,
        internal_status: 'CV đang thẩm định',
      },
    }));
  },

  getDepartmentMembers: async () => {
    return apiFetch('/staff/department-members', { method: 'GET' }, () => ({
      success: true,
      data: mock.staff,
    }));
  },

  approve: async (requestId, payload = {}) => {
    return apiFetch(`/staff/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Chuyên viên đã thẩm định và duyệt hồ sơ',
      data: {
        request_id: requestId,
        internal_status: 'Đã duyệt — Đang chuẩn bị kết quả',
        status: 'Đã duyệt',
      },
    }));
  },

  submitToHead: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/submit-to-head`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã trình hồ sơ lên Trưởng phòng phê duyệt',
      data: {
        request_id: requestId,
        internal_status: 'Chờ TP phê duyệt',
      },
    }));
  },

  reject: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã từ chối yêu cầu',
      data: {
        request_id: requestId,
        status: 'Từ chối',
        internal_status: 'Từ chối',
      },
    }));
  },

  requestSupplement: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/request-supplement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã gửi yêu cầu bổ sung minh chứng cho sinh viên',
      data: {
        request_id: requestId,
        status: 'Cần bổ sung',
        internal_status: 'Cần bổ sung',
      },
    }));
  },

  transferDepartment: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/transfer-department`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Chuyển tiếp hồ sơ sang phòng ban khác thành công',
      data: {
        request_id: requestId,
        department_id: payload.target_department_id,
        internal_status: 'Chờ phân công',
      },
    }));
  },

  deptHeadApprove: async (requestId, payload = {}) => {
    return apiFetch(`/staff/requests/${requestId}/head-approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Trưởng phòng đã phê duyệt hồ sơ thành công',
      data: {
        request_id: requestId,
        internal_status: 'Đã duyệt — Đang chuẩn bị kết quả',
        status: 'Đã duyệt',
      },
    }));
  },

  submitToPrincipal: async (requestId, payload = {}) => {
    return apiFetch(`/staff/requests/${requestId}/submit-to-principal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã trình văn bản lên Hiệu trưởng ký số',
      data: {
        request_id: requestId,
        internal_status: 'Chờ HT ký số',
      },
    }));
  },

  returnToStaff: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/return-to-staff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã trả lại hồ sơ cho chuyên viên bổ sung, hoàn thiện',
      data: {
        request_id: requestId,
        internal_status: 'CV đang thẩm định',
      },
    }));
  },

  assignPickup: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/assign-pickup`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Đã tạo lịch hẹn nhận kết quả và phát hành bản điện tử',
      data: {
        request_id: requestId,
        internal_status: 'Đã duyệt — Đang chuẩn bị kết quả',
      },
    }));
  },

  confirmHandover: async (requestId, payload) => {
    return apiFetch(`/staff/requests/${requestId}/handover`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, () => ({
      success: true,
      message: 'Xác nhận trao trả hồ sơ cho sinh viên thành công',
      data: {
        request_id: requestId,
        status: 'Đã xử lý',
        internal_status: 'Đã xử lý',
      },
    }));
  },
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
  feedback: feedbackApi,
  verify: verifyApi,
  notifications: notificationApi,
  staff: staffApi,
  principal: principalApi,
  admin: adminApi,
};

export default api;
