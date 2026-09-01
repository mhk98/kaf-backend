require("dotenv").config();
const db = require("../models");

// Homepage "Work with us Today" client / partner logos.
const clientLogos = [
  { name: "Grameenphone", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Grameenphone%20Logo%20GP%20Logo.svg" },
  { name: "HP", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/HP%20logo%202008.svg" },
  { name: "Ericsson", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Ericsson%20logo%20(2).svg" },
  { name: "UNDP", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/UNDP%20logo.svg" },
  { name: "SKF", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/SKF%20logo.svg" },
  { name: "SK+F", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20of%20SK%2BF.svg" },
  { name: "Qatar Airways", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Qatar%20Airways%20Logo.png" },
  { name: "Wikimedia Bangladesh", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Wikimedia%20Bangladesh%20logo.svg" },
];

async function seed() {
  await db.ready;
  for (let i = 0; i < clientLogos.length; i++) {
    const { name, logo } = clientLogos[i];
    const values = { name, logo, linkUrl: null, sortOrder: i + 1, isActive: true, status: "Active" };
    const [row, created] = await db.client.findOrCreate({ where: { name }, defaults: values });
    if (!created) await row.update(values);
    console.log(`${created ? "created" : "updated"}: ${name}`);
  }
  console.log(`\nDone. ${clientLogos.length} client logos seeded.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
