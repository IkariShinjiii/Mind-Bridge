const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";
const BASE = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${normalizedPath}`;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await res.json();

  if (res.status === 401 && localStorage.getItem("token")) {
    // The token we sent was rejected (expired or otherwise invalid).
    // Let AuthContext know so it can log the user out with an explanation,
    // instead of every screen having to handle this individually.
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const getSurvey = () => request("/survey");
export const submitResponse = (answers) =>
  request("/responses", { method: "POST", body: JSON.stringify({ answers }) });
export const getResponses = () => request("/responses");
export const getAssessments = () => request("/assessments");
export const updateResponseStatus = (id, status) =>
  request(`/responses/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const updateAssessmentStatus = (id, status) =>
  request(`/assessments/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getAvailability = () => request("/availability");
export const getMyAvailability = () => request("/availability/mine");
export const addAvailability = (start, end) =>
  request("/availability", { method: "POST", body: JSON.stringify({ start, end }) });
export const removeAvailability = (id) =>
  request(`/availability/${id}`, { method: "DELETE" });

export const bookAppointment = (availabilityId) =>
  request("/appointments", { method: "POST", body: JSON.stringify({ availabilityId }) });
export const getAppointments = () => request("/appointments");
export const updateAppointment = (id, updates = {}) =>
  request(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(updates) });

export const resendVerification = () => request("/auth/resend-verification", { method: "POST" });
export const forgotPassword = (email) =>
  request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
export const resetPassword = (token, password) =>
  request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
export const refreshSession = () => request("/auth/refresh", { method: "POST" });

export const getAdminUsers = () => request("/admin/users");
export const approveCounselor = (id) => request(`/admin/users/${id}/approve`, { method: "POST" });
export const rejectCounselor = (id) => request(`/admin/users/${id}/reject`, { method: "POST" });
export const deactivateUser = (id) => request(`/admin/users/${id}/deactivate`, { method: "POST" });
export const reactivateUser = (id) => request(`/admin/users/${id}/reactivate`, { method: "POST" });
