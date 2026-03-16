const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// 1. NHẬP KHO (IMPORT) - FIX LỖI THIẾU ITEM VÀ LÔ
router.post("/import", async (req, res) => {
  const { supplierId, invoiceCode, items, paidAmount, paymentMethod, note } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalBillAmount = 0;

      // 1. Tạo "Vỏ phiếu"
      const bill = await tx.importBill.create({
        data: {
          supplierId,
          invoiceCode,
          paidAmount: Number(paidAmount) || 0,
          paymentMethod,
          note,
          totalAmount: 0, // Tính sau
          status: "COMPLETED"
        }
      });

      // 2. Xử lý từng mặt hàng (Cái "Ruột phiếu")
      for (const item of items) {
        // Tính toán tiền
        const itemTotal = Number(item.quantity) * Number(item.purchasePrice);
        totalBillAmount += itemTotal;

        // Tìm thuốc để lấy tỷ lệ quy đổi (nếu nhập theo Hộp/Vỉ)
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        
        // --- LOGIC QUY ĐỔI ĐƠN VỊ KHI NHẬP ---
        // Giả sử item.unitName là đơn vị nhập (Hộp), cần quy ra Base Unit (Viên) để cộng kho
        let conversionRatio = 1;
        if (item.unitName === medicine.subUnitName) conversionRatio = medicine.pillsPerSubUnit || 1;
        else if (item.unitName === medicine.mainUnitName) conversionRatio = (medicine.mainUnitRatio || 1) * (medicine.pillsPerSubUnit || 1);
        
        const totalBaseQuantity = Number(item.quantity) * conversionRatio;

        // 3. TẠO HOẶC CẬP NHẬT LÔ HÀNG (BATCH)
        // Quan trọng: Phải có Batch ID thì Nhật ký mới hiện số lô
        const batch = await tx.batch.upsert({
          where: {
            medicineId_batchNumber_expiryDate: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: new Date(item.expiryDate)
            }
          },
          update: { remainingQuantity: { increment: totalBaseQuantity } },
          create: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            remainingQuantity: totalBaseQuantity,
            purchasePrice: Number(item.purchasePrice) / conversionRatio // Giá vốn 1 viên
          }
        });

        // 4. LƯU CHI TIẾT PHIẾU NHẬP (FIX LỖI PRISMA STUDIO TRỐNG)
        await tx.importBillItem.create({
          data: {
            importBillId: bill.id,
            medicineId: item.medicineId,
            unitName: item.unitName,
            quantity: Number(item.quantity),
            purchasePrice: Number(item.purchasePrice),
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate)
          }
        });

        // 5. GHI NHẬT KÝ KHO (FIX LỖI HIỆN "---")
        await tx.inventoryHistory.create({
          data: {
            medicineId: item.medicineId,
            // QUAN TRỌNG: Phải gắn batchId vào đây thì FE mới hiển thị được Số lô/HSD
            batchId: batch.id, 
            action: "IMPORT",
            quantity: totalBaseQuantity, // Ghi nhận số lượng quy đổi (Viên)
            stockAfter: medicine.currentStock + totalBaseQuantity,
            note: `Nhập kho: ${item.quantity} ${item.unitName} - Phiếu: ${bill.id.slice(-6)}`
          }
        });

        // 6. Cộng tồn tổng Medicine
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { currentStock: { increment: totalBaseQuantity } }
        });
      }

      // 7. Cập nhật lại tổng tiền phiếu nhập
      await tx.importBill.update({
        where: { id: bill.id },
        data: { totalAmount: totalBillAmount }
      });

      // 8. Cập nhật công nợ nhà cung cấp
      const debtIncrement = totalBillAmount - (Number(paidAmount) || 0);
      if (debtIncrement !== 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { debt: { increment: debtIncrement } }
        });
      }

      return bill;
    });

    res.json(result);
  } catch (err) {
    console.error("Lỗi Import:", err);
    res.status(400).json({ message: err.message });
  }
});

// 2. XUẤT KHO THỦ CÔNG (EXPORT)
router.post("/export", async (req, res) => {
  const { medicineId, quantity, note } = req.body; // quantity là số dương

  try {
    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
      if (!medicine || medicine.currentStock < quantity) {
        throw new Error("Không đủ hàng để xuất");
      }

      // Trừ tồn tổng
      await tx.medicine.update({
        where: { id: medicineId },
        data: { currentStock: { decrement: quantity } }
      });

      // Trừ Lô (FEFO) - Tự động trừ lô hết hạn trước
      let remainingToExport = Number(quantity);
      const batches = await tx.batch.findMany({
        where: { medicineId, remainingQuantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' }
      });

      for (const batch of batches) {
        if (remainingToExport <= 0) break;
        const take = Math.min(remainingToExport, batch.remainingQuantity);

        await tx.batch.update({
          where: { id: batch.id },
          data: { remainingQuantity: { decrement: take } }
        });

        // Ghi nhật ký gắn với lô
        await tx.inventoryHistory.create({
          data: {
            medicineId,
            batchId: batch.id,
            action: "EXPORT",
            quantity: -take, // Xuất là số âm
            stockAfter: medicine.currentStock - quantity, // Số tương đối
            note: note || "Xuất kho thủ công"
          }
        });

        remainingToExport -= take;
      }

      return { message: "Xuất kho thành công" };
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. LẤY LỊCH SỬ BIẾN ĐỘNG (FIX LỖI KHÔNG HIỆN THÔNG TIN LÔ)
router.get("/history", async (req, res) => {
  try {
    const history = await prisma.inventoryHistory.findMany({
      include: {
        medicine: { 
          select: { name: true, code: true, baseUnitName: true } 
        },
        // QUAN TRỌNG: Include batch để lấy số lô và HSD hiển thị lên bảng
        batch: {
          select: { batchNumber: true, expiryDate: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format lại dữ liệu cho đẹp trước khi trả về FE
    const formattedHistory = history.map(h => ({
      ...h,
      batchNumber: h.batch?.batchNumber || "---",
      expiryDate: h.batch?.expiryDate || null
    }));

    res.json(formattedHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// API: Lấy danh sách Lô thuốc sắp hết hạn (Cận Date <= 90 ngày) hoặc Đã hết hạn
router.get("/expiry-warnings", async (req, res) => {
  try {
    const today = new Date();
    
    // Tính mốc thời gian 90 ngày sau kể từ hôm nay
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    // Tìm các Lô thuốc (Batch) còn tồn kho VÀ có HSD nhỏ hơn mốc 90 ngày
    const warningBatches = await prisma.batch.findMany({
      where: {
        remainingQuantity: { gt: 0 }, // Chỉ quan tâm lô nào còn hàng
        expiryDate: { lte: ninetyDaysLater } // HSD <= 90 ngày tới
      },
      include: {
        medicine: {
          // FIX LỖI Ở ĐÂY: Sửa 'sku' thành 'code' cho đúng với Schema của bạn
          select: { code: true, name: true, baseUnitName: true } 
        }
      },
      orderBy: { expiryDate: 'asc' } // Sắp xếp cái nào gần hết hạn nhất lên đầu
    });

    // Tính toán thêm số ngày còn lại để Frontend dễ hiển thị
    const results = warningBatches.map(batch => {
      const expiryDate = new Date(batch.expiryDate);
      const isExpired = expiryDate < today;
      
      // Công thức tính số ngày chênh lệch
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...batch,
        isExpired,
        daysRemaining
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Lỗi API Expiry Warnings:", error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;