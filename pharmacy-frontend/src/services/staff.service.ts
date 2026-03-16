import api from "./api";

export const getStaffs = async () => {
  const res = await api.get("/auth/users");
  return res.data;
};

export const createStaff = async (data: any) => {
  const res = await api.post("/auth/register-staff", data);
  return res.data;
};

export const changePassword = async (id: string, newPassword: string) => {
  const res = await api.put(`/auth/users/${id}/password`, { newPassword });
  return res.data;
};

export const toggleStaffStatus = async (id: string, isActive: boolean) => {
  const res = await api.put(`/auth/users/${id}/status`, { isActive });
  return res.data;
};