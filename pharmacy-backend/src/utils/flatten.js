function flattenPrescription(prescription) {
  return {
    id: prescription.id,
    status: prescription.status,
    purchaseDate: prescription.purchaseDate,
    totalAmount: prescription.totalAmount,
    earnedPoints: prescription.earnedPoints,

    patient: {
      id: prescription.patient.id,
      fullName: prescription.patient.fullName,
      phone: prescription.patient.phone,
    },

    items: prescription.items.map(item => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      dosage: item.dosage,
      note: item.note,
    })),
  }
}

module.exports = {
  flattenPrescription,
}
