import api from "./api";

// Giữ lại interface cho Medicine và CartItem (Nút giao giữa đơn và thuốc)
export interface PrescriptionItem {
  id: string;
  medicineId: string;
  quantity: number;
  priceSnapshot: number;
  dosage?: string;
  sellUnit?: string;
  conversionRatio?: number;
  medicine?: any; 
}

// ==========================================
// SỬA LẠI PAYLOAD GỬI LÊN KHI THANH TOÁN
// ==========================================
export interface CheckoutPayload {
  accountId?: string | null;          // Trỏ về ví gia đình
  patientProfileId?: string | null;   // Trỏ về người dùng thuốc
  items: {
    medicineId: string;
    selectedUnit: string;
    quantity: number;
    dosage?: string;
    priceSnapshot: number;
  }[];
  totalAmount: number;
  earnedPoints: number;
}

// Hàm thanh toán (Truyền đúng chuẩn Payload mới)
export const createPrescription = async (data: CheckoutPayload) => {
  const res = await api.post("/prescriptions/checkout", data);
  return res.data;
};

// Các hàm lấy lịch sử (Giữ nguyên cấu trúc gọi)
export const getAllPrescriptions = async (search?: string) => {
  const res = await api.get("/prescriptions", { params: { search } });
  return res.data;
};

export const getPrescriptionById = async (id: string) => {
  const res = await api.get(`/prescriptions/${id}`);
  return res.data;
};

export const cancelPrescription = async (id: string) => {
  const res = await api.post(`/prescriptions/${id}/cancel`);
  return res.data;
};

export const getRecentPrescriptionByProfileId = async (profileId: string) => {
  const res = await api.get(`/prescriptions/patient/${profileId}/recent`);
  return res.data;
};