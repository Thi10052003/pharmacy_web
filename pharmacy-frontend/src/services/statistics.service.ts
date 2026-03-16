import api from "./api"; // Chỉnh lại đường dẫn import nếu cần

// Đã sửa lại tên biến cho khớp với Backend
export interface DashboardSummary {
  revenue: number;
  refunded: number;
  successfulOrders: number;
  totalPatients: number;
  lowStockMedicines: number;
}

export interface TopMedicine {
  name: string;
  unit: string;
  totalSold: number;
}

export interface TopPatient {
  fullName: string;
  phone: string;
  totalPoints: number;
}

export interface RevenueTrend {
  time: string;
  value: number;
}

export const getRevenueTrend = async (period: string): Promise<RevenueTrend[]> => {
  const res = await api.get(`/stats/revenue-trend?period=${period}`);
  return res.data;
};

export const getTopPointsPatients = async (): Promise<TopPatient[]> => {
  const res = await api.get("/stats/top-points");
  return res.data;
};

export const getStatsSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get("/stats/summary");
  return res.data;
};

export const getTopMedicines = async (): Promise<TopMedicine[]> => {
  const res = await api.get("/stats/top-medicines");
  return res.data;
};