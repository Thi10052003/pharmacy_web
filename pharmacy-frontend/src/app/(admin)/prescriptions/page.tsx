"use client"

import { useState } from "react";
import {
  Table, Button, Tag, Modal, Space, Typography,
  Descriptions, Divider, Popconfirm, message, Input, Card
} from "antd";
import { 
  EyeOutlined, FileSearchOutlined, CloseCircleOutlined, SearchOutlined 
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  getAllPrescriptions,
  getPrescriptionById,
  cancelPrescription
} from "@/services/prescription.service";

const { Text, Title } = Typography;
const { Search } = Input;

export default function PrescriptionHistoryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchText, setSearchText] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["prescriptions", searchText],
    queryFn: () => getAllPrescriptions(searchText)
  });

  const { data: details, isLoading: isDetailLoading } = useQuery({
    queryKey: ["prescription-detail", selectedId],
    queryFn: () => getPrescriptionById(selectedId!),
    enabled: !!selectedId
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPrescription,
    onSuccess: () => {
      message.success("Đã hủy đơn hàng và hoàn lại kho!");
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => message.error(err.response?.data?.message || "Lỗi hủy đơn")
  });

  const columns = [
    {
      title: "Ngày mua",
      dataIndex: "purchaseDate",
      key: "purchaseDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    // --- CỘT KHÁCH HÀNG (SỬA LẠI THEO MÔ HÌNH GIA ĐÌNH) ---
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: any, record: any) => {
        const phone = record.account?.phone;
        const name = record.patientProfile?.fullName;
        const relationship = record.patientProfile?.relationship;

        // Nếu đơn hàng không gắn với ai -> Khách vãng lai
        if (!phone && !name) return <Text type="secondary" italic>Khách vãng lai</Text>;

        return (
          <div>
            <b>{name || "Khách vãng lai"}</b> 
            {relationship && <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>({relationship})</span>}
            <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 2 }}>{phone || "Không có SĐT"}</div>
          </div>
        );
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right" as const,
      render: (amount: number) => <b style={{ color: '#52c41a' }}>{Number(amount).toLocaleString()}đ</b>
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string) => (
        <Tag color={status === "ACTIVE" ? "green" : "red"} style={{ margin: 0 }}>
          {status === "ACTIVE" ? "Hoàn thành" : "Đã hủy"}
        </Tag>
      )
    },
    // --- CỘT THAO TÁC (GIỮ NGUYÊN FIX LỖI THẲNG HÀNG) ---
    {
      title: "Thao tác",
      key: "action",
      align: "center" as const,
      width: 180,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => { setSelectedId(record.id); setIsModalOpen(true); }}
            style={{ width: 125 }}
          >
            Xem chi tiết
          </Button>

          {/* BOX GIỮ CHỖ CỐ ĐỊNH CHIỀU RỘNG NÚT HỦY */}
          <div style={{ width: '32px', height: '32px' }}>
            {record.status === "ACTIVE" && (
              <Popconfirm
                title="Xác nhận hủy đơn?"
                onConfirm={() => cancelMutation.mutate(record.id)}
                okText="Hủy đơn"
                cancelText="Không"
                okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
              >
                <Button danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: "10px" }}>
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space>
            <div style={{ width: 40, height: 40, background: '#e6f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSearchOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </div>
            <Title level={4} style={{ margin: 0 }}>Lịch sử Đơn hàng</Title>
          </Space>

          <Search 
            placeholder="Tìm theo SĐT, Tên khách hoặc Mã đơn..." 
            allowClear
            enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>}
            size="large"
            style={{ width: 400 }}
            onSearch={(value) => setSearchText(value)} 
          />
        </div>

        <Table dataSource={prescriptions} columns={columns} rowKey="id" loading={isLoading} />
      </Card>

      <Modal
        title="THÔNG TIN CHI TIẾT ĐƠN THUỐC"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setSelectedId(null); }}
        footer={null}
        width={800}
      >
        {isDetailLoading ? <p>Đang tải dữ liệu...</p> : details && (
          <div>
            {/* --- THÔNG TIN BỆNH NHÂN (MÔ HÌNH MỚI) --- */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Người dùng thuốc">
                {details.patientProfile ? (
                  <>
                    <b>{details.patientProfile.fullName}</b> 
                    <Tag color="blue" style={{ marginLeft: 6 }}>{details.patientProfile.relationship}</Tag>
                  </>
                ) : <Text type="secondary">Khách vãng lai</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT / Ví gia đình">
                {details.account?.phone ? <b style={{ color: '#1890ff' }}>{details.account.phone}</b> : "---"}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian mua">
                {dayjs(details.purchaseDate).format("DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn">
                <Tag color={details.status === "ACTIVE" ? "green" : "red"}>
                  {details.status === "ACTIVE" ? "Hoàn thành" : "Đã hủy"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement={"left" as any}>Danh sách thuốc kê đơn</Divider>

            <Table
              dataSource={details.items}
              pagination={false}
              rowKey="id"
              size="small"
              bordered
              columns={[
                {
                  title: "Tên thuốc",
                  dataIndex: ["medicine", "name"], 
                  key: "medicineName",
                  render: (text: string) => <b>{text}</b>
                },
                {
                  title: "Liều dùng",
                  dataIndex: "dosage",
                  key: "dosage",
                  render: (text: string) => <i style={{ color: "#666" }}>{text || "---"}</i>
                },
                {
                  title: "Đơn vị",
                  dataIndex: "sellUnit",
                  key: "unit",
                  align: "center" as const,
                  render: (text: string, record: any) => (
                    <Tag color="blue">{text || record.medicine?.baseUnitName || "Viên"}</Tag>
                  )
                },
                {
                  title: "SL",
                  key: "quantity",
                  align: "center" as const,
                  render: (_: any, record: any) => {
                    const ratio = record.conversionRatio || 1;
                    const displayQty = record.quantity / ratio;
                    return <b>{displayQty.toLocaleString()}</b>
                  }
                },
                {
                  title: "Thành tiền",
                  key: "total",
                  align: "right" as const,
                  render: (_: any, record: any) => {
                    const total = (record.priceSnapshot || 0) * record.quantity;
                    return <span>{total.toLocaleString()}đ</span>
                  }
                },
              ]}
            />

            <div style={{ marginTop: 20, textAlign: 'right', padding: '10px 0', borderTop: '1px dashed #d9d9d9' }}>
              <Text style={{ fontSize: 16 }}>Tổng cộng: </Text>
              <Title level={3} style={{ display: 'inline', color: '#f5222d', margin: 0 }}>
                {Number(details.totalAmount).toLocaleString()}đ
              </Title>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}