const prisma = require("./src/prisma")

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL)

  const patients = await prisma.patient.findMany()
  console.log(patients)
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
