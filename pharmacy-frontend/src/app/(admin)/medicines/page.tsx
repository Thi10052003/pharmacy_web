"use client"

import { useState } from "react"
import {
  Table, Button, Space, Tag, Modal, Form, Input,
  InputNumber, message, Divider, Row, Col, Popconfirm, Switch, Tooltip, Typography, Upload, notification
} from "antd"
import {
  PlusOutlined, MedicineBoxOutlined, EditOutlined,
  DeleteOutlined, QuestionCircleOutlined, FileExcelOutlined
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getAllMedicines, createMedicine, updateMedicine, deleteMedicine, Medicine, toggleMedicineStatus, importViettelExcel
} from "@/services/medicine.service"

const { Text } = Typography;

// Hàm loại bỏ dấu tiếng Việt thần thánh (Để ngoài component cho nhẹ máy)
const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

export default function MedicinePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState("");

  // ==========================================
  // 1. FETCH & LỌC DỮ LIỆU
  // ==========================================
  const { data: medicines, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: getAllMedicines,
  })

  // Lọc thuốc thông minh: Bất chấp chữ hoa, chữ thường, có/không dấu
  const filteredMedicines = medicines?.filter((med) => {
    const normalizedName = removeVietnameseTones(med.name);
    const normalizedCode = removeVietnameseTones(med.code || "");
    const normalizedSearch = removeVietnameseTones(searchText);

    return (
      normalizedName.includes(normalizedSearch) ||
      normalizedCode.includes(normalizedSearch)
    );
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  // ==========================================
  // 2. CÁC MUTATION (THÊM, SỬA, XÓA, IMPORT)
  // ==========================================
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

  const deleteMutation = useMutation({
    mutationFn: deleteMedicine,
    onSuccess: () => {
      message.success("Đã xóa thuốc khỏi hệ thống")
      queryClient.invalidateQueries({ queryKey: ["medicines"] })
    },
    onError: () => {
      message.error("Không thể xóa thuốc đã có lịch sử bán hàng. Hãy dùng tính năng Ngừng bán!")
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: toggleMedicineStatus,
    onSuccess: () => {
      message.success("Đã cập nhật trạng thái kinh doanh")
      queryClient.invalidateQueries({ queryKey: ["medicines"] })
    },
    onError: () => {
      message.error("Có lỗi xảy ra khi cập nhật trạng thái!");
    }
  })

  const importMutation = useMutation({
    mutationFn: importViettelExcel,
    onSuccess: (data) => {
      notification.success({
        message: 'Import Hoàn Tất!',
        description: `Đã nhập thành công ${data.successCount} mặt hàng.`,
        duration: 5,
      });

      if (data.errors && data.errors.length > 0) {
        notification.warning({
          message: 'Có một số dòng bị lỗi',
          description: `Không thể import ${data.errors.length} dòng. F12 (Console) để xem chi tiết.`,
          duration: 10,
        });
        console.warn("DANH SÁCH LỖI:", data.errors);
      }
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || error.response?.data?.message || "Lỗi khi xử lý file Excel!");
    }
  });

  // ==========================================
  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN
  // ==========================================
  const handleOpenEdit = (record: Medicine) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel' || file.name.endsWith('.csv');
      if (!isExcel) {
        message.error('Hệ thống chỉ hỗ trợ upload file Excel (.xlsx, .xls, .csv)!');
        return Upload.LIST_IGNORE;
      }
      importMutation.mutate(file);
      return false; 
    },
    showUploadList: false, 
  };

  // ==========================================
  // 4. CẤU HÌNH BẢNG (COLUMNS)
  // ==========================================
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
      title: "Hoạt chất",
      dataIndex: "activeIngredient",
      key: "activeIngredient",
      render: (text: string) => <Text type="secondary">{text || "---"}</Text>,
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
      title: "Giá bán lẻ",
      dataIndex: "baseUnitPrice",
      align: "right" as const,
      render: (price: number) => <b>{price?.toLocaleString()}đ</b>,
    },
    {
      title: "Kinh doanh",
      dataIndex: "isActive",
      key: "isActive",
      align: "center" as const,
      render: (active: boolean, record: Medicine) => (
        <Tooltip title={active ? "Gạt để ngừng kinh doanh" : "Đã ngừng bán"}>
          <Switch
            checked={active}
            size="small"
            loading={toggleActiveMutation.isPending}
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
            <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleOpenEdit(record)} />
          </Tooltip>

          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            disabled={record.isActive}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa" cancelText="Hủy"
            icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title={record.isActive ? "Phải ngừng kinh doanh mới được xóa" : "Xóa vĩnh viễn"}>
              <Button type="text" danger disabled={record.isActive} icon={<DeleteOutlined style={{ opacity: record.isActive ? 0.3 : 1 }} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    }
  ]

  // ==========================================
  // 5. RENDER GIAO DIỆN
  // ==========================================
  return (
    <div style={{ padding: "10px" }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: 20 }}>
        <Space>
          <MedicineBoxOutlined style={{ fontSize: 26, color: '#1890ff' }} />
          <h2 style={{ margin: 0 }}>Quản lý Danh mục Thuốc</h2>
        </Space>
      </div>

      {/* Thanh công cụ: Tìm kiếm & Nút chức năng */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm theo tên hoặc mã thuốc (không dấu)..."
          allowClear
          size="large"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400 }}
        />

        <Space>
          <Upload {...uploadProps}>
            <Button
              size="large"
              type="default"
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              loading={importMutation.isPending}
              style={{ borderColor: '#52c41a', color: '#52c41a', fontWeight: 'bold' }}
            >
              {importMutation.isPending ? "Đang xử lý..." : "Nhập Viettel PMS"}
            </Button>
          </Upload>
          
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Thêm thuốc mới
          </Button>
        </Space>
      </div>

      {/* Bảng dữ liệu - QUAN TRỌNG: dataSource = filteredMedicines */}
      <Table
        columns={columns}
        dataSource={filteredMedicines} 
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
        width={850}
        centered
      >
        <Form layout="vertical" form={form} onFinish={(v) => mutation.mutate(v)}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Mã thuốc (SKU)" name="code" rules={[{ required: true, message: 'Nhập mã thuốc' }]}>
                <Input placeholder="VD: PAN-EXTRA" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="Tên thuốc" name="name" rules={[{ required: true, message: 'Nhập tên thuốc' }]}>
                <Input placeholder="VD: Panadol Extra" />
              </Form.Item>
            </Col>
          </Row>

          {/* Dòng này dành cho 3 trường mới thêm từ file Excel */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Số đăng ký" name="registrationNo">
                <Input placeholder="VD: VD-12345-19" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Hoạt chất chính" name="activeIngredient">
                <Input placeholder="VD: Paracetamol 500mg" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Quy cách đóng gói" name="packagingSize">
                <Input placeholder="VD: Hộp 10 vỉ x 10 viên" />
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

// Hỗ trợ layout đẹp cho cột Tên thuốc
const Flex = ({ children, vertical, gap, style }: any) => (
  <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap, ...style }}>
    {children}
  </div>
)