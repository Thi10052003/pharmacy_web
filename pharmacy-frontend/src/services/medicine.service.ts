import api from "@/services/api"

// 1. Interface đại diện cho một Lô hàng cụ thể
export interface Batch {
  id: string
  batchNumber: string  // Số lô
  expiryDate: string    // Hạn sử dụng (ISO Date)
  remainingQuantity: number // Tồn kho thực tế của lô này
  purchasePrice: number // Giá vốn đơn vị gốc
  createdAt?: string
}

// 2. Interface Medicine hoàn chỉnh
export interface Medicine {
  id: string
  code?: string
  name: string
  isActive: boolean
  
  // Cấp 1: Đơn vị nhỏ nhất (Gốc)
  baseUnitName: string
  baseUnitPrice: number

  // Cấp 2: Đơn vị trung gian (Vỉ/Lốc)
  subUnitName?: string | null
  pillsPerSubUnit?: number | null
  subUnitPrice?: number | null

  // Cấp 3: Đơn vị lớn (Hộp/Thùng)
  mainUnitName?: string | null
  mainUnitRatio?: number | null
  mainUnitPrice?: number | null

  // Tồn kho tổng hợp
  currentStock: number
  
  // Quan hệ lô hàng mới được thêm vào
  batches?: Batch[] 
  
  createdAt?: string
  updatedAt?: string
}

// --- CÁC HÀM GỌI API ---

// 1. Lấy tất cả thuốc (Bao gồm cả thông tin lô hàng để kiểm tra HSD)
export const getAllMedicines = async (): Promise<Medicine[]> => {
  const res = await api.get("/medicines") 
  return res.data
}

// 2. Lấy thuốc còn hàng (Dành cho POS, Backend sẽ tự lọc thuốc isActive = true)
export const getAvailableMedicines = async (): Promise<Medicine[]> => {
  const res = await api.get("/medicines/available")
  return res.data
}

// 3. Tạo thuốc mới
export const createMedicine = async (
  data: Omit<Medicine, "id" | "isActive" | "createdAt" | "updatedAt" | "batches">
): Promise<Medicine> => {
  const res = await api.post("/medicines", data)
  return res.data
}

// 4. Cập nhật thông tin thuốc (Hỗ trợ cả Soft Delete qua trường isActive)
export const updateMedicine = async (id: string, data: Partial<Medicine>): Promise<Medicine> => {
  const res = await api.put(`/medicines/${id}`, data);
  return res.data;
};

// 5. Xóa thuốc (Hard Delete - Chỉ thành công nếu chưa có giao dịch hoặc theo logic Backend mới)
export const deleteMedicine = async (id: string): Promise<void> => {
  await api.delete(`/medicines/${id}`);
};
export const toggleMedicineStatus = async ({ id, isActive }: { id: string; isActive: boolean }) => {
  // Trỏ đúng vào endpoint PATCH /:id/status vừa tạo
  const res = await api.patch(`/medicines/${id}/status`, { isActive });
  return res.data;
};