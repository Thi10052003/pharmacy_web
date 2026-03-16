const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// Lấy danh sách NCC
router.get("/", async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ 
      orderBy: { createdAt: 'desc' } 
    });
    res.json(suppliers);
  } catch (err) {
    // In lỗi ra terminal backend để debug
    console.error("❌ LỖI GET SUPPLIERS:", err); 
    res.status(500).json({ error: "Lỗi database: " + err.message });
  }
});
router.post("/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, note } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra nhà cung cấp
      const supplier = await tx.supplier.findUnique({ where: { id } });
      if (!supplier) throw new Error("Không tìm thấy nhà cung cấp");
      if (supplier.debt < amount) throw new Error(`Số tiền trả (${amount}) lớn hơn số nợ hiện tại (${supplier.debt})`);

      // 2. Tạo Phiếu chi
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: id,
          amount: Number(amount),
          paymentMethod,
          note
        }
      });

      // 3. Trừ nợ
      await tx.supplier.update({
        where: { id },
        data: { debt: { decrement: Number(amount) } }
      });

      return payment;
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Tạo NCC mới
router.post("/", async (req, res) => {
  try {
    console.log("📥 Dữ liệu nhận được:", req.body); // Kiểm tra xem FE gửi gì lên

    const supplier = await prisma.supplier.create({ 
      data: {
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address,
        debt: 0 // Đảm bảo có giá trị mặc định cho công nợ
      }
    });
    res.status(201).json(supplier);
  } catch (err) {
    console.error("❌ LỖI POST SUPPLIER:", err);
    // Trả về lỗi chi tiết để biết tại sao bị 400
    res.status(400).json({ 
      message: "Lỗi tạo nhà cung cấp", 
      detail: err.message 
    });
  }
});

// Chỉnh sửa NCC
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.supplier.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ LỖI PUT SUPPLIER:", err);
    res.status(400).json({ message: "Không thể cập nhật", detail: err.message });
  }
});

module.exports = router;