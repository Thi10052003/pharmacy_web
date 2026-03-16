const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

/// 1. TỔNG QUAN (5 THẺ SUMMARY)
router.get("/summary", async (req, res) => {
  try {
    // 1. Doanh thu và Số đơn thành công (Chỉ tính đơn ACTIVE)
    const activeStats = await prisma.prescription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { totalAmount: true },
      _count: { id: true } // Đếm số lượng đơn
    });

    // 2. Tiền hoàn trả (Chỉ tính đơn CANCELLED)
    const cancelledStats = await prisma.prescription.aggregate({
      where: { status: "CANCELLED" },
      _sum: { totalAmount: true }
    });

    // 3. SỬA LỖI Ở ĐÂY: Đếm tổng số lượng Hồ sơ bệnh nhân (PatientProfile)
    // Thay vì đếm Patient cũ đã bị xóa
    const totalPatients = await prisma.patientProfile.count();

    // 4. Thuốc sắp hết hàng (Ví dụ: Tồn kho <= 20)
    const lowStockMedicines = await prisma.medicine.count({
      where: { currentStock: { lte: 20 } }
    });

    // Trả về Frontend
    res.json({
      revenue: activeStats._sum.totalAmount || 0,
      refunded: cancelledStats._sum.totalAmount || 0,
      successfulOrders: activeStats._count.id || 0,
      totalPatients: totalPatients || 0,
      lowStockMedicines: lowStockMedicines || 0
    });
  } catch (err) {
    console.error("Lỗi API Summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/stats/top-medicines - Top 5 thuốc bán chạy (Chỉ tính đơn ACTIVE)
router.get("/top-medicines", async (req, res) => {
  try {
    const topItems = await prisma.prescriptionItem.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
      where: {
        prescription: { status: "ACTIVE" } // Không tính thuốc trong đơn đã hủy
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const result = await Promise.all(topItems.map(async (item) => {
      const medicine = await prisma.medicine.findUnique({
        where: { id: item.medicineId },
        select: { name: true, baseUnitName: true }
      });
      return {
        name: medicine?.name || "Thuốc đã xóa",
        unit: medicine?.baseUnitName || "Đơn vị",
        totalSold: Number(item._sum.quantity)
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/stats/top-points - Top 10 Khách hàng thân thiết (ĐÃ BỔ SUNG LẠI)
// TOP KHÁCH HÀNG TÍCH ĐIỂM
router.get("/top-points", async (req, res) => {
  try {
    const topAccounts = await prisma.account.findMany({
      orderBy: { totalPoints: "desc" },
      take: 10,
      include: { 
        profiles: { 
          where: { relationship: "Chủ hộ" }, // Lấy tên người chủ hộ làm đại diện
          select: { fullName: true }
        } 
      }
    });

    // Format lại dữ liệu cho Frontend dễ đọc
    const formattedData = topAccounts.map(acc => ({
      id: acc.id,
      fullName: acc.profiles[0]?.fullName || "Khách vãng lai",
      phone: acc.phone,
      totalPoints: acc.totalPoints
    }));

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;