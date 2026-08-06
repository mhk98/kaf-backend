require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../models");

const imageDir = path.join(__dirname, "..", "images", "storefront");
const palettes = [
  ["#17332c", "#d8a85c"], ["#6d233f", "#f2c6aa"], ["#173a5e", "#88c8c4"],
  ["#513b2d", "#e8d6b6"], ["#43245b", "#d8b4e2"], ["#384233", "#b9ce9d"],
];
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]));
const svg = (title, subtitle, width, height, colors, kind = "product") => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
 <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
 <rect width="100%" height="100%" fill="url(#g)"/>
 ${kind === "product" ? `<circle cx="${width/2}" cy="${height*.38}" r="${width*.2}" fill="rgba(255,255,255,.13)"/><path d="M${width*.3} ${height*.24} L${width*.18} ${height*.36} L${width*.28} ${height*.48} L${width*.34} ${height*.43} V${height*.78} H${width*.66} V${height*.43} L${width*.72} ${height*.48} L${width*.82} ${height*.36} L${width*.7} ${height*.24} L${width*.6} ${height*.2} Q${width*.5} ${height*.32} ${width*.4} ${height*.2} Z" fill="rgba(255,255,255,.88)"/>` : ""}
 <text x="50%" y="${height*.88}" text-anchor="middle" fill="white" font-family="Arial" font-size="${Math.max(18,width*.035)}" font-weight="700">${esc(title)}</text>
 <text x="50%" y="${height*.94}" text-anchor="middle" fill="rgba(255,255,255,.8)" font-family="Arial" font-size="${Math.max(12,width*.018)}">${esc(subtitle)}</text>
</svg>`;

function writeAsset(name, content) {
  fs.mkdirSync(imageDir, { recursive: true });
  const target = path.join(imageDir, name);
  if (!fs.existsSync(target)) fs.writeFileSync(target, content, "utf8");
  return `storefront/${name}`;
}

async function upsertBy(Model, where, values) {
  const [row] = await Model.findOrCreate({ where, defaults: values });
  await row.update(values);
  return row;
}

async function seed() {
  await db.ready;
  const categoryNames = ["Men", "Women", "Kids", "Teens", "Sports", "Panjabi", "Polo", "Denim", "Accessories", "Free Delivery"];
  const categories = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const imageFile = writeAsset(`category-${i+1}.svg`, svg(name, "Shop collection", 600, 600, palettes[i % palettes.length]));
    categories.push(await upsertBy(db.category, { name }, { name, imageFile, image: imageFile, status: "Active", isActive: true, frontView: true, sortOrder: i + 1 }));
  }

  const subs = {};
  for (const category of categories.slice(0, 5)) {
    const names = category.name === "Women" ? ["Tops", "Kurti", "Bottomwear"] : ["Topwear", "Bottomwear", "Essentials"];
    subs[category.Id] = [];
    for (const name of names) subs[category.Id].push(await upsertBy(db.subcategory, { name, categoryId: category.Id }, { name, categoryId: category.Id, status: "Active" }));
  }

  const colors = [];
  for (const [name, hex] of [["Navy","#173a5e"],["Black","#151515"],["Olive","#66734d"],["Maroon","#6d233f"]]) {
    colors.push(await upsertBy(db.color, { name }, { name, hex, status: "Active" }));
  }

  const productWords = ["Essential Tee", "Premium Polo", "Comfort Shirt", "Classic Panjabi", "Everyday Trouser", "Urban Denim"];
  for (let i = 0; i < 30; i++) {
    const category = categories[i % categories.length];
    const name = `${category.name} ${productWords[i % productWords.length]} ${String(i+1).padStart(2,"0")}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const main = writeAsset(`product-${i+1}.svg`, svg(name, "KAF Lifestyle", 900, 1100, palettes[i % palettes.length]));
    const gallery = writeAsset(`product-${i+1}-detail.svg`, svg(`${name} Detail`, "Premium everyday wear", 900, 1100, palettes[(i+1) % palettes.length]));
    const product = await upsertBy(db.product, { slug }, {
      name, slug, sku: `KAF-${String(i+1).padStart(4,"0")}`, categoryId: category.Id,
      subcategoryId: subs[category.Id]?.[i % 3]?.Id || null, file: main, images: [main, gallery], gallery: [main, gallery],
      shortDescription: "Comfortable, versatile and made for everyday confidence.", description: "A thoughtfully selected KAF Lifestyle piece with dependable finishing and a comfortable fit.",
      bestDeals: i % 4 === 0 || i % 5 === 0, freeShipping: i % 6 === 0, status: "Active", date: new Date().toISOString().slice(0,10),
    });
    const existing = await db.variation.findOne({ where: { productId: product.Id, attribute: "M" } });
    const values = { productId: product.Id, colorId: colors[i % colors.length].Id, attribute: "M", size: ["M","L","XL"], oldPrice: 1290 + (i%5)*200, newPrice: 990 + (i%5)*180, stock: 12 + (i%8), availability: "in stock", sku: `${product.sku}-M` };
    if (existing) await existing.update(values); else await db.variation.create(values);
  }

  const bannerGroups = [
    ["Main Slider", "slider", 3, 1600, 620],
    ["Slider Right", "promo", 3, 800, 620],
  ];
  for (const [groupName, prefix, count, width, height] of bannerGroups) {
    const group = await upsertBy(db.bannerCategory, { name: groupName }, { name: groupName, status: "Active", sortOrder: prefix === "slider" ? 1 : 2 });
    for (let i = 0; i < count; i++) {
      const file = writeAsset(`${prefix}-${i+1}.svg`, svg(prefix === "slider" ? ["Everyday confidence", "New season essentials", "Made for your story"][i] : ["Free delivery picks", "Premium polos", "Fresh arrivals"][i], "Shop KAF Lifestyle", width, height, palettes[(i+2) % palettes.length], "banner"));
      await upsertBy(db.banner, { alt: `KAF ${prefix} ${i+1}` }, { alt: `KAF ${prefix} ${i+1}`, file, linkUrl: "/#collections", categoryId: group.Id, categoryName: groupName, status: "Active", sortOrder: i + 1 });
    }
  }
  console.log("Storefront seed complete: 10 categories, 30 products, 6 banners, generated local SVG media.");
}

seed().then(() => db.sequelize.close()).catch(async (error) => { console.error(error); await db.sequelize.close(); process.exit(1); });
