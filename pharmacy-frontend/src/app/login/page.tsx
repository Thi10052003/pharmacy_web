"use client"

import { useState } from "react";
import { Form, Input, Button, Card, Typography, Flex, Alert } from "antd";
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth.service";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  // Thêm State để lưu câu thông báo lỗi
  const [errorMsg, setErrorMsg] = useState<string | null>(null); 
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg(null); // Reset lỗi mỗi lần bấm đăng nhập
    
    try {
      const data = await login(values);
      
      // Lưu Token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Chuyển hướng
      router.push("/"); 
    } catch (err: any) {
      // BẮT LỖI VÀ HIỂN THỊ LÊN KHUNG ALERT
      const message = err.response?.data?.message || "Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 20
    }}>
      <Card 
        style={{ width: 400, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: 'none' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', background: '#1890ff', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>Pharmacy Admin</Title>
          <Text type="secondary">Hệ thống quản lý nhà thuốc</Text>
        </Flex>

        {/* KHUNG HIỂN THỊ LỖI MÀU ĐỎ NẰM NGAY ĐÂY */}
        {errorMsg && (
          <Alert 
            message={errorMsg} 
            type="error" 
            showIcon 
            style={{ marginBottom: 20 }} 
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item 
            name="username" 
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Tên đăng nhập (VD: admin)" />
          </Form.Item>

          <Form.Item 
            name="password" 
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Mật khẩu" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 10 }}>
            ĐĂNG NHẬP HỆ THỐNG
          </Button>
        </Form>
      </Card>
    </div>
  );
}