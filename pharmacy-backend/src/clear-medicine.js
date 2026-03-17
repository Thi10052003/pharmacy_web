// Thay vì tự tạo mới, hãy gọi thẳng file prisma.js của dự án (nơi đã cấu hình sẵn)
const prisma = require('./prisma'); 

async function clearData() {
  try {
    console.log("Đang tiến hành dọn dẹp kho thuốc...");

    await prisma.inventoryHistory.deleteMany();
    await prisma.prescriptionItem.deleteMany();

    const result = await prisma.medicine.deleteMany();
    
    console.log(`✅ Thành công! Đã xóa sạch ${result.count} mặt hàng.`);
  } catch (error) {
    console.error("❌ Có lỗi xảy ra:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();