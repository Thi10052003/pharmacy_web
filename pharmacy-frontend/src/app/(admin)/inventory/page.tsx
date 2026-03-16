"use client"

import { useState } from "react"
import { Card, Button, Table, Tag, Input, Typography, Space, Row, Col, Alert, Badge } from "antd"
import {
  HistoryOutlined,
  SearchOutlined,
  PlusOutlined,
  FileSearchOutlined,
  WarningOutlined,
  StopOutlined
} from "@ant-design/icons"
import { getExpiryWarnings, getInventoryHistory } from "@/services/inventory.service";
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

const { Title, Text } = Typography;

export default function InventoryPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")

  // 1. Fetch dữ liệu Lịch sử kho
  const { data: histories, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["inventory-history"],
    queryFn: getInventoryHistory
  })

  // 2. Fetch dữ liệu Cảnh báo HSD
  const { data: warnings, isLoading: isWarningsLoading } = useQuery({
    queryKey: ["expiry-warnings"],
    queryFn: getExpiryWarnings
  })

  // 3. Logic lọc tìm kiếm thuốc trong lịch sử
  const filteredHistory = histories?.filter(item =>
    item.medicine?.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.medicine?.code?.toLowerCase().includes(searchText.toLowerCase())
  )

  // CỘT CHO BẢNG CẢNH BÁO
  const warningColumns = [
    {
      title: "Mặt hàng",
      key: "medicine",
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.medicine?.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Mã: {record.medicine?.sku || record.medicine?.code || "N/A"}</Text>
        </Space>
      )
    },
    { title: "Số Lô", dataIndex: "batchNumber", key: "batchNumber", render: (t: string) => <b>{t}</b> },
    {
      title: "Hạn Sử Dụng",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (date: string) => <Text type="danger" strong>{dayjs(date).format("DD/MM/YYYY")}</Text>
    },
    {
      title: "Tồn kho còn",
      key: "remainingQuantity",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Text strong style={{ fontSize: 16 }}>
          {record.remainingQuantity.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 'normal' }}>{record.medicine?.baseUnitName}</span>
        </Text>
      )
    },
    {
      title: "Trạng thái",
      key: "status",
      align: "center" as const,
      render: (_: any, record: any) => {
        if (record.isExpired) {
          return (
            <Tag color="error" icon={<StopOutlined />} style={{ padding: '4px 8px', fontSize: 13, fontWeight: 'bold' }}>
              ĐÃ HẾT HẠN ({Math.abs(record.daysRemaining)} ngày)
            </Tag>
          );
        }
        return (
          <Tag color="warning" icon={<WarningOutlined />} style={{ padding: '4px 8px', fontSize: 13, fontWeight: 'bold' }}>
            CẬN DATE (Còn {record.daysRemaining} ngày)
          </Tag>
        );
      }
    }
  ];

  // CỘT CHO BẢNG LỊCH SỬ KHO
  const columns = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 150,
      render: (date: string) => <Text type="secondary">{dayjs(date).format("DD/MM/YYYY HH:mm")}</Text>,
    },
    {
      title: "Mặt hàng",
      key: "medicine",
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.medicine?.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Mã: {record.medicine?.code || record.medicine?.sku || "N/A"}</Text>
        </Space>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      align: "center" as const,
      render: (action: string) => {
        const config: any = {
          IMPORT: { color: "green", text: "NHẬP KHO" },
          PRESCRIPTION: { color: "blue", text: "BÁN HÀNG" },
          CANCEL_PRESCRIPTION: { color: "red", text: "HỦY - HOÀN KHO" },
          EXPORT: { color: "orange", text: "XUẤT KHO" }
        }
        const item = config[action] || { color: "default", text: action }
        return <Tag color={item.color} style={{ fontWeight: 'bold' }}>{item.text}</Tag>
      }
    },
    {
      title: "Số lô / HSD",
      key: "batch",
      render: (_: any, record: any) => (
        record.batch ? (
          <Space orientation="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>Lô: {record.batch.batchNumber}</Text>
            <Text type="danger" style={{ fontSize: 11 }}>
              HSD: {dayjs(record.batch.expiryDate).format("DD/MM/YYYY")}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">---</Text>
        )
      )
    },
    {
      title: "Biến động",
      dataIndex: "quantity",
      align: "right" as const,
      render: (qty: number, record: any) => (
        <Text style={{ color: qty > 0 ? "#52c41a" : "#ff4d4f", fontWeight: "bold" }}>
          {qty > 0 ? `+${qty}` : qty} {record.medicine?.baseUnitName}
        </Text>
      ),
    },
    {
      title: "Tồn sau cùng",
      dataIndex: "stockAfter",
      align: "center" as const,
      render: (val: number) => <b style={{ color: '#1890ff' }}>{val?.toLocaleString() || 0}</b>
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (note: string) => <Text italic style={{ fontSize: 12 }}>{note || ""}</Text>
    }
  ]

  return (
    <div style={{ padding: '10px' }}>
      {/* HEADER SECTION */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space size="middle">
            <HistoryOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>Quản lý Tồn Kho</Title>
              <Text type="secondary">Theo dõi chi tiết nhập xuất và hạn sử dụng theo lô</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Tìm tên thuốc, mã thuốc..."
              prefix={<SearchOutlined />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            {/* NÚT ĐIỀU HƯỚNG QUAN TRỌNG NHẤT */}
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => router.push("/inventory/import")}
              style={{ height: 45, fontWeight: 'bold', borderRadius: 8 }}
            >
              TẠO PHIẾU NHẬP MỚI (F2)
            </Button>
          </Space>
        </Col>
      </Row>

      {/* PHẦN 1: BẢNG CẢNH BÁO HSD (Chỉ hiện khi có dữ liệu cảnh báo) */}
      {warnings && warnings.length > 0 && (
        <Card 
          variant="borderless" 
          style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(207, 19, 34, 0.15)', marginBottom: 24, border: '1px solid #ffa39e' }}
        >
          <Badge count={warnings.length} offset={[15, 0]}>
            <Title level={4} style={{ color: '#cf1322', marginTop: 0 }}>
              🚨 Cảnh báo Lô thuốc cận Date / Hết hạn
            </Title>
          </Badge>
          
          <Alert 
            message="Các lô thuốc dưới đây có Hạn Sử Dụng dưới 90 ngày hoặc đã hết hạn. Vui lòng có phương án xử lý (bán giảm giá, trả nhà cung cấp, hoặc tiêu hủy)." 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }}
          />

          <Table
            dataSource={warnings}
            columns={warningColumns}
            rowKey="id"
            loading={isWarningsLoading}
            size="middle"
            pagination={{ pageSize: 5 }}
            bordered
          />
        </Card>
      )}

      {/* PHẦN 2: BẢNG NHẬT KÝ KHO */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Lịch sử Biến động Kho</Title>
        <Table
          dataSource={filteredHistory}
          columns={columns}
          rowKey="id"
          loading={isHistoryLoading}
          size="middle"
          pagination={{
            pageSize: 12,
            showTotal: (total) => `Tổng cộng ${total} bản ghi biến động`
          }}
          bordered
        />
      </Card>
    </div>
  )
}