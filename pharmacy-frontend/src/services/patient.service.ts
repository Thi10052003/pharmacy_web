import api from "./api";

// ==========================================
// 1. ĐỊNH NGHĨA LẠI KIỂU DỮ LIỆU (MÔ HÌNH MỚI)
// ==========================================

export interface PatientProfile {
  id: string;
  accountId: string;
  fullName: string;
  gender?: string;
  birthYear?: number;
  relationship: string; // VD: Chủ hộ, Vợ, Con...
  createdAt?: string;
}

export interface Account {
  id: string;
  phone: string;
  totalPoints: number;
  profiles: PatientProfile[]; // Chứa danh sách các thành viên bên trong
  createdAt?: string;
}

// ==========================================
// 2. CÁC HÀM GỌI API
// ==========================================

// Lấy danh sách gia đình (Tìm theo SĐT hoặc Tên thành viên)
export const getAllAccounts = async (search?: string) => {
  const res = await api.get("/patients", { params: { search } });
  return res.data as Account[];
};

// Tạo Gia đình mới (SĐT + Tên người chủ hộ đầu tiên)
export const createAccount = async (data: { phone: string; fullName: string; gender?: string; birthYear?: number }) => {
  const res = await api.post("/patients", data);
  return res.data;
};

// Đổi số điện thoại của Tài khoản (Ví gia đình)
export const updateAccountPhone = async (accountId: string, phone: string) => {
  const res = await api.put(`/patients/${accountId}`, { phone });
  return res.data;
};

// Thêm 1 Thành viên mới vào Gia đình đã có
export const addProfileToAccount = async (accountId: string, data: Omit<PatientProfile, "id" | "accountId" | "createdAt">) => {
  const res = await api.post(`/patients/${accountId}/profiles`, data);
  return res.data;
};

// Sửa thông tin 1 Thành viên (Đổi tên, năm sinh, quan hệ...)
export const updateProfile = async (profileId: string, data: Partial<PatientProfile>) => {
  const res = await api.put(`/patients/profiles/${profileId}`, data);
  return res.data;
};