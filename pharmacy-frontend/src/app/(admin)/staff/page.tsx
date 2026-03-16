"use client"

import { useState } from "react";
import { Table, Button, Card, Typography, Space, Tag, Modal, Form, Input, Select, message, Switch } from "antd";
import { PlusOutlined, KeyOutlined, UserAddOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStaffs, createStaff, changePassword, toggleStaffStatus } from "@/services/staff.service";

const { Title } = Typography;

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formAdd] = Form.useForm();
  const [formPass] = Form.useForm();

  // Load danh sách
  const { data: staffs, isLoading } = useQuery({
    queryKey: ["staffs"],
    queryFn: getStaffs
  });

  // Action: Khóa/Mở khóa tài khoản
  const toggleStatusMutation = useMutation({
    mutationFn: (data: { id: string, isActive: boolean }) => toggleStaffStatus(data.id, data.isActive),
    onSuccess: () => {
      message.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["staffs"] });
    }
  });

  // Xử lý Thêm mới
  const handleAddSubmit = async (values: any) => {
    try {
      await createStaff(values);
      message.success("Tạo tài khoản thành công!");
      setIsAddModalOpen(false);
      formAdd.resetFields();
      queryClient.invalidateQueries({ queryKey: ["staffs"] });
    } catch (err: any) {
      message.error(err.response?.data?.message || "Lỗi khi tạo tài khoản");
    }
  };

  // Xử lý Đổi pass
  const handlePassSubmit = async (values: any) => {
    if (!selectedUserId) return;
    try {
      await changePassword(selectedUserId, values.newPassword);
      message.success("Đổi mật khẩu thành công!");
      setIsPassModalOpen(false);
      formPass.resetFields();
    } catch (err: any) {
      message.error("Lỗi khi đổi mật khẩu");
    }
  };

  const columns = [
    { title: "Tên hiển thị", dataIndex: "fullName", key: "fullName", render: (t: string) => <b>{t}</b> },
    { title: "Tên đăng nhập", dataIndex: "username", key: "username" },
    { 
      title: "Vai trò", dataIndex: "role", key: "role", 
      render: (r: string) => <Tag color={r === "ADMIN" ? "red" : "blue"}>{r === "ADMIN" ? "QUẢN TRỊ VIÊN" : "DƯỢC SĨ"}</Tag> 
    },
    {
      title: "Hoạt động", dataIndex: "isActive", key: "isActive",
      render: (isActive: boolean, record: any) => (
        <Switch 
          checked={isActive} 
          disabled={record.role === "ADMIN"} // Không tự khóa tài khoản Admin
          onChange={(checked) => toggleStatusMutation.mutate({ id: record.id, isActive: checked })} 
        />
      )
    },
    {
      title: "Hành động", key: "action",
      render: (_: any, record: any) => (
        <Button 
          type="dashed" 
          icon={<KeyOutlined />} 
          onClick={() => { setSelectedUserId(record.id); setIsPassModalOpen(true); }}
        >
          Đổi Pass
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={3}>Quản lý Nhân sự</Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsAddModalOpen(true)}>
          Thêm nhân viên
        </Button>
      </div>

      <Card>
        <Table dataSource={staffs} columns={columns} rowKey="id" loading={isLoading} />
      </Card>

      {/* MODAL THÊM NHÂN VIÊN */}
      <Modal title="Tạo tài khoản mới" open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} onOk={() => formAdd.submit()} okText="Tạo tài khoản" cancelText="Hủy">
        <Form form={formAdd} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item name="fullName" label="Tên hiển thị (VD: Dược sĩ A)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="Tên đăng nhập (Viết liền không dấu)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu khởi tạo" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Phân quyền" initialValue="PHARMACIST">
            <Select options={[{ value: 'ADMIN', label: 'Quản trị viên (Toàn quyền)' }, { value: 'PHARMACIST', label: 'Dược sĩ (Chỉ bán hàng)' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL ĐỔI MẬT KHẨU */}
      <Modal title="Cấp lại mật khẩu mới" open={isPassModalOpen} onCancel={() => setIsPassModalOpen(false)} onOk={() => formPass.submit()} okText="Lưu mật khẩu" cancelText="Hủy">
        <Form form={formPass} layout="vertical" onFinish={handlePassSubmit}>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 3, message: "Mật khẩu quá ngắn" }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}