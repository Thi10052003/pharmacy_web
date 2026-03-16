"use client"

import { useState, useMemo } from "react"
import {
    Row, Col, Card, Input, Select, Table, Button, InputNumber,
    Typography, Divider, message, Space, DatePicker, Flex
} from "antd"
import {
    CheckCircleOutlined, DeleteOutlined,
    MedicineBoxOutlined, ArrowLeftOutlined
} from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { getAllSuppliers } from "@/services/supplier.service"
import { getAllMedicines } from "@/services/medicine.service"
import { importInventory } from "@/services/inventory.service"

const { Title, Text } = Typography

export default function ImportInventoryPage() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
    const [invoiceCode, setInvoiceCode] = useState("")
    const [paidAmount, setPaidAmount] = useState(0)
    const [importItems, setImportItems] = useState<any[]>([])

    const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: getAllSuppliers })
    const { data: medicines } = useQuery({ queryKey: ["medicines"], queryFn: getAllMedicines })

    const totalBillAmount = useMemo(() => {
        return importItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0)
    }, [importItems])

    const addItemToBill = (medicineId: string) => {
        const medicine = medicines?.find(m => m.id === medicineId)
        if (!medicine) return
        const newItem = {
            key: Date.now(),
            medicineId: medicine.id,
            name: medicine.name,
            code: medicine.code,
            batchNumber: "",
            expiryDate: null,
            unitName: medicine.baseUnitName,
            quantity: 1,
            purchasePrice: 0,
        }
        setImportItems([...importItems, newItem])
    }

    const importMutation = useMutation({
        mutationFn: importInventory,
        onSuccess: () => {
            message.success("Hoàn thành nhập kho!")
            queryClient.invalidateQueries({ queryKey: ["medicines"] })
            router.push("/inventory")
        },
        onError: (err: any) => message.error(err.response?.data?.message || "Lỗi nhập kho")
    })
    const removeVietnameseTones = (str: string) => {
        if (!str) return "";
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase();
    };

    // Hàm filter thông minh cho Ant Design Select
    const filterOption = (input: string, option: any) => {
        const inputNoTones = removeVietnameseTones(input);
        // option.label chứa tên hiển thị (Tên NCC hoặc Tên thuốc)
        const labelNoTones = removeVietnameseTones(String(option?.label || ""));

        return labelNoTones.includes(inputNoTones);
    };
    const handleCompleteImport = () => {
        if (!selectedSupplier) return message.error("Vui lòng chọn nhà cung cấp!")
        if (importItems.length === 0) return message.error("Phiếu nhập trống!")

        const isValid = importItems.every(item => item.batchNumber && item.expiryDate)
        if (!isValid) return message.error("Vui lòng nhập đầy đủ Số lô và HSD!")

        importMutation.mutate({
            supplierId: selectedSupplier,
            invoiceCode,
            paidAmount,
            paymentMethod: "Tiền mặt",
            items: importItems.map(item => ({
                medicineId: item.medicineId,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate.toISOString(),
                unitName: item.unitName,
                quantity: item.quantity,
                purchasePrice: item.purchasePrice
            }))
        })
    }

    const columns = [
        {
            title: "Tên mặt hàng",
            key: "medicine",
            render: (_: any, record: any) => (
                <Flex vertical gap={0}>
                    <Text strong>{record.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.code}</Text>
                </Flex>
            )
        },
        {
            title: "Số lô (*)",
            key: "batchNumber",
            render: (_: any, record: any) => (
                <Input
                    placeholder="Số lô"
                    value={record.batchNumber}
                    onChange={(e) => {
                        const newItems = importItems.map(item => item.key === record.key ? { ...item, batchNumber: e.target.value } : item)
                        setImportItems(newItems)
                    }}
                />
            )
        },
        {
            title: "HSD (*)",
            key: "expiryDate",
            render: (_: any, record: any) => (
                <DatePicker
                    placeholder="Hạn dùng"
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={record.expiryDate}
                    onChange={(val) => {
                        const newItems = importItems.map(item => item.key === record.key ? { ...item, expiryDate: val } : item)
                        setImportItems(newItems)
                    }}
                />
            )
        },
        {
            title: "Đơn vị (*)",
            key: "unitName",
            width: 120,
            render: (_: any, record: any) => {
                const med = medicines?.find(m => m.id === record.medicineId);
                return (
                    <Select
                        value={record.unitName}
                        style={{ width: '100%' }}
                        onChange={(val) => {
                            const newItems = importItems.map(item => item.key === record.key ? { ...item, unitName: val } : item)
                            setImportItems(newItems)
                        }}
                    >
                        <Select.Option value={med?.baseUnitName}>{med?.baseUnitName}</Select.Option>
                        {med?.subUnitName && <Select.Option value={med.subUnitName}>{med.subUnitName}</Select.Option>}
                        {med?.mainUnitName && <Select.Option value={med.mainUnitName}>{med.mainUnitName}</Select.Option>}
                    </Select>
                )
            }
        },
        {
            title: "Số lượng",
            key: "quantity",
            render: (_: any, record: any) => (
                <InputNumber
                    min={1}
                    value={record.quantity}
                    onChange={(val) => {
                        const newItems = importItems.map(item => item.key === record.key ? { ...item, quantity: val || 0 } : item)
                        setImportItems(newItems)
                    }}
                />
            )
        },
        {
            title: "Giá nhập",
            key: "purchasePrice",
            render: (_: any, record: any) => (
                <InputNumber
                    style={{ width: '100%' }}
                    formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    value={record.purchasePrice}
                    onChange={(val) => {
                        const newItems = importItems.map(item => item.key === record.key ? { ...item, purchasePrice: val || 0 } : item)
                        setImportItems(newItems)
                    }}
                />
            )
        },
        {
            title: "Thành tiền",
            key: "total",
            align: "right" as const,
            render: (_: any, record: any) => (
                <Text strong>{(record.quantity * record.purchasePrice).toLocaleString()}đ</Text>
            )
        },
        {
            title: "",
            key: "action",
            render: (_: any, record: any) => (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setImportItems(importItems.filter(i => i.key !== record.key))} />
            )
        }
    ]

    return (
        <div style={{ padding: "10px" }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 15 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/inventory")}>Trở về (F10)</Button>
                    <Title level={4} style={{ margin: 0 }}>Quản lý kho &gt; Tạo phiếu nhập mới</Title>
                </Space>
                <Space>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleCompleteImport}
                        loading={importMutation.isPending}
                    >
                        HOÀN THÀNH (F9)
                    </Button>
                </Space>
            </Flex>

            <Row gutter={16}>
                <Col span={24}>
                    <Card size="small" style={{ marginBottom: 16 }}>
                        <Row gutter={24}>
                            <Col span={6}>
                                <Text type="secondary">Nhà cung cấp (F4) *</Text>
                                <Select
                                    showSearch
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Chọn nhà cung cấp..."
                                    optionFilterProp="label" // Yêu cầu AntD tìm trên cái tên hiển thị (label)
                                    filterOption={filterOption}
                                    onChange={setSelectedSupplier}
                                    options={suppliers?.map(s => ({ value: s.id, label: s.name }))}
                                />
                            </Col>
                            <Col span={6}>
                                <Text type="secondary">Mã hóa đơn</Text>
                                <Input
                                    style={{ marginTop: 4 }}
                                    placeholder="Số hóa đơn..."
                                    value={invoiceCode}
                                    onChange={(e) => setInvoiceCode(e.target.value)}
                                />
                            </Col>
                            <Col span={4}>
                                <Text type="secondary">Tổng tiền hàng</Text>
                                <Title level={4} style={{ margin: 0 }}>{totalBillAmount.toLocaleString()}đ</Title>
                            </Col>
                            <Col span={4}>
                                <Text type="secondary">Đã thanh toán (F6)</Text>
                                <InputNumber
                                    style={{ width: '100%', marginTop: 4 }}
                                    value={paidAmount}
                                    onChange={(val) => setPaidAmount(val || 0)}
                                    formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                />
                            </Col>
                            <Col span={4}>
                                <Text type="secondary">Công nợ phiếu</Text>
                                <Title level={4} style={{ margin: 0, color: '#f5222d' }}>
                                    {(totalBillAmount - paidAmount).toLocaleString()}đ
                                </Title>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card size="small" title={<Space><MedicineBoxOutlined /> Chọn thuốc vào phiếu</Space>}>
                        <Select
                            showSearch
                            style={{ width: '100%' }}
                            placeholder="Gõ tên thuốc để thêm vào danh sách nhập (F3)..."
                            optionFilterProp="label"
                            filterOption={filterOption}// Đã sửa logic kiểm tra null tại đây
                            onSelect={(val: string | null) => {
                                if (val) addItemToBill(val);
                            }}
                            value={null}
                            options={medicines?.map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))}
                        />

                        <Table
                            style={{ marginTop: 16 }}
                            dataSource={importItems}
                            columns={columns}
                            pagination={false}
                            bordered
                            size="small"
                            locale={{ emptyText: "Vui lòng thêm mặt hàng cần nhập kho" }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}