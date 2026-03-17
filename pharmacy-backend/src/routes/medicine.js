const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// Thêm 2 thư viện xử lý file Excel
const multer = require("multer");
const xlsx = require("xlsx");

// Cấu hình Multer lưu file tạm vào RAM
const upload = multer({ storage: multer.memoryStorage() });

// =========================================================================
// 1. API IMPORT EXCEL (VIETTEL PMS / KIOTVIET) - THIẾT KẾ ĐỘC QUYỀN
// =========================================================================
// =========================================================================
// 1. API IMPORT EXCEL V2 (PRICELIST) - GỘP DÒNG & TỒN KHO 1000
// =========================================================================
router.post("/import-pricelist", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng đính kèm file Excel!" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // File PriceList có header ở dòng số 8, nên phải bỏ qua 7 dòng đầu (range: 7)
    const data = xlsx.utils.sheet_to_json(sheet, { range: 7 });

    if (data.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu hợp lệ!" });
    }

    // BƯỚC 1: GOM NHÓM (Grouping) các dòng theo Mã hàng hóa (SKU)
    const groupedData = {};
    for (const row of data) {
      const code = row["Mã hàng hóa"];
      const name = row["Tên hàng hóa"];
      const unit = row["Đơn vị tính"];
      // Lấy "Giá mới", nếu không có thì lấy "Giá chung"
      let price = row["Giá mới"] !== undefined ? row["Giá mới"] : row["Giá chung"];
      
      if (!code || !name || !unit) continue;

      price = parseFloat(String(price).replace(/,/g, '')) || 0;

      // Nếu mã này chưa có trong nhóm thì tạo mới
      if (!groupedData[code]) {
        groupedData[code] = {
          code: String(code),
          name: String(name),
          units: []
        };
      }
      
      // Đẩy đơn vị và giá vào mảng của mặt hàng đó
      groupedData[code].units.push({ name: String(unit).trim(), price });
    }

    let successCount = 0;
    let errorList = [];

    // BƯỚC 2: XỬ LÝ DỮ LIỆU ĐÃ GOM NHÓM VÀ LƯU VÀO DATABASE
    for (const code in groupedData) {
      const product = groupedData[code];
      
      try {
        // Sắp xếp giá từ thấp đến cao (Giá rẻ nhất luôn là Đơn vị cơ bản/Viên)
        product.units.sort((a, b) => a.price - b.price);

        let baseUnitName = product.units[0].name;
        let baseUnitPrice = product.units[0].price;
        let subUnitName = null, subUnitPrice = null, pillsPerSubUnit = null;
        let mainUnitName = null, mainUnitPrice = null, mainUnitRatio = null;

        // Nếu mặt hàng có 2 đơn vị (VD: Viên, Hộp)
        if (product.units.length === 2) {
          mainUnitName = product.units[1].name;
          mainUnitPrice = product.units[1].price;
          mainUnitRatio = baseUnitPrice > 0 ? Math.round(mainUnitPrice / baseUnitPrice) : 1;
        } 
        // Nếu mặt hàng có từ 3 đơn vị trở lên (VD: Viên, Vỉ, Hộp)
        else if (product.units.length >= 3) {
          subUnitName = product.units[1].name;
          subUnitPrice = product.units[1].price;
          pillsPerSubUnit = baseUnitPrice > 0 ? Math.round(subUnitPrice / baseUnitPrice) : 1;
          
          mainUnitName = product.units[2].name;
          mainUnitPrice = product.units[2].price;
          mainUnitRatio = subUnitPrice > 0 ? Math.round(mainUnitPrice / subUnitPrice) : 1;
        }

        // Lưu vào Database (Luôn ép currentStock = 1000)
        await prisma.medicine.upsert({
          where: { code: product.code },
          update: {
            name: product.name,
            baseUnitName, baseUnitPrice,
            subUnitName, subUnitPrice, pillsPerSubUnit,
            mainUnitName, mainUnitPrice, mainUnitRatio,
            currentStock: 1000 
          },
          create: {
            code: product.code,
            name: product.name,
            baseUnitName, baseUnitPrice,
            subUnitName, subUnitPrice, pillsPerSubUnit,
            mainUnitName, mainUnitPrice, mainUnitRatio,
            currentStock: 1000, 
            isActive: true
          }
        });

        successCount++;
      } catch (error) {
        errorList.push(`Lỗi mã ${code}: ${error.message}`);
      }
    }

    res.json({
      message: `Import hoàn tất! Thành công: ${successCount} mặt hàng. Lỗi: ${errorList.length}`,
      successCount,
      errors: errorList
    });

  } catch (error) {
    console.error("Lỗi import PriceList:", error);
    res.status(500).json({ error: "Lỗi cấu trúc file Excel. Vui lòng kiểm tra lại." });
  }
});


// =========================================================================
// CÁC API CRUD CƠ BẢN
// =========================================================================

// 2. LẤY TẤT CẢ THUỐC
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

// 3. LẤY THUỐC CÒN HÀNG (Dành cho trang bán hàng)
router.get("/available", async (req, res, next) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        currentStock: { gt: 0 },
      },
      orderBy: { name: "asc" },
    })
    res.json(medicines)
  } catch (err) {
    next(err)
  }
})

// 4. TẠO THUỐC MỚI (Đã thêm 3 cột mới)
router.post("/", async (req, res) => {
  try {
    const { 
      code, name, 
      registrationNo, activeIngredient, packagingSize, // 3 trường mới
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
        registrationNo: registrationNo || null,
        activeIngredient: activeIngredient || null,
        packagingSize: packagingSize || null,

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

// 5. CẬP NHẬT THÔNG TIN THUỐC (Đã thêm 3 cột mới)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updateData = {
      name: data.name,
      code: data.code,
      isActive: data.isActive,
      
      registrationNo: data.registrationNo || null,
      activeIngredient: data.activeIngredient || null,
      packagingSize: data.packagingSize || null,

      baseUnitName: data.baseUnitName,
      baseUnitPrice: Number(data.baseUnitPrice), 

      subUnitName: data.subUnitName || null,
      pillsPerSubUnit: data.subUnitName ? Number(data.pillsPerSubUnit) : null,
      subUnitPrice: data.subUnitName ? Number(data.subUnitPrice) : null,

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
    console.error("Lỗi cập nhật thuốc:", err); 
    
    if (err.code === 'P2002') {
      return res.status(400).json({ message: "Mã thuốc đã bị trùng với thuốc khác!" });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: "Không tìm thấy thuốc cần sửa!" });
    }
    
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// 6. XÓA THUỐC
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const medicine = await prisma.medicine.findUnique({ where: { id } });

    if (!medicine) {
      return res.status(404).json({ message: "Không tìm thấy thuốc" });
    }

    if (medicine.isActive === true) {
      return res.status(400).json({ 
        message: "CẢNH BÁO: Không thể xóa thuốc đang trong trạng thái 'Đang bán'. Bạn phải chuyển sang 'Ngừng bán' trước khi xóa vĩnh viễn." 
      });
    }

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

// 7. CẬP NHẬT TRẠNG THÁI (Kinh doanh / Ngừng kinh doanh)
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body; 

  try {
    const updatedMedicine = await prisma.medicine.update({
      where: { id },
      data: { isActive } 
    });
    res.json(updatedMedicine);
  } catch (err) {
    console.error("Lỗi đổi trạng thái thuốc:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;