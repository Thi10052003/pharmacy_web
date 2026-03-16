"use client"

import { Row, Col, Card, Statistic, Table, Typography, Tag, Divider} from "antd";
import { 
  DollarOutlined, 
  FileTextOutlined, 
  UserOutlined, 
  WarningOutlined,
  TrophyOutlined,
  StarOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { 
  getStatsSummary, 
  getTopMedicines, 
  getTopPointsPatients 
} from "@/services/statistics.service";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: getStatsSummary
  });

  const { data: topMedicines, isLoading: topLoading } = useQuery({
    queryKey: ["top-medicines"],
    queryFn: getTopMedicines
  });

  const { data: topPatients, isLoading: patientLoading } = useQuery({
    queryKey: ["top-points-patients"],
    queryFn: getTopPointsPatients
  });

  const medicineColumns = [
    { 
      title: "Tên thuốc", 
      dataIndex: "name", 
      key: "name", 
      render: (text: string) => <b>{text}</b> 
    },
    { 
      title: "Đơn vị", 
      dataIndex: "unit", 
      key: "unit",
      align: "center" as const 
    },
    { 
      title: "Đã bán", 
      dataIndex: "totalSold", 
      key: "totalSold",
      align: "right" as const,
      render: (val: number) => <Tag color="green">{val.toLocaleString()} đơn vị</Tag> 
    },
  ];

  const patientColumns = [
    { 
      title: "Khách hàng", 
      dataIndex: "fullName", 
      key: "fullName",
      render: (text: string) => <b>{text}</b>
    },
    { 
      title: "Số điện thoại", 
      dataIndex: "phone", 
      key: "phone" 
    },
    { 
      title: "Điểm tích lũy", 
      dataIndex: "totalPoints", 
      key: "totalPoints",
      align: "right" as const,
      render: (val: number) => (
        <Text strong style={{ color: '#faad14' }}>
          {val.toLocaleString()}đ
        </Text>
      )
    },
  ];

  return (
    <div style={{ padding: '10px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>Hệ thống Quản lý Nhà thuốc</Title>

      {/* PHẦN 1: CÁC THẺ THỐNG KÊ CHI TIẾT */}
      <Row gutter={[16, 16]}>
        {/* Doanh thu thực tế (Đã trừ đơn hủy từ Backend) */}
        <Col xs={24} sm={12} lg={8}>
          <Card loading={sumLoading} variant="borderless" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Doanh thu thực thu"
              value={summary?.revenue || 0} // Đã sửa tên biến
              precision={0}
              styles={{ content: { color: '#3f8600', fontWeight: 'bold' } }}
              prefix={<DollarOutlined />}
              suffix="đ"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Chỉ tính các đơn hàng thành công</Text>
          </Card>
        </Col>

        {/* Tiền hoàn trả (Theo dõi lượng đơn đã hủy) */}
        <Col xs={24} sm={12} lg={8}>
          <Card loading={sumLoading} variant="borderless" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Tiền đã hoàn trả"
              value={summary?.refunded || 0} // Đã sửa tên biến
              precision={0}
              styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }}
              prefix={<HistoryOutlined />}
              suffix="đ"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Tổng giá trị các đơn hàng bị hủy</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card loading={sumLoading} variant="borderless" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Đơn hàng thành công"
              value={summary?.successfulOrders || 0} // Đã sửa tên biến
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Số đơn thực tế đã xuất kho</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <Card loading={sumLoading} variant="borderless" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Statistic
                  title="Tổng số bệnh nhân"
                  value={summary?.totalPatients || 0} 
                  prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                />
              </Col>
              <Divider orientation="vertical" style={{ height: 40 }} />
              <Col>
                <Statistic
                  title="Thuốc sắp hết hàng"
                  value={summary?.lowStockMedicines || 0} // Đã sửa tên biến
                  styles={{ 
                    content: { 
                      color: (summary?.lowStockMedicines || 0) > 0 ? '#cf1322' : '#d9d9d9', // Đã sửa tên biến
                      fontWeight: 'bold'
                    } 
                  }}
                  prefix={<WarningOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* PHẦN 2: BẢNG XẾP HẠNG (GIỮ NGUYÊN) */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span><TrophyOutlined style={{ color: '#faad14' }} /> Top 5 Thuốc Bán Chạy</span>} 
            variant="borderless"
            style={{ height: '100%', borderRadius: 12 }}
          >
            <Table 
              dataSource={topMedicines} 
              columns={medicineColumns} 
              pagination={false} 
              loading={topLoading}
              rowKey="name"
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={<span><StarOutlined style={{ color: '#ff4d4f' }} /> Top 10 Khách Hàng Thân Thiết</span>} 
            variant="borderless"
            style={{ height: '100%', borderRadius: 12 }}
          >
            <Table 
              dataSource={topPatients} 
              columns={patientColumns} 
              pagination={false} 
              loading={patientLoading}
              rowKey="phone"
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}