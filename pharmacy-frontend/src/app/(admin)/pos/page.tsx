"use client"

import { useState, useMemo } from "react"
import { 
  Row, Col, Card, Input, Select, Table, Button, InputNumber, 
  Typography, Divider, message, Space, Empty, Flex, Alert, Radio
} from "antd"
import { 
  ShoppingCartOutlined, UserOutlined, 
  DeleteOutlined, CheckCircleOutlined, HistoryOutlined
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { getAvailableMedicines, Medicine } from "@/services/medicine.service"
// IMPORT SERVICE MỚI
import { getAllAccounts, Account } from "@/services/patient.service"
import { createPrescription, getRecentPrescriptionByProfileId } from "@/services/prescription.service"

const { Title, Text } = Typography

interface CartItem extends Medicine {
  selectedUnit: string
  selectedPrice: number
  quantity: number
  dosage: string
}

export default function POSPage() {
  // STATE MỚI: Tách biệt "Ví gia đình" và "Người dùng thuốc"
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const queryClient = useQueryClient()

  // 1. Fetch dữ liệu cơ bản
  const { data: medicines } = useQuery({ queryKey: ["available-medicines"], queryFn: getAvailableMedicines })
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => getAllAccounts() })

  // 2. Tự động fetch TOA CŨ khi chọn NGƯỜI DÙNG THUỐC (Profile)
  const { data: recentPrescription, isFetching: isLoadingRecent } = useQuery({
    queryKey: ["recent-prescription", selectedProfileId],
    queryFn: () => getRecentPrescriptionByProfileId(selectedProfileId!),
    enabled: !!selectedProfileId, 
  })

  // 3. Tính toán tổng tiền
  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0)
  }, [cartItems])

  // 4. Hàm xử lý khi Dược sĩ chọn Số điện thoại (Gia đình)
  const handleSelectAccount = (accountId: string) => {
    const acc = accounts?.find(a => a.id === accountId) || null;
    setSelectedAccount(acc);
    
    // UX Tối ưu: Tự động tick chọn người "Chủ hộ" (hoặc người đầu tiên) để Dược sĩ đỡ phải bấm 1 click
    if (acc && acc.profiles && acc.profiles.length > 0) {
      setSelectedProfileId(acc.profiles[0].id);
    } else {
      setSelectedProfileId(null);
    }
  }

  // 5. Thêm thuốc lẻ vào giỏ
  const addToCart = (medicineId: string) => {
    const medicine = medicines?.find(m => m.id === medicineId)
    if (!medicine) return

    if (cartItems.find(item => item.id === medicineId)) {
      return message.warning("Thuốc này đã có trong đơn!")
    }

    const newItem: CartItem = {
      ...medicine,
      selectedUnit: medicine.baseUnitName,
      selectedPrice: medicine.baseUnitPrice,
      quantity: 1,
      dosage: ""
    }
    setCartItems([...cartItems, newItem])
  }

  // 6. Thêm nguyên toa cũ vào giỏ
  const handleAddRecentToCart = () => {
    if (!recentPrescription || !recentPrescription.items) return;

    const newItems: CartItem[] = recentPrescription.items.map((item: any) => {
      const med = item.medicine;
      const ratio = item.conversionRatio || 1;
      const displayQty = item.quantity / ratio; 
      const unit = item.sellUnit || med.baseUnitName;

      let currentPrice = med.baseUnitPrice;
      if (unit === med.subUnitName) currentPrice = med.subUnitPrice || med.baseUnitPrice;
      if (unit === med.mainUnitName) currentPrice = med.mainUnitPrice || med.baseUnitPrice;

      return {
        ...med,
        selectedUnit: unit,
        selectedPrice: currentPrice,
        quantity: displayQty,
        dosage: item.dosage || "", 
      };
    });

    const filteredNewItems = newItems.filter(
      (newItem) => !cartItems.some((cartItem) => cartItem.id === newItem.id)
    );

    if (filteredNewItems.length === 0) return message.info("Các thuốc trong toa cũ đều đã có trong giỏ hàng!");

    setCartItems([...cartItems, ...filteredNewItems]);
    message.success("Đã thêm toa thuốc cũ vào giỏ hàng!");
  };

  // 7. Xử lý Thanh toán (Gửi lên BE cả 2 ID)
  const checkoutMutation = useMutation({
    mutationFn: createPrescription,
    onSuccess: () => {
      message.success("Thanh toán thành công!")
      setCartItems([])
      setSelectedAccount(null)
      setSelectedProfileId(null)
      queryClient.invalidateQueries({ queryKey: ["available-medicines"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] })
    },
    onError: (err: any) => message.error(err.response?.data?.message || "Lỗi thanh toán")
  })

  const handleCheckout = () => {
    if (cartItems.length === 0) return message.error("Giỏ hàng trống!")

    checkoutMutation.mutate({
      accountId: selectedAccount?.id || null, // Có thể null nếu là khách vãng lai
      patientProfileId: selectedProfileId || null, 
      items: cartItems.map(item => ({
        medicineId: item.id,
        selectedUnit: item.selectedUnit, 
        quantity: item.quantity,
        dosage: item.dosage,
        priceSnapshot: item.selectedPrice 
      })),
      totalAmount: totalAmount,
      earnedPoints: Math.floor(totalAmount / 10000)
    })
  }
  const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

