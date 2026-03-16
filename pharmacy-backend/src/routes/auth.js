// src/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

// Secret Key cho Token (Trong thực tế nên để trong file .env)
const JWT_SECRET = process.env.JWT_SECRET;

// 1. API Đăng nhập
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Tìm user trong DB
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại!" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Tài khoản này đã bị khóa!" });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không chính xác!" });
    }

    // Tạo "chìa khóa" (Token) có hạn 1 ngày
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Trả về thông tin (không trả về password)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. API Setup tài khoản Admin đầu tiên (Chỉ gọi 1 lần khi khởi tạo hệ thống)
router.post("/setup", async (req, res) => {
  try {
    // Kiểm tra xem đã có admin nào chưa
    const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (adminExists) {
      return res.status(400).json({ message: "Hệ thống đã có Admin, không thể setup thêm!" });
    }

    // Mã hóa mật khẩu '123456'
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    // Tạo user
    const adminUser = await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        fullName: "Quản trị viên",
        role: "ADMIN"
      }
    });

    res.json({ message: "Tạo tài khoản Admin thành công!", user: adminUser.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 3. API Tạo tài khoản nhân viên (Chỉ Admin mới được tạo)
router.post("/register-staff", async (req, res) => {
  const { username, password, fullName, role } = req.body;

  try {
    // Kiểm tra xem username đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập này đã được sử dụng!" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo User mới (Mặc định role là PHARMACIST nếu không truyền lên)
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role: role || "PHARMACIST"
      }
    });

    res.json({ message: "Tạo tài khoản nhân viên thành công!", user: newUser.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 4. Lấy danh sách toàn bộ nhân viên (Trừ mật khẩu)
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Đổi mật khẩu nhân viên (Admin dùng)
router.put("/users/:id/password", async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Khóa / Mở khóa tài khoản nhân viên (Khi nhân viên nghỉ việc)
router.put("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive }
    });
    res.json({ message: isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;