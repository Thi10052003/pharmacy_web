"use client"

import { useState } from "react"
import { 
  Table, Button, Space, Tag, Modal, Form, Input, 
  InputNumber, message, Divider, Row, Col, Popconfirm, Switch, Tooltip, Typography 
} from "antd"
import { 
  PlusOutlined, MedicineBoxOutlined, EditOutlined, 
  DeleteOutlined, QuestionCircleOutlined 
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getAllMedicines, createMedicine, updateMedicine, deleteMedicine, Medicine, toggleMedicineStatus 
} from "@/services/medicine.service"

const { Text } = Typography;

export default function MedicinePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) 
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 1. Lấy danh sách thuốc
  const { data: medicines, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: getAllMedicines,
  })

  // 2. Xử lý Thêm mới hoặc Cập nhật thông tin
  const mutation = useMutation({
    mutationFn: (values: any) => {
      if (editingId) return updateMedicine(editingId, values)
      return createMedicine(values)
    },
    onSuccess: () => {
      message.success(editingId ? "Cập nhật thành công!" : "Thêm thuốc thành công!")
      handleCloseModal()
      queryClient.invalidateQueries({ queryKey: ["medicines"] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu")
    },
  })

  // 3. Xử lý Xóa cứng (Xóa khỏi Database)
  const deleteMutation = useMutation({
    mutationFn: deleteMedicine,
    onSuccess: () => {
      message.success("Đã xóa thuốc khỏi hệ thống")
      queryClient.invalidateQueries({ queryKey: ["medicines"] })
    },
    onError: (error: any) => {
      message.error("Không thể xóa thuốc đã có lịch sử bán hàng. Hãy dùng tính năng Ngừng bán!")
    }
  })

  // 4. Xử lý Soft Delete (Bật/Tắt trạng thái kinh doanh) - SỬ DỤNG HÀM MỚI
  const toggleActiveMutation = useMutation({
    mutationFn: toggleMedicineStatus, // Trỏ trực tiếp đến hàm toggle mới
    onSuccess: () => {
      message.success("Đã cập nhật trạng thái kinh doanh")
      queryClient.invalidateQueries({ queryKey: ["medicines"] })
    },
    onError: () => {
      message.error("Có lỗi xảy ra khi cập nhật trạng thái!");
    }
  })

  // Mở modal sửa
  const handleOpenEdit = (record: Medicine) => {
    setEditingId(record.id)
    form.setFieldsValue(record) 
    setIsModalOpen(true)
  }

  // Đóng modal & reset
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const columns = [
    {
      title: "Tên thuốc",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Medicine) => (
        <Flex vertical gap={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.code || "Không có mã"}</Text>
        </Flex>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "currentStock",
      align: "center" as const,
      render: (stock: any, record: Medicine) => (
        <Tag color={Number(stock) > 10 ? "green" : Number(stock) > 0 ? "orange" : "red"}>
          {Number(stock)} {record.baseUnitName}
        </Tag>
      ),
    },
    {
      title: "Giá bán lẻ (Gốc)",
      dataIndex: "baseUnitPrice",
      align: "right" as const,
      render: (price: number) => <b>{price?.toLocaleString()}đ</b>,
    },
    // --- CỘT KINH DOANH ĐÃ SỬA ---
    {
      title: "Kinh doanh",
      dataIndex: "isActive",
      key: "isActive",
      align: "center" as const,
      render: (active: boolean, record: Medicine) => (
        <Tooltip title={active ? "Gạt để ngừng kinh doanh trước khi xóa" : "Thuốc đã ngừng bán"}>
          <Switch 
            checked={active} 
            size="small"
            loading={toggleActiveMutation.isPending}
            // Gọi mutation với id và trạng thái mới
            onChange={(checked) => toggleActiveMutation.mutate({ id: record.id, isActive: checked })} 
          />
        </Tooltip>
      )
    },
    {
      title: "Hành động",
      key: "action",
      align: "center" as const,
      render: (_: any, record: Medicine) => (
        <Space>
          <Tooltip title="Chỉnh sửa thông tin">
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#1890ff' }} />} 
              onClick={() => handleOpenEdit(record)} 
            />
          </Tooltip>

          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            description="Hệ thống sẽ xóa sạch lịch sử bán hàng và nhập kho của thuốc này."
            disabled={record.isActive} 
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title={record.isActive ? "Phải ngừng kinh doanh mới được xóa" : "Xóa vĩnh viễn"}>
              <Button 
                type="text" 
                danger 
                disabled={record.isActive} 
                icon={<DeleteOutlined style={{ opacity: record.isActive ? 0.3 : 1 }} />} 
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    }
  ]

  return (
    <div style={{ padding: "10px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <MedicineBoxOutlined style={{ fontSize: 26, color: '#1890ff' }} />
          <h2 style={{ margin: 0 }}>Quản lý Danh mục Thuốc</h2>
        </Space>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Thêm thuốc mới
        </Button>
      </div>

      {/* Bảng dữ liệu */}
      <Table 
        columns={columns} 
        dataSource={medicines} 
        rowKey="id" 
        loading={isLoading}
        pagination={{ pageSize: 8 }}
        bordered
      />

      {/* Modal chính (Thêm/Sửa) */}
      <Modal
        title={editingId ? "CHỈNH SỬA THÔNG TIN THUỐC" : "KHAI BÁO THUỐC MỚI"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={750}
        centered
      >
        <Form layout="vertical" form={form} onFinish={(v) => mutation.mutate(v)}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Mã thuốc (SKU)" name="code" rules={[{ required: true, message: 'Nhập mã thuốc' }]}>
                <Input placeholder="VD: PAN-EXTRA" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tên thuốc" name="name" rules={[{ required: true, message: 'Nhập tên thuốc' }]}>
                <Input placeholder="VD: Panadol Extra" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement={"left" as any} style={{ color: '#1890ff' }}>Cấp 1: Đơn vị nhỏ nhất (Gốc)</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tên đơn vị gốc" name="baseUnitName" initialValue="Viên" rules={[{ required: true }]}>
                <Input placeholder="Viên, Ống, Gói..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giá bán lẻ đơn vị gốc (đ)" name="baseUnitPrice" rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: "100%" }} 
                  formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={val => val!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement={"left" as any}>Cấp 2: Đơn vị trung gian (Ví dụ: Vỉ)</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Tên đơn vị" name="subUnitName"><Input placeholder="Vỉ" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="1 Vỉ = ? đơn vị gốc" name="pillsPerSubUnit"><InputNumber style={{ width: "100%" }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá bán 1 Vỉ" name="subUnitPrice">
                <InputNumber style={{ width: "100%" }} formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement={"left" as any}>Cấp 3: Đơn vị lớn (Ví dụ: Hộp)</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Tên đơn vị" name="mainUnitName"><Input placeholder="Hộp" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="1 Hộp = ? đơn vị gốc" name="mainUnitRatio"><InputNumber style={{ width: "100%" }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá bán 1 Hộp" name="mainUnitPrice">
                <InputNumber style={{ width: "100%" }} formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <Form.Item label="Số lượng tồn kho ban đầu" name="currentStock">
            <InputNumber style={{ width: "100%" }} placeholder="Nhập số lượng thực tế tại kho" />
          </Form.Item>

          <Form.Item style={{ marginTop: 30, marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={mutation.isPending} 
              block 
              size="large"
              style={{ height: 50, fontWeight: 'bold' }}
            >
              {editingId ? "LƯU THAY ĐỔI" : "XÁC NHẬN LƯU THUỐC"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// Thay thế Space bằng Flex cho hiện đại hơn
const Flex = ({ children, vertical, gap, style }: any) => (
  <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap, ...style }}>
    {children}
  </div>
)