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
  const categoryNames = ["Men", "Women", "Kids", "Teens", "Sports", "Panjabi", "Polo", "Denim", "Accessories", "Free Delivery", "Footwear", "Bags"];
  const categories = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const imageFile = name === "Men"
      ? "storefront/kaf-men-campaign.png"
      : name === "Women"
        ? "storefront/kaf-women-campaign.png"
        : name === "Footwear"
          ? "storefront/kaf-footwear.png"
          : name === "Bags"
            ? "storefront/kaf-bags.png"
            : `storefront/catalog-product-${(i % 12) + 1}.png`;
    categories.push(await upsertBy(db.category, { name }, { name, imageFile, image: imageFile, status: "Active", isActive: true, frontView: true, sortOrder: i + 1 }));
  }

  const subs = {};
  const children = {};
  for (const category of categories.slice(0, 5)) {
    const names = category.name === "Women" ? ["Tops", "Kurti", "Bottomwear"] : ["Topwear", "Bottomwear", "Essentials"];
    subs[category.Id] = [];
    for (const name of names) {
      const subcategory = await upsertBy(db.subcategory, { name, categoryId: category.Id }, { name, categoryId: category.Id, status: "Active" });
      subs[category.Id].push(subcategory);
      children[subcategory.Id] = [];
      for (const childName of name === "Bottomwear" ? ["Chinos", "Denim"] : ["New Arrival", "Premium Edit"]) {
        children[subcategory.Id].push(await upsertBy(db.childcategory, { name: childName, subcategoryId: subcategory.Id }, { name: childName, subcategoryId: subcategory.Id, status: "Active" }));
      }
    }
  }

  const colors = [];
  for (const [name, hex] of [["Navy","#173a5e"],["Black","#151515"],["Olive","#66734d"],["Maroon","#6d233f"]]) {
    colors.push(await upsertBy(db.color, { name }, { name, hex, status: "Active" }));
  }

  const partnerNames = ["Aster Group", "Bengal Works", "Dhaka Studio", "Northstar", "Padma Digital", "Shapla Foundation", "Vertex Labs", "Meghna Foods", "Urban Trust", "Delta Network", "Greenline", "Summit House"];
  for (let i = 0; i < partnerNames.length; i++) {
    const name = partnerNames[i];
    const logo = writeAsset(`partner-${i + 1}.svg`, svg(name, "KAF Partner", 420, 180, palettes[i % palettes.length], "banner"));
    await upsertBy(db.brand, { name }, { name, logo, linkUrl: null, sortOrder: i + 1, isActive: true, status: "Active" });
  }

  const productWords = ["Essential Tee", "Premium Polo", "Comfort Shirt", "Classic Panjabi", "Everyday Trouser", "Urban Denim"];
  for (let i = 0; i < 80; i++) {
    const category = categories[i % 10];
    const name = `${category.name} ${productWords[i % productWords.length]} ${String(i+1).padStart(2,"0")}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const main = `storefront/catalog-product-${(i % 12) + 1}.png`;
    const gallery = i % 3 === 0 ? "storefront/kaf-men-campaign.png" : i % 3 === 1 ? "storefront/kaf-women-campaign.png" : main;
    const subcategory = subs[category.Id]?.[i % 3] || null;
    const childcategory = subcategory ? children[subcategory.Id]?.[i % 2] : null;
    const product = await upsertBy(db.product, { slug }, {
      name, slug, sku: `KAF-${String(i+1).padStart(4,"0")}`, categoryId: category.Id,
      subcategoryId: subcategory?.Id || null, childcategoryId: childcategory?.Id || null, file: main, images: [main, gallery], gallery: [main, gallery],
      shortDescription: "Comfortable, versatile and made for everyday confidence.", description: "A thoughtfully selected KAF Lifestyle piece with dependable finishing and a comfortable fit.",
      bestDeals: i % 4 === 0 || i % 5 === 0, freeShipping: i % 6 === 0, status: "Active", date: new Date().toISOString().slice(0,10),
    });
    const existing = await db.variation.findOne({ where: { productId: product.Id, attribute: "M" } });
    const values = { productId: product.Id, colorId: colors[i % colors.length].Id, attribute: "M", size: ["M","L","XL"], oldPrice: 1290 + (i%5)*200, newPrice: 990 + (i%5)*180, stock: 12 + (i%8), availability: "in stock", sku: `${product.sku}-M` };
    if (existing) await existing.update(values); else await db.variation.create(values);
  }

  const newCategoryProducts = [
    { category: "Footwear", image: "storefront/kaf-footwear.png", names: ["Minimal Court Sneaker", "Everyday Low Sneaker", "Classic Navy Sneaker", "Comfort Walk Sneaker", "Urban Lace Sneaker", "Premium Casual Sneaker", "Weekend Court Sneaker", "Essential Street Sneaker"] },
    { category: "Bags", image: "storefront/kaf-bags.png", names: ["Structured Shoulder Bag", "Everyday Carry Bag", "Classic Navy Bag", "Premium Office Bag", "Weekend Shoulder Bag", "Urban Carry Bag", "Essential Day Bag", "Refined Crossbody Bag"] },
  ];
  let nextProductNumber = 81;
  for (const group of newCategoryProducts) {
    const category = categories.find((item) => item.name === group.category);
    for (const productName of group.names) {
      const name = `${group.category} ${productName}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const sku = `KAF-${String(nextProductNumber).padStart(4, "0")}`;
      const product = await upsertBy(db.product, { slug }, {
        name, slug, sku, categoryId: category.Id, subcategoryId: null, childcategoryId: null,
        file: group.image, images: [group.image], gallery: [group.image],
        shortDescription: "A refined everyday essential designed for comfort and versatility.",
        description: `A thoughtfully selected KAF Lifestyle ${group.category.toLowerCase()} piece with dependable finishing and everyday appeal.`,
        bestDeals: nextProductNumber % 3 === 0, freeShipping: nextProductNumber % 4 === 0,
        status: "Active", date: new Date().toISOString().slice(0, 10),
      });
      const existing = await db.variation.findOne({ where: { productId: product.Id, attribute: "Standard" } });
      const values = {
        productId: product.Id, colorId: colors[(nextProductNumber - 81) % colors.length].Id,
        attribute: "Standard", size: ["Standard"], oldPrice: group.category === "Footwear" ? 2490 : 2190,
        newPrice: group.category === "Footwear" ? 1990 : 1790, stock: 15 + (nextProductNumber % 6),
        availability: "in stock", sku: `${sku}-STD`,
      };
      if (existing) await existing.update(values); else await db.variation.create(values);
      nextProductNumber += 1;
    }
  }

  const bannerGroups = [
    ["Main Slider", "slider", 3, 1600, 620],
    ["Slider Right", "promo", 3, 800, 620],
  ];
  for (const [groupName, prefix, count, width, height] of bannerGroups) {
    const group = await upsertBy(db.bannerCategory, { name: groupName }, { name: groupName, status: "Active", sortOrder: prefix === "slider" ? 1 : 2 });
    for (let i = 0; i < count; i++) {
      const realFiles = prefix === "slider"
        ? ["storefront/kaf-hero-campaign.png", "storefront/kaf-men-campaign.png", "storefront/kaf-women-campaign.png"]
        : ["storefront/kaf-men-campaign.png", "storefront/kaf-women-campaign.png", "storefront/catalog-product-1.png"];
      const file = realFiles[i];
      await upsertBy(db.banner, { alt: `KAF ${prefix} ${i+1}` }, { alt: `KAF ${prefix} ${i+1}`, file, linkUrl: "/#collections", categoryId: group.Id, categoryName: groupName, status: "Active", sortOrder: i + 1 });
    }
  }
  const homepageBannerGroups = [
    { name: "Home Promo", prefix: "home-promo", size: [1000, 420], titles: ["Everyday essentials", "New season colors", "Comfort collection", "Weekend edit"] },
    { name: "Home Story", prefix: "home-story", size: [900, 560], titles: ["Made for everyday confidence", "Thoughtful fabric and fit"] },
    { name: "Home Bulk Order", prefix: "home-bulk", size: [1600, 360], titles: ["Bulk order and custom apparel"] },
    { name: "Home Affiliate", prefix: "home-affiliate", size: [1600, 420], titles: ["Join the KAF community"] },
  ];
  for (let groupIndex = 0; groupIndex < homepageBannerGroups.length; groupIndex++) {
    const groupData = homepageBannerGroups[groupIndex];
    const group = await upsertBy(db.bannerCategory, { name: groupData.name }, { name: groupData.name, status: "Active", sortOrder: 10 + groupIndex });
    for (let index = 0; index < groupData.titles.length; index++) {
      const [width, height] = groupData.size;
      const alt = groupData.titles[index];
      const realFiles = ["storefront/kaf-men-campaign.png", "storefront/kaf-women-campaign.png", `storefront/catalog-product-${(groupIndex * 3 + index) % 12 + 1}.png`];
      const file = realFiles[index] || realFiles[2];
      await upsertBy(db.banner, { alt: `KAF ${groupData.prefix} ${index + 1}` }, { alt, file, linkUrl: "/#collections", categoryId: group.Id, categoryName: groupData.name, status: "Active", sortOrder: index + 1 });
    }
  }
  console.log("Storefront seed complete: 12 categories, 96 products, homepage banners, generated local raster media.");
}

seed().then(() => db.sequelize.close()).catch(async (error) => { console.error(error); await db.sequelize.close(); process.exit(1); });
