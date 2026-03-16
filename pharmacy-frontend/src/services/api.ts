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
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== "undefined") {
        // KIỂM TRA: Nếu ĐANG Ở TRANG LOGIN thì KHÔNG tải lại trang (để hiện lỗi màu đỏ)
        if (window.location.pathname !== "/login") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login"; // Bị đẩy ra ngoài nếu đang ở trong Dashboard mà token hết hạn
        }
      }
    }
    return Promise.reject(error);
  }
);
export default api
