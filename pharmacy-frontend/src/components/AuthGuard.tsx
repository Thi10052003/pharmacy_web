// src/components/AuthGuard.tsx
"use client"

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Theo dõi xem người dùng đang ở trang nào

  useEffect(() => {
    // 1. Lấy chìa khóa từ túi (localStorage) ra kiểm tra
    const token = localStorage.getItem("token");

    // 2. Nếu không có chìa khóa -> Đuổi về trang Đăng nhập
    if (!token) {
      router.push("/login");
    } else {
      // 3. Có chìa khóa -> Cho phép vào nhà
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  // Trong lúc đang kiểm tra (chớp mắt 0.1s), hiện cái vòng xoay Loading 
  // để tránh việc giao diện bên trong bị lộ ra ngoài một khoảnh khắc (Flash of content)
  if (!isAuthorized) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Spin size="large" tip="Đang kiểm tra bảo mật..." />
      </div>
    );
  }

  // Xác nhận an toàn -> Hiển thị các trang quản lý bên trong (Dashboard, POS, Bệnh nhân...)
  return <>{children}</>;
}