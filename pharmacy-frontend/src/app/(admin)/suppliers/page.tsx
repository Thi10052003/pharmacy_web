"use client"

import { useState } from "react"
import { 
  Table, Button, Space, Modal, Form, Input, Card, 
  Typography, Tag, message, Row, Col, InputNumber, Select 
} from "antd"
import { 
  PlusOutlined, PhoneOutlined, BankOutlined, 
  EditOutlined, DollarOutlined 
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getAllSuppliers, createSupplier, updateSupplier, Supplier, paySupplierDebt 
} from "@/services/supplier.service" // Đảm bảo bạn đã export paySupplierDebt trong service

const { Title, Text } = Typography

export default function SupplierPage() {
  // State cho Thêm/Sửa NCC
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form] = Form.useForm()

  // State cho Thanh toán Công nợ
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null)
  const [payForm] = Form.useForm()

  const queryClient = useQueryClient()

  // 1. Fetch dữ liệu NCC
  const { data: suppliers, isLoading } = useQuery({ 
    queryKey: ["suppliers"], 
    queryFn: getAllSuppliers 
  })

  // 2. Mutation Thêm/Sửa NCC
  const mutation = useMutation({
    mutationFn: (values: any) => editingSupplier 
      ? updateSupplier(editingSupplier.id, values) 
      : createSupplier(values),
    onSuccess: () => {
      message.success(editingSupplier ? "Cập nhật thành công" : "Thêm nhà cung cấp thành công")
      setIsModalOpen(false)
      form.resetFields()
      setEditingSupplier(null)
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err: any) => message.error(err.response?.data?.message || "Có lỗi xảy ra")
  })

  // 3. Mutation Trả Nợ NCC
  const payMutation = useMutation({
    mutationFn: (values: any) => paySupplierDebt(selectedSupplierForPay!.id, values),
    onSuccess: () => {
      message.success("Thanh toán công nợ thành công!")
      setIsPayModalOpen(false)
      payForm.resetFields()
      setSelectedSupplierForPay(null)
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err: any) => message.error(err.response?.data?.message || "Lỗi thanh toán")
  })

  const columns = [
    {
      title: "Nhà cung cấp",
      dataIndex: "name",
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: "Liên hệ",
      key: "contact",
      render: (_: any, record: Supplier) => (
        <Space orientation="vertical" size={0}>
          <Text><PhoneOutlined /> {record.phone || "---"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.address}</Text>
        </Space>
      )
    },
    {
      title: "Công nợ hiện tại",
      dataIndex: "debt",
      align: "right" as const,
      render: (debt: number) => (
        <Tag color={debt > 0 ? "red" : "green"} style={{ fontSize: 14, padding: '4px 8px' }}>
          {Number(debt).toLocaleString()}đ
        </Tag>
      )
    },
    {
      title: "Hành động",
      key: "action",
      align: "center" as const,
      render: (_: any, record: Supplier) => (
        <Space>
          {/* NÚT TRẢ NỢ */}
          <Button 
            type="primary" 
            ghost
            disabled={record.debt <= 0} // Không có nợ thì không cho bấm
            icon={<DollarOutlined />}
            onClick={() => {
              setSelectedSupplierForPay(record)
              payForm.setFieldsValue({ paymentMethod: "Chuyển khoản" }) // Default
              setIsPayModalOpen(true)
            }}
          >
            Trả nợ
          </Button>

          {/* NÚT SỬA */}
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1890ff' }} />} 
            onClick={() => {
              setEditingSupplier(record)
              form.setFieldsValue(record)
              setIsModalOpen(true)
            }}
          />
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: "10px" }}>
      {/* HEADER */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space>
            <BankOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Quản lý Nhà cung cấp</Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            THÊM ĐỐI TÁC MỚI
          </Button>
        </Col>
      </Row>

      {/* BẢNG DỮ LIỆU */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table 
          dataSource={suppliers} 
          columns={columns} 
          rowKey="id" 
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL 1: THÊM / SỬA NHÀ CUNG CẤP */}
      <Modal
        title={editingSupplier ? "CHỈNH SỬA ĐỐI TÁC" : "THÊM NHÀ CUNG CẤP MỚI"}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingSupplier(null); form.resetFields(); }}
        footer={null}
      >
        <Form layout="vertical" form={form} onFinish={(v) => mutation.mutate(v)}>
          <Form.Item label="Tên nhà cung cấp" name="name" rules={[{ required: true }]}>
            <Input placeholder="Công ty Dược phẩm..." size="large" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="090..." size="large" />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea placeholder="Số nhà, đường, tỉnh thành..." rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={mutation.isPending}>
            {editingSupplier ? "LƯU THAY ĐỔI" : "XÁC NHẬN THÊM"}
          </Button>
        </Form>
      </Modal>

      {/* MODAL 2: THANH TOÁN CÔNG NỢ */}
      <Modal
        title={`THANH TOÁN CÔNG NỢ - ${selectedSupplierForPay?.name}`}
        open={isPayModalOpen}
        onCancel={() => { setIsPayModalOpen(false); payForm.resetFields(); setSelectedSupplierForPay(null); }}
        onOk={() => payForm.submit()}
        confirmLoading={payMutation.isPending}
        okText="Xác nhận thanh toán"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8 }}>
          <Text>Tổng nợ hiện tại: </Text>
          <Title level={3} style={{ color: '#f5222d', margin: 0 }}>
            {selectedSupplierForPay?.debt?.toLocaleString()} đ
          </Title>
        </div>
        
        <Form form={payForm} layout="vertical" onFinish={(v) => payMutation.mutate(v)}>
          <Form.Item 
            label="Số tiền muốn thanh toán" 
            name="amount" 
            rules={[{ required: true, message: "Vui lòng nhập số tiền!" }]}
          >
            <InputNumber 
              style={{ width: "100%" }} 
              size="large"
              min={1000}
              max={selectedSupplierForPay?.debt} // Ngăn chặn trả dư tiền nợ
              formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val ? Number(val.replace(/,/g, '')) : 0}
              placeholder="Nhập số tiền..."
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Hình thức" name="paymentMethod" rules={[{ required: true }]}>
                <Select size="large" options={[
                  {value: "Tiền mặt", label: "Tiền mặt"}, 
                  {value: "Chuyển khoản", label: "Chuyển khoản"}
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày trả" initialValue="Hôm nay">
                <Input size="large" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Ghi chú (Tùy chọn)" name="note">
            <Input.TextArea placeholder="Ví dụ: Ủy nhiệm chi Vietcombank đợt 1..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  )
}