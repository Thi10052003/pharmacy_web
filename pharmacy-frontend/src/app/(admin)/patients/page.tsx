"use client"

import { useState } from "react"
import { 
  Table, Button, Space, Modal, Form, Input, 
  message, Card, Typography, Select, Tag, Tooltip 
} from "antd"
import { 
  PlusOutlined, UsergroupAddOutlined, EditOutlined, 
  PhoneOutlined, UserAddOutlined 
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getAllAccounts, createAccount, addProfileToAccount, updateProfile, Account, PatientProfile 
} from "@/services/patient.service"

const { Title, Text } = Typography
const { Search } = Input

export default function PatientHouseholdPage() {
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState("")

  // State cho Modal Tạo Gia đình mới
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [accountForm] = Form.useForm()

  // State cho Modal Thêm/Sửa Thành viên
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [targetAccountId, setTargetAccountId] = useState<string | null>(null)
  const [profileForm] = Form.useForm()

  // 1. Fetch Danh sách Gia đình
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", searchText],
    queryFn: () => getAllAccounts(searchText)
  })

  // 2. Mutations
  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      message.success("Đã tạo tài khoản gia đình mới!")
      setIsAccountModalOpen(false)
      accountForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
    onError: (err: any) => message.error(err.response?.data?.message || "Lỗi tạo tài khoản")
  })

  const saveProfileMutation = useMutation({
    mutationFn: (values: any) => {
      if (editingProfileId) return updateProfile(editingProfileId, values)
      return addProfileToAccount(targetAccountId!, values)
    },
    onSuccess: () => {
      message.success("Đã lưu thông tin thành viên!")
      setIsProfileModalOpen(false)
      profileForm.resetFields()
      setEditingProfileId(null)
      setTargetAccountId(null)
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
    onError: (err: any) => message.error("Có lỗi xảy ra khi lưu!")
  })

  // --- CỘT BẢNG CHÍNH (TÀI KHOẢN GIA ĐÌNH) ---
  const accountColumns = [
    {
      title: "Số điện thoại (Ví chung)",
      dataIndex: "phone",
      key: "phone",
      render: (text: string) => <><PhoneOutlined /> <b>{text}</b></>
    },
    {
      title: "Điểm gia đình",
      dataIndex: "totalPoints",
      key: "totalPoints",
      render: (points: number) => <Text type="success" strong>{points.toLocaleString()} đ</Text>
    },
    {
      title: "Số lượng thành viên",
      key: "memberCount",
      render: (_: any, record: Account) => <Tag color="blue">{record.profiles?.length || 0} người</Tag>
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: Account) => (
        <Tooltip title="Thêm vợ/chồng/con vào chung SĐT này">
          <Button 
            type="dashed" 
            icon={<UserAddOutlined />} 
            onClick={() => {
              setTargetAccountId(record.id)
              setEditingProfileId(null)
              profileForm.resetFields()
              setIsProfileModalOpen(true)
            }}
          >
            Thêm người nhà
          </Button>
        </Tooltip>
      )
    }
  ]

  // --- CỘT BẢNG CON (HỒ SƠ THÀNH VIÊN) ---
  const expandedRowRender = (account: Account) => {
    const profileColumns = [
      { title: "Họ và tên", dataIndex: "fullName", key: "fullName", render: (text: string) => <b>{text}</b> },
      { 
        title: "Vai trò", 
        dataIndex: "relationship", 
        key: "relationship",
        render: (role: string) => (
          <Tag color={role === "Chủ hộ" ? "gold" : "default"}>{role}</Tag>
        )
      },
      { title: "Giới tính", dataIndex: "gender", key: "gender" },
      { title: "Năm sinh", dataIndex: "birthYear", key: "birthYear" },
      {
        title: "",
        key: "action",
        width: 100,
        render: (_: any, record: PatientProfile) => (
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1890ff' }} />}
            onClick={() => {
              setEditingProfileId(record.id)
              setTargetAccountId(null)
              profileForm.setFieldsValue(record)
              setIsProfileModalOpen(true)
            }}
          >
            Sửa
          </Button>
        )
      }
    ]

    return <Table columns={profileColumns} dataSource={account.profiles} rowKey="id" pagination={false} size="small" />
  }

  return (
    <div style={{ padding: "10px" }}>
      <Card variant="borderless" style={{ borderRadius: 12 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space>
            <div style={{ width: 40, height: 40, background: '#e6f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UsergroupAddOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </div>
            <Title level={4} style={{ margin: 0 }}>Quản lý Hồ sơ Gia đình</Title>
          </Space>
          <Space>
            <Search 
              placeholder="Tìm SĐT hoặc Tên người nhà..." 
              allowClear
              onSearch={setSearchText}
              style={{ width: 300 }} 
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAccountModalOpen(true)}>
              Tạo Hồ sơ mới
            </Button>
          </Space>
        </div>

        {/* BẢNG DỮ LIỆU LỒNG NHAU */}
        <Table 
          columns={accountColumns} 
          dataSource={accounts} 
          rowKey="id" 
          loading={isLoading}
          expandable={{ expandedRowRender }} // Tính năng xổ ra danh sách con
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL 1: TẠO GIA ĐÌNH MỚI (CHỦ HỘ) */}
      <Modal
        title="TẠO TÀI KHOẢN GIA ĐÌNH MỚI"
        open={isAccountModalOpen}
        onCancel={() => setIsAccountModalOpen(false)}
        onOk={() => accountForm.submit()}
        confirmLoading={createAccountMutation.isPending}
      >
        <Form form={accountForm} layout="vertical" onFinish={(v) => createAccountMutation.mutate(v)}>
          <Form.Item label="Số điện thoại (Ví chung)" name="phone" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Nhập SĐT đại diện..." size="large" />
          </Form.Item>
          <Form.Item label="Họ tên Chủ tài khoản" name="fullName" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item label="Giới tính" name="gender" style={{ width: 150 }}>
              <Select options={[{value: "Nam", label: "Nam"}, {value: "Nữ", label: "Nữ"}]} />
            </Form.Item>
            <Form.Item label="Năm sinh" name="birthYear">
              <Input type="number" placeholder="VD: 1990" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* MODAL 2: THÊM / SỬA THÀNH VIÊN GIA ĐÌNH */}
      <Modal
        title={editingProfileId ? "CẬP NHẬT HỒ SƠ" : "THÊM NGƯỜI NHÀ"}
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        onOk={() => profileForm.submit()}
        confirmLoading={saveProfileMutation.isPending}
      >
        <Form form={profileForm} layout="vertical" onFinish={(v) => saveProfileMutation.mutate(v)}>
          <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Tên thành viên gia đình..." />
          </Form.Item>
          <Form.Item label="Quan hệ với Chủ hộ" name="relationship" rules={[{ required: true }]}>
            <Select options={[
              {value: "Vợ", label: "Vợ"}, {value: "Chồng", label: "Chồng"}, 
              {value: "Con trai", label: "Con trai"}, {value: "Con gái", label: "Con gái"},
              {value: "Ông", label: "Ông"}, {value: "Bà", label: "Bà"},
              {value: "Chủ hộ", label: "Chủ hộ (Đổi nếu muốn)"}
            ]} />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item label="Giới tính" name="gender" style={{ width: 150 }}>
              <Select options={[{value: "Nam", label: "Nam"}, {value: "Nữ", label: "Nữ"}]} />
            </Form.Item>
            <Form.Item label="Năm sinh" name="birthYear">
              <Input type="number" placeholder="VD: 2015" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

    </div>
  )
}