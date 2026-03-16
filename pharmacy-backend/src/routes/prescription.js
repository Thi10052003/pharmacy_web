// src/routes/prescription.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// 1. LẤY DANH SÁCH ĐƠN HÀNG (SỬA LẠI TÌM KIẾM ĐỂ MATCH VỚI MÔ HÌNH MỚI)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      whereClause = {
        OR: [
          { id: { contains: search, mode: "insensitive" } },
          { account: { phone: { contains: search } } },
          { patientProfile: { fullName: { contains: search, mode: "insensitive" } } }
        ]
      };
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        account: { select: { phone: true } },
        patientProfile: { select: { fullName: true } },
        items: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LẤY ĐƠN THUỐC GẦN NHẤT CỦA 1 THÀNH VIÊN (DÙNG CHO TRANG POS)
router.get("/patient/:profileId/recent", async (req, res) => {
  try {
    const { profileId } = req.params;
    const recentPrescription = await prisma.prescription.findFirst({
      where: { patientProfileId: profileId, status: "ACTIVE" },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { medicine: true } } }
    });
    res.json(recentPrescription || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. LẤY CHI TIẾT MỘT ĐƠN HÀNG
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        account: true,
        patientProfile: true,
        items: { include: { medicine: true } }
      }
    });
    if (!prescription) return res.status(404).json({ message: "Không tìm thấy đơn thuốc" });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. XỬ LÝ THANH TOÁN (CORE LOGIC)
// 4. XỬ LÝ THANH TOÁN (CORE LOGIC)
router.post("/checkout", async (req, res) => {
  const { accountId, patientProfileId, items, earnedPoints, totalAmount } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let serverCalculatedTotal = 0;
      const processedItems = [];

      for (const item of items) {
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) throw new Error(`Thuốc ID ${item.medicineId} không tồn tại`);

        const buyQty = Number(item.quantity);
        const unitName = item.selectedUnit || item.unit || medicine.baseUnitName;
        
        let unitPrice = Number(item.priceSnapshot);
        if (!unitPrice || unitPrice === 0) {
            if (unitName === medicine.mainUnitName) unitPrice = medicine.mainUnitPrice;
            else if (unitName === medicine.subUnitName) unitPrice = medicine.subUnitPrice;
            else unitPrice = medicine.baseUnitPrice;
        }

        let conversionRatio = 1;
        if (unitName === medicine.subUnitName) conversionRatio = medicine.pillsPerSubUnit || 1;
        else if (unitName === medicine.mainUnitName) conversionRatio = (medicine.mainUnitRatio || 1) * (medicine.pillsPerSubUnit || 1);
        
        const totalBaseQuantityToDeduct = buyQty * conversionRatio;
        serverCalculatedTotal += (unitPrice * buyQty);

        if (medicine.currentStock < totalBaseQuantityToDeduct) {
          throw new Error(`Thuốc ${medicine.name} không đủ tồn kho (Cần ${totalBaseQuantityToDeduct} viên, còn ${medicine.currentStock} viên)`);
        }

        // Cập nhật tồn kho tổng
        await tx.medicine.update({
          where: { id: medicine.id },
          data: { currentStock: { decrement: totalBaseQuantityToDeduct } }
        });

        // TÍNH TOÁN "TỒN SAU CÙNG" (SỬA LỖI HIỂN THỊ SỐ 0)
        let remainingToDeduct = totalBaseQuantityToDeduct;
        let runningStock = medicine.currentStock; // Lấy tồn kho trước khi trừ làm mốc

        const batches = await tx.batch.findMany({
          where: { medicineId: medicine.id, remainingQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }
        });

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const take = Math.min(remainingToDeduct, batch.remainingQuantity);
          
          runningStock -= take; // Trừ dần để ra "Tồn sau cùng" của từng Lô

          await tx.batch.update({
            where: { id: batch.id },
            data: { remainingQuantity: { decrement: take } }
          });

          processedItems.push({
            medicineId: item.medicineId,
            batchId: batch.id,
            quantity: take, 
            priceSnapshot: unitPrice / conversionRatio, 
            dosage: item.dosage || "",
            sellUnit: unitName, 
            conversionRatio: conversionRatio,
            stockAfter: runningStock // LƯU KẾT QUẢ VÀO MẢNG
          });

          remainingToDeduct -= take;
        }

        if (remainingToDeduct > 0) throw new Error(`Kho lô của ${medicine.name} bị lỗi đồng bộ!`);
      }

      // TẠO VỎ ĐƠN THUỐC
      const prescription = await tx.prescription.create({
        data: {
          accountId: accountId || null,
          patientProfileId: patientProfileId || null,
          totalAmount: serverCalculatedTotal,
          earnedPoints: Math.floor(serverCalculatedTotal / 10000), 
          status: "ACTIVE"
        }
      });

      // LƯU CHI TIẾT VÀ NHẬT KÝ KHO
      for (const pItem of processedItems) {
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicineId: pItem.medicineId,
            batchId: pItem.batchId,
            quantity: pItem.quantity,
            priceSnapshot: pItem.priceSnapshot,
            dosage: pItem.dosage,
            sellUnit: pItem.sellUnit,
            conversionRatio: pItem.conversionRatio
          }
        });

        await tx.inventoryHistory.create({
          data: {
            medicineId: pItem.medicineId,
            batchId: pItem.batchId,
            action: "EXPORT",
            quantity: -pItem.quantity,
            stockAfter: pItem.stockAfter, // SỬ DỤNG GIÁ TRỊ ĐÃ TÍNH THAY VÌ SỐ 0
            note: `Bán hàng (POS) - Đơn: ${prescription.id.slice(-6)}`
          }
        });
      }

      if (accountId && prescription.earnedPoints > 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { totalPoints: { increment: prescription.earnedPoints } }
        });
      }

      return prescription;
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. HỦY ĐƠN HÀNG (TRẢ LẠI KHO VÀ TRỪ ĐIỂM TÀI KHOẢN)
router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!prescription) throw new Error("Không tìm thấy đơn thuốc");
      if (prescription.status === "CANCELLED") throw new Error("Đơn này đã bị hủy trước đó rồi");

      await tx.prescription.update({
        where: { id },
        data: { status: "CANCELLED" }
      });

      if (prescription.accountId && prescription.earnedPoints > 0) {
        await tx.account.update({
          where: { id: prescription.accountId },
          data: { totalPoints: { decrement: prescription.earnedPoints } }
        });
      }

      // XỬ LÝ HOÀN KHO VÀ GHI NHẬT KÝ
      for (const item of prescription.items) {
        // Lấy tồn kho hiện tại trước khi cộng lại
        const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        const newStockAfter = med.currentStock + item.quantity;

        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { currentStock: { increment: item.quantity } }
        });

        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { remainingQuantity: { increment: item.quantity } }
          });
        }

        await tx.inventoryHistory.create({
          data: {
            medicineId: item.medicineId,
            batchId: item.batchId,
            action: "IMPORT",
            quantity: item.quantity,
            stockAfter: newStockAfter, // TRUYỀN TỒN KHO MỚI VÀO ĐÂY
            note: `Hoàn kho do hủy đơn: ${prescription.id.slice(-6)}`
          }
        });
      }

      return { message: "Hủy đơn và hoàn kho thành công" };
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;