// Hàm filter thông minh dành cho Ant Design Select
const filterOption = (input: string, option: any) => {
  const inputNoTones = removeVietnameseTones(input);
  const labelNoTones = removeVietnameseTones(String(option?.label || ""));
  return labelNoTones.includes(inputNoTones);
};
  // 8. Cấu hình bảng Giỏ hàng
  const columns = [
    { 
      title: "Tên thuốc", 
      key: "name",
      render: (_: any, record: CartItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Tồn: {record.currentStock} {record.baseUnitName}</Text>
        </Space>
      )
    },
    {
      title: "Liều dùng",
      key: "dosage",
      width: 140,
      render: (_: any, record: CartItem) => (
        <Input 
          placeholder="Sáng 1, Tối 1..." 
          value={record.dosage}
          onChange={(e) => setCartItems(cartItems.map(item => item.id === record.id ? { ...item, dosage: e.target.value } : item))}
        />
      )
    },
    { 
      title: "Đơn vị", 
      key: "unit", 
      width: 110,
      render: (_: any, record: CartItem) => (
        <Select
          value={record.selectedUnit}
          style={{ width: "100%" }}
          onChange={(val) => {
            let price = record.baseUnitPrice;
            if (val === record.subUnitName) price = record.subUnitPrice || record.baseUnitPrice;
            if (val === record.mainUnitName) price = record.mainUnitPrice || record.baseUnitPrice;
            setCartItems(cartItems.map(item => item.id === record.id ? { ...item, selectedUnit: val, selectedPrice: price } : item));
          }}
          options={[
            { value: record.baseUnitName, label: record.baseUnitName },
            ...(record.subUnitName ? [{ value: record.subUnitName, label: record.subUnitName }] : []),
            ...(record.mainUnitName ? [{ value: record.mainUnitName, label: record.mainUnitName }] : []),
          ]}
        />
      )
    },
    { 
      title: "SL", 
      key: "quantity", 
      width: 80,
      render: (_: any, record: CartItem) => (
        <InputNumber 
          min={record.selectedUnit === record.baseUnitName ? 0.5 : 1} 
          step={record.selectedUnit === record.baseUnitName ? 0.5 : 1} 
          value={record.quantity} 
          style={{ width: "100%" }}
          onChange={(val) => setCartItems(cartItems.map(item => item.id === record.id ? { ...item, quantity: val || 0 } : item))}
        />
      )
    },
    { 
      title: "Thành tiền", 
      key: "subtotal",
      align: "right" as const,
      render: (_: any, record: CartItem) => <b>{(record.selectedPrice * record.quantity).toLocaleString()}đ</b>
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_: any, record: CartItem) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setCartItems(cartItems.filter(i => i.id !== record.id))} />
      )
    }
  ]

  return (
    <div style={{ padding: "5px" }}>
      <Row gutter={24}>
        {/* BÊN TRÁI: KHÁCH HÀNG & CHỌN THUỐC */}
        <Col span={9}>
          <Flex vertical gap="large">
            <Card title={<span><UserOutlined /> Hồ sơ khách hàng</span>} variant="borderless" style={{ background: '#f8fafd' }}>
              
              {/* BƯỚC 1: TÌM SĐT GIA ĐÌNH */}
              <Select
                showSearch
                allowClear
                style={{ width: "100%" }}
                placeholder="🔍 Tìm SĐT gia đình..."
                optionFilterProp="label"
                value={selectedAccount?.id || null}
                onChange={handleSelectAccount}
                filterOption={filterOption}
                options={accounts?.map((acc: Account) => {
                  const chuHo = acc.profiles.find(p => p.relationship === "Chủ hộ")?.fullName || "Gia đình";
                  return { value: acc.id, label: `${acc.phone} - ${chuHo}` }
                })}
              />

              {/* BƯỚC 2: CHỌN NGƯỜI DÙNG THUỐC TRONG GIA ĐÌNH ĐÓ */}
              {selectedAccount && (
                <div style={{ marginTop: 15 }}>
                  <Flex justify="space-between">
                    <Text type="secondary">Ví: <b style={{color: '#1890ff'}}>{selectedAccount.phone}</b></Text>
                    <Text type="secondary">Tích lũy: <b style={{color: '#52c41a'}}>{selectedAccount.totalPoints}đ</b></Text>
                  </Flex>
                  
                  <Divider style={{ margin: "12px 0" }} />
                  
                  <div style={{ marginBottom: 8 }}><Text strong>Thuốc này dành cho ai?</Text></div>
                  
                  <Radio.Group 
                    value={selectedProfileId} 
                    onChange={e => setSelectedProfileId(e.target.value)}
                    buttonStyle="solid"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {selectedAccount.profiles.map(p => (
                      <Radio.Button key={p.id} value={p.id} style={{ borderRadius: 6 }}>
                        {p.fullName} <span style={{fontSize: 11, opacity: 0.8}}>({p.relationship})</span>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>
              )}

              {/* KHUNG GỢI Ý TOA CŨ (Tự động đổi khi bấm chọn người khác nhau) */}
              {selectedProfileId && (
                <div style={{ marginTop: 15 }}>
                  {isLoadingRecent ? (
                    <Text type="secondary" italic>Đang kiểm tra lịch sử bệnh án...</Text>
                  ) : recentPrescription ? (
                    <Alert
                      message={<Text strong><HistoryOutlined /> Toa gần nhất ({dayjs(recentPrescription.purchaseDate).format("DD/MM/YYYY")})</Text>}
                      description={
                        <div style={{ marginTop: 8 }}>
                          <ul style={{ paddingLeft: 18, margin: "0 0 10px 0", fontSize: 13 }}>
                            {recentPrescription.items.map((item: any) => {
                              const ratio = item.conversionRatio || 1;
                              const displayQty = item.quantity / ratio;
                              return (
                                <li key={item.id} style={{ marginBottom: 4 }}>
                                  {item.medicine?.name} - <b>{displayQty} {item.sellUnit || item.medicine?.baseUnitName}</b>
                                  {item.dosage && <span style={{ color: '#666' }}> ({item.dosage})</span>}
                                </li>
                              )
                            })}
                          </ul>
                          <Button size="small" type="primary" onClick={handleAddRecentToCart}>
                            Thêm toa này vào giỏ
                          </Button>
                        </div>
                      }
                      type="info"
                      showIcon={false}
                      style={{ background: '#e6f4ff', border: '1px solid #91caff' }}
                    />
                  ) : (
                    <Text type="secondary" italic>Thành viên này chưa có lịch sử mua thuốc.</Text>
                  )}
                </div>
              )}
            </Card>

            <Card title={<span><ShoppingCartOutlined /> Thêm Thuốc lẻ</span>} variant="borderless">
              <Select
                showSearch
                style={{ width: "100%" }}
                placeholder="Gõ tên hoặc mã thuốc..."
                optionFilterProp="label"
                onChange={addToCart}
                value={null}
                filterOption={filterOption}
                options={medicines?.map(m => ({ 
                  value: m.id, 
                  label: `${m.name} - ${m.baseUnitPrice.toLocaleString()}đ/${m.baseUnitName}` 
                }))}
              />
            </Card>
          </Flex>
        </Col>

        {/* BÊN PHẢI: CHI TIẾT ĐƠN HÀNG */}
        <Col span={15}>
          <Card title="Chi tiết giỏ hàng" variant="borderless" style={{ minHeight: "550px", display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <Table 
                dataSource={cartItems} 
                columns={columns} 
                rowKey="id" 
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="Chưa có thuốc nào trong đơn" /> }}
              />
            </div>
            
            <Divider />
            
            <Flex justify="space-between" align="center">
              <div>
                <Title level={4} style={{ margin: 0 }}>Tổng cộng:</Title>
                <Text type="secondary">Cộng điểm ví: +{Math.floor(totalAmount / 10000)}đ</Text>
              </div>
              <div style={{ textAlign: "right" }}>
                <Title level={2} style={{ color: "#f5222d", margin: 0 }}>
                  {totalAmount.toLocaleString()}đ
                </Title>
              </div>
            </Flex>

            <Button 
              type="primary" 
              size="large" 
              block 
              style={{ marginTop: 24, height: 55, fontSize: 18, fontWeight: "bold" }}
              icon={<CheckCircleOutlined />}
              onClick={handleCheckout}
              loading={checkoutMutation.isPending}
            >
              XÁC NHẬN THANH TOÁN
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}