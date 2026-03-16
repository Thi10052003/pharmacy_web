"use client"
import { IdcardOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Dropdown, Avatar, Typography, MenuProps } from 'antd';
import { 
  MedicineBoxOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  DashboardOutlined,
  ImportOutlined,
  HistoryOutlined,
  BankOutlined,
  LogoutOutlined // Thêm icon Đăng xuất
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

// Cấu hình Menu Items
const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link href="/">Tổng quan</Link> },
  { key: '/medicines', icon: <MedicineBoxOutlined />, label: <Link href="/medicines">Quản lý Thuốc</Link> },
  { key: '/inventory', icon: <ImportOutlined />, label: <Link href="/inventory">Kho Hàng</Link> },
  { key: '/suppliers', icon: <BankOutlined />, label: <Link href="/suppliers">Nhà Cung Cấp</Link> },
  { key: '/patients', icon: <UserOutlined />, label: <Link href="/patients">Bệnh Nhân</Link> },
  { key: '/prescriptions', icon: <HistoryOutlined />, label: <Link href="/prescriptions">Lịch sử Đơn hàng</Link> },
  { key: '/staff', icon: <IdcardOutlined />, label: <Link href="/staff">Nhân Sự</Link> },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link href="/pos">Bán Hàng (POS)</Link> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // State lưu thông tin User đang đăng nhập
  const [currentUser, setCurrentUser] = useState<{ fullName?: string, role?: string } | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Lấy thông tin User từ Local Storage khi giao diện load xong
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Lỗi parse user:", error);
      }
    }
  }, []);

  // Hàm xử lý khi bấm nút Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Cấu hình các nút bấm trong Dropdown Menu của User
  const userMenuOptions: MenuProps['items'] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Hồ sơ cá nhân",
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
      >
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu 
          theme="dark" 
          selectedKeys={[pathname]} 
          mode="inline" 
          items={items.filter(item => {
            // Nếu là Dược sĩ, chỉ cho phép hiển thị 3 Menu này
            if (currentUser?.role === "PHARMACIST") {
              return ['/pos', '/patients', '/prescriptions'].includes(item.key);
            }
            // Nếu là ADMIN (hoặc chưa load xong), cho hiển thị toàn bộ
            return true; 
          })} 
        />
      </Sider>
      
      <Layout>
        {/* HEADER ĐÃ ĐƯỢC CẬP NHẬT GIAO DIỆN USER */}
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          display: 'flex',
          justifyContent: 'flex-end', // Đẩy thẻ User sang bên phải
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          zIndex: 1
        }}>
          <Dropdown menu={{ items: userMenuOptions }} trigger={['click']} placement="bottomRight">
            <div style={{ 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10, 
              padding: "0 10px", borderRadius: 8, transition: "background 0.3s" 
            }} 
                 onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                 onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", flexDirection: "column", textAlign: "right", lineHeight: "1.2" }}>
                <Text strong>{currentUser?.fullName || "Người dùng"}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {currentUser?.role === "ADMIN" ? "Quản trị viên" : "Dược sĩ"}
                </Text>
              </div>
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Pharmacy Admin System ©2026</Footer>
      </Layout>
    </Layout>
  );
};