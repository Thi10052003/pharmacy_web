"use client"

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hàm xử lý đăng xuất tập trung
  const handleLogout = useCallback(() => {
    console.warn("Hệ thống tự động làm mới phiên làm việc...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Dùng window.location.href để ép trình duyệt refresh sạch sẽ bộ nhớ
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    // --- 1. KIỂM TRA QUYỀN TRUY CẬP CƠ BẢN ---
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthorized(true);

    // --- 2. LOGIC CHỐNG TREO MÁY (INACTIVITY TIMER) ---
    // Giới hạn 1 tiếng (3600000ms). Bạn có thể chỉnh xuống 30p nếu muốn bảo mật hơn.
    const INACTIVITY_LIMIT = 360 * 60 * 1000; 
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_LIMIT);
    };

    // Lắng nghe các hành động thực tế của dược sĩ tại quầy
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // Bắt đầu đếm ngược ngay khi vào trang

    // Dọn dẹp để tránh rò rỉ bộ nhớ (Memory leak)
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [pathname, router, handleLogout]);

  if (!isAuthorized) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Spin size="large" tip="Đang kiểm tra bảo mật..." />
      </div>
    );
  }

  return <>{children}</>;
}