// src/routes/patient.js
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// 1. LẤY DANH SÁCH TÀI KHOẢN GIA ĐÌNH & THÀNH VIÊN
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      whereClause = {
        OR: [
          { phone: { contains: search } },
          { profiles: { some: { fullName: { contains: search, mode: 'insensitive' } } } }
        ]
      };
    }

    const accounts = await prisma.account.findMany({
      where: whereClause,
      include: {
        profiles: { orderBy: { createdAt: 'asc' } } // Kéo theo danh sách người nhà
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TẠO TÀI KHOẢN MỚI KÈM "CHỦ HỘ"
router.post("/", async (req, res) => {
  const { phone, fullName, gender, birthYear } = req.body;
  try {
    const existingAccount = await prisma.account.findUnique({ where: { phone } });
    if (existingAccount) {
      return res.status(400).json({ message: "Số điện thoại này đã tồn tại trong hệ thống!" });
    }

    const newAccount = await prisma.account.create({
      data: {
        phone,
        profiles: {
          create: {
            fullName,
            gender,
            birthYear: birthYear ? Number(birthYear) : null,
            relationship: "Chủ hộ" // Mặc định người đầu tiên là Chủ hộ
          }
        }
      },
      include: { profiles: true }
    });
    res.json(newAccount);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. THÊM THÀNH VIÊN VÀO GIA ĐÌNH ĐÃ CÓ
router.post("/:accountId/profiles", async (req, res) => {
  const { accountId } = req.params;
  const { fullName, gender, birthYear, relationship } = req.body;
  try {
    const newProfile = await prisma.patientProfile.create({
      data: {
        accountId,
        fullName,
        gender,
        birthYear: birthYear ? Number(birthYear) : null,
        relationship: relationship || "Người thân"
      }
    });
    res.json(newProfile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. CẬP NHẬT THÔNG TIN THÀNH VIÊN
router.put("/profiles/:profileId", async (req, res) => {
  const { profileId } = req.params;
  const { fullName, gender, birthYear, relationship } = req.body;
  try {
    const updatedProfile = await prisma.patientProfile.update({
      where: { id: profileId },
      data: { 
        fullName, 
        gender, 
        birthYear: birthYear ? Number(birthYear) : null, 
        relationship 
      }
    });
    res.json(updatedProfile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. CẬP NHẬT SỐ ĐIỆN THOẠI CỦA TÀI KHOẢN CHÍNH
router.put("/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const { phone } = req.body;
  try {
    const existing = await prisma.account.findUnique({ where: { phone } });
    if (existing && existing.id !== accountId) {
      return res.status(400).json({ message: "Số điện thoại này đã thuộc về gia đình khác!" });
    }
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { phone }
    });
    res.json(updatedAccount);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;