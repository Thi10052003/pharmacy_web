import api from "./api";

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  debt: number; // Công nợ tự động cập nhật từ phiếu nhập
  createdAt: string;
}

export const getAllSuppliers = async (): Promise<Supplier[]> => {
  const res = await api.get("/suppliers");
  return res.data;
};

export const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
  const res = await api.post("/suppliers", data);
  return res.data;
};

export const updateSupplier = async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
  const res = await api.put(`/suppliers/${id}`, data);
  return res.data;
};
export const paySupplierDebt = async (supplierId: string, data: { amount: number, paymentMethod: string, note?: string }) => {
  const res = await api.post(`/suppliers/${supplierId}/pay`, data);
  return res.data;
};