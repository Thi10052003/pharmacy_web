// src/services/auth.service.ts
import api from "./api";

export const login = async (data: { username: string; password: string }) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

// Hàm đăng xuất (Xóa token)
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login"; // Đẩy về trang đăng nhập
};