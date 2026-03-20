require("dotenv").config();
const mongoose = require("mongoose");

const Registration = require("../models/Registration");
const { generateSalamiAmount } = require("../config/salami");

const demoRows = [
  {
    name: "Demo User One",
    paymentMethod: "bKash",
    paymentNumber: "01711111111",
  },
  {
    name: "Demo User Two",
    paymentMethod: "Nagad",
    paymentNumber: "01822222222",
  },
  {
    name: "Demo User Three",
    paymentMethod: "bKash",
    paymentNumber: "01933333333",
  },
];

async function run() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await Registration.init();

  const operations = demoRows.map((row) => ({
    updateOne: {
      filter: {
        paymentNumber: row.paymentNumber,
        paymentMethod: row.paymentMethod,
      },
      update: {
        $setOnInsert: {
          name: row.name,
          paymentMethod: row.paymentMethod,
          paymentNumber: row.paymentNumber,
          salamiAmount: generateSalamiAmount(),
          registeredAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const result = await Registration.bulkWrite(operations, { ordered: false });
  const total = await Registration.countDocuments();

  console.log("Seed complete");
  console.log("Inserted:", result.upsertedCount || 0);
  console.log("Total rows:", total);

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
