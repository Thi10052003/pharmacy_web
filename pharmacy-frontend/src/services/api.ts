import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Nhét chìa khóa vào Header
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Xử lý lỗi từ Backend trả về
api.interceptors.response.use(
  (response) => response, // Nếu thành công thì cứ cho đi tiếp
  (error) => {
    // Nếu Server trả về lỗi 401 (Token hết hạn hoặc sai)
    if (error.response && error.response.status === 401) {
      console.warn("Phiên làm việc hết hạn, đang chuyển hướng về Login...");
      
      // Xóa sạch dấu vết cũ để tránh lag
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Đẩy người dùng ra trang Login ngay lập tức
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
export default api
