const express = require("express")
const router = express.Router()
const prisma = require("../prisma")

// 1. LẤY TẤT CẢ THUỐC
router.get("/", async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LẤY THUỐC CÒN HÀNG (Dành cho trang bán hàng)
router.get("/available", async (req, res, next) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true, // Chỉ lấy thuốc đang kinh doanh
        currentStock: { gt: 0 },
      },
      orderBy: { name: "asc" },
    })
    res.json(medicines)
  } catch (err) {
    next(err)
  }
})

// 3. TẠO THUỐC MỚI (Cập nhật logic đa đơn vị)
router.post("/", async (req, res) => {
  try {
    // Nhận các trường mới từ Frontend gửi lên
    const { 
      code, name, 
      baseUnitName, baseUnitPrice,
      subUnitName, pillsPerSubUnit, subUnitPrice,
      mainUnitName, mainUnitRatio, mainUnitPrice,
      currentStock 
    } = req.body
    
    const medicine = await prisma.medicine.create({
      data: { 
        code, 
        name,
        isActive: true,
        // Ép kiểu dữ liệu để đảm bảo Prisma không báo lỗi
        baseUnitName: baseUnitName || "Viên",
        baseUnitPrice: parseFloat(baseUnitPrice || 0),
        
        subUnitName: subUnitName || null,
        pillsPerSubUnit: pillsPerSubUnit ? parseInt(pillsPerSubUnit) : null,
        subUnitPrice: subUnitPrice ? parseFloat(subUnitPrice) : null,

        mainUnitName: mainUnitName || null,
        mainUnitRatio: mainUnitRatio ? parseInt(mainUnitRatio) : null,
        mainUnitPrice: mainUnitPrice ? parseFloat(mainUnitPrice) : null,

        currentStock: parseFloat(currentStock || 0)
      }
    })

    res.status(201).json(medicine)
  } catch (err) {
    console.error("Lỗi tạo thuốc:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Mã thuốc này đã tồn tại!" })
    }
    res.status(500).json({ error: err.message })
  }
})
// 4. CẬP NHẬT THÔNG TIN THUỐC
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // Logic: Nếu không nhập tên đơn vị phụ -> Reset toàn bộ giá trị liên quan về null
    const updateData = {
      name: data.name,
      code: data.code,
      isActive: data.isActive,

      // Đơn vị cơ bản (Bắt buộc)
      baseUnitName: data.baseUnitName,
      baseUnitPrice: Number(data.baseUnitPrice), // Ép kiểu Float

      // Đơn vị cấp 2 (Vỉ)
      subUnitName: data.subUnitName || null,
      pillsPerSubUnit: data.subUnitName ? Number(data.pillsPerSubUnit) : null,
      subUnitPrice: data.subUnitName ? Number(data.subUnitPrice) : null,

      // Đơn vị cấp 3 (Hộp)
      mainUnitName: data.mainUnitName || null,
      mainUnitRatio: data.mainUnitName ? Number(data.mainUnitRatio) : null,
      mainUnitPrice: data.mainUnitName ? Number(data.mainUnitPrice) : null,
    };

    const updatedMedicine = await prisma.medicine.update({
      where: { id },
      data: updateData
    });

    res.json(updatedMedicine);
  } catch (err) {
    console.error("Lỗi cập nhật thuốc:", err); // In lỗi ra terminal để debug
    
    // Xử lý lỗi Prisma thường gặp
    if (err.code === 'P2002') {
      return res.status(400).json({ message: "Mã thuốc đã bị trùng với thuốc khác!" });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: "Không tìm thấy thuốc cần sửa!" });
    }
    
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// src/routes/medicine.js

// 5. XÓA THUỐC (Chỉ cho xóa khi isActive = false)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Kiểm tra trạng thái hiện tại của thuốc
    const medicine = await prisma.medicine.findUnique({ where: { id } });

    if (!medicine) {
      return res.status(404).json({ message: "Không tìm thấy thuốc" });
    }

    // 2. CHẶN XÓA nếu thuốc đang ở trạng thái kinh doanh
    if (medicine.isActive === true) {
      return res.status(400).json({ 
        message: "CẢNH BÁO: Không thể xóa thuốc đang trong trạng thái 'Đang bán'. Bạn phải chuyển sang 'Ngừng bán' trước khi xóa vĩnh viễn." 
      });
    }

    // 3. THỰC HIỆN XÓA VĨNH VIỄN (Xóa cả lịch sử liên quan vì chủ nhà thuốc yêu cầu)
    await prisma.$transaction([
      prisma.inventoryHistory.deleteMany({ where: { medicineId: id } }),
      prisma.prescriptionItem.deleteMany({ where: { medicineId: id } }),
      prisma.medicine.delete({ where: { id } }),
    ]);

    res.json({ message: "Đã xóa vĩnh viễn thuốc và toàn bộ lịch sử liên quan." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa dữ liệu." });
  }
});
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body; // Chỉ nhận đúng 1 biến isActive

  try {
    const updatedMedicine = await prisma.medicine.update({
      where: { id },
      data: { isActive } // Chỉ cập nhật trường này, giữ nguyên các trường khác
    });
    res.json(updatedMedicine);
  } catch (err) {
    console.error("Lỗi đổi trạng thái thuốc:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router