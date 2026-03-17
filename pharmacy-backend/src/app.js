const express = require("express")
const cors = require("cors")
const patientRoutes = require("./routes/patient")
const medicineRoutes = require("./routes/medicine")
const prescriptionRoutes = require("./routes/prescription")
const inventoryRoutes = require("./routes/inventory")
const statisticsRoutes = require("./routes/statistics");
const supplierRoutes = require("./routes/suppliers");
const authRoutes = require("./routes/auth");
const app = express()
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000", // FE
  credentials: true,
}))
app.use(express.json()) 
app.use("/api/patients", patientRoutes)
app.use("/api/medicines", medicineRoutes)
app.use("/api/prescriptions", prescriptionRoutes)
app.use("/api/inventory", inventoryRoutes)
app.use("/api/stats", statisticsRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/auth", authRoutes);
app.use((err, req, res, next) => {
  if (err.code) {
    return res.status(err.status || 400).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
  }

  console.error(err)
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    },
  })
})

module.exports = app
