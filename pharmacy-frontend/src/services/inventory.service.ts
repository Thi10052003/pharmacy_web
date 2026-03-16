import api from "@/services/api";
import { Medicine } from "./medicine.service";

// --- INTERFACES ---

// Chi tiết lịch sử kho (Cập nhật để hiển thị thông tin Lô hàng)
export interface InventoryHistory {
  id: string;
  medicineId: string;
  batchId?: string;     // Liên kết với lô hàng cụ thể
  action: string;      // IMPORT, EXPORT, PRESCRIPTION, CANCEL_PRESCRIPTION
  quantity: number;
  stockAfter: number;
  note?: string;
  createdAt: string;
  medicine?: Medicine;
}

// Cấu trúc một dòng hàng trong Phiếu nhập
export interface ImportItemPayload {
  medicineId: string;
  batchNumber: string;  // Số lô *
  expiryDate: string;   // Hạn sử dụng *
  unitName: string;     // Đơn vị tính (Viên/Vỉ/Hộp)
  quantity: number;     // Số lượng
  purchasePrice: number;// Đơn giá nhập
}

// Cấu trúc toàn bộ Phiếu nhập kho (Import Bill)
export interface ImportBillPayload {
  supplierId: string;    // Nhà cung cấp (F4) *
  invoiceCode?: string;  // Mã hóa đơn từ nhà cung cấp
  items: ImportItemPayload[];
  paidAmount: number;    // Thanh toán (F6)
  paymentMethod: string; // Tiền mặt / Chuyển khoản
  note?: string;         // Ghi chú
}

// --- API FUNCTIONS ---

// 1. Nhập kho theo Phiếu nhập chuyên sâu
export const importInventory = async (data: ImportBillPayload) => {
  const res = await api.post("/inventory/import", data);
  return res.data;
};

// 2. Lấy nhật ký biến động kho
export const getInventoryHistory = async (): Promise<InventoryHistory[]> => {
  const res = await api.get("/inventory/history");
  return res.data;
};

// 3. Lấy danh sách các Phiếu nhập kho đã thực hiện
export const getImportBills = async () => {
  const res = await api.get("/inventory/import-bills");
  return res.data;
};

// 4. Xuất kho thủ công / Điều chỉnh kho
// Đối với xuất kho, ta vẫn giữ medicineId và thêm batchId nếu muốn chỉ định lô cần xuất
export interface ExportPayload {
  medicineId: string;
  batchId?: string;
  quantity: number;
  note?: string;
}

export const exportInventory = async (data: ExportPayload) => {
  const res = await api.post("/inventory/export", data);
  return res.data;
};

export const getExpiryWarnings = async () => {
  const res = await api.get("/inventory/expiry-warnings");
  return res.data;
};