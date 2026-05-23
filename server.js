const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

// For local development, do not force-enable a MongoDB URI so the app can
// run using the bundled file-based store (data/store.json). If you need
// MongoDB, set `MONGODB_URI` and `MONGODB_DB` in your environment.
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "";
}
if (!process.env.MONGODB_DB) {
  process.env.MONGODB_DB = "quickpick_store";
}

// Load local env overrides (e.g., .env.local) for development.
// This keeps MongoDB configuration consistent without relying on Windows process env vars.
try {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = String(line || "").trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
} catch (e) {
  console.warn("Failed to load .env.local", e?.message || e);
}

// Ensure local development does not unintentionally enable MongoDB when
// an .env.local file exists. Force MONGODB_URI to empty unless explicitly
// provided via environment (so the app uses file-based store by default).
if (!process.env.EXPLICIT_MONGODB) {
  process.env.MONGODB_URI = "";
}

const mongoDb = require("./api/db");

console.log(
  `[mongo-force] mongoDb.isEnabled=${mongoDb.isEnabled()} MONGODB_URI set=${Boolean(process.env.MONGODB_URI)} MONGODB_DB=${process.env.MONGODB_DB}`,
);

const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

// Debug: quickly verify which DB the server is writing to.
// Enable by setting: DEBUG_MONGO=1
function debugMongo(label) {
  if (!process.env.DEBUG_MONGO) return;
  try {
    const uri = process.env.MONGODB_URI || "";
    const dbName = process.env.MONGODB_DB || "quickpick_store";
    console.log(
      `[mongo-debug] ${label} db=${dbName} uriSet=${Boolean(uri)} enabled=${mongoDb.isEnabled()}`,
    );
  } catch (e) {
    console.log("[mongo-debug] debug failed", e?.message || e);
  }
}

const ROOT_DIR = __dirname;
const DATA_DIR =
  process.env.DATA_DIR ||
  process.env.RENDER_DISK_MOUNT_PATH ||
  path.join(ROOT_DIR, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const CERTS_DIR = path.join(ROOT_DIR, "certs");
const HTTPS_PFX_FILE = path.join(CERTS_DIR, "localhost-dev.pfx");
const HTTPS_PFX_PASSPHRASE =
  process.env.HTTPS_PFX_PASSPHRASE || "quickpick-local-dev";
const HTTPS_ENABLED = fs.existsSync(HTTPS_PFX_FILE);
const PORT = Number.parseInt(
  process.env.PORT || (HTTPS_ENABLED ? "8443" : "8888"),
  10,
);
const HTTP_REDIRECT_PORT = Number.parseInt(process.env.HTTP_PORT || "8888", 10);
const PUBLIC_FILES = new Set(["index.html", "seller-panel.html"]);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
};
const IMAGE_UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const UPLOAD_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const SELLER_ID = process.env.SELLER_ID || "homelycollection.829@gmail.com";
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || "@Dipshikha.8212.s";
const SELLER_NAME = process.env.SELLER_NAME || "Quickpick Store";

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    category: "electronics",
    price: 1999,
    originalPrice: 3999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🎧",
    description:
      "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    features: [
      "Noise Cancellation",
      "30-hour battery",
      "Bluetooth 5.0",
      "Built-in microphone",
    ],
    specs: [
      ["Color", "Black"],
      ["Battery", "30 hours"],
      ["Connectivity", "Bluetooth 5.0"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 2,
    name: "Smart Watch Pro",
    category: "electronics",
    price: 4999,
    originalPrice: 8999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "⌚",
    description:
      "Advanced smartwatch with fitness tracking and 7-day battery life.",
    features: [
      "Heart Rate Monitor",
      "GPS",
      "Fitness Tracking",
      "Sleep Monitoring",
    ],
    specs: [
      ["Display", '1.4" AMOLED'],
      ["Battery", "7 days"],
      ["Water Resistance", "5ATM"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 3,
    name: "USB-C Fast Charger",
    category: "electronics",
    price: 499,
    originalPrice: 999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🔌",
    description: "65W USB-C fast charger compatible with all devices.",
    features: [
      "65W Power",
      "Fast Charging",
      "Compact",
      "Multiple Device Support",
    ],
    specs: [
      ["Output", "65W"],
      ["Ports", "2x USB-C"],
      ["Input", "100-240V"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 4,
    name: "Premium T-Shirt",
    category: "fashion",
    price: 749,
    originalPrice: 1499,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "👕",
    description: "Comfortable 100% cotton premium T-shirt in multiple colors.",
    features: ["100% Cotton", "Comfortable", "Breathable", "Durable"],
    specs: [
      ["Material", "100% Cotton"],
      ["Sizes", "XS-XXL"],
      ["Colors", "Multiple"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 5,
    name: "Stylish Jacket",
    category: "fashion",
    price: 2499,
    originalPrice: 4999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🧥",
    description: "Modern stylish jacket perfect for all seasons.",
    features: ["Water Resistant", "Warm Lining", "Multiple Pockets", "Stylish"],
    specs: [
      ["Material", "Polyester"],
      ["Sizes", "S-XXL"],
      ["Colors", "Multiple"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 6,
    name: "Running Shoes",
    category: "fashion",
    price: 2999,
    originalPrice: 5999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "👟",
    description: "Professional running shoes with cushioning technology.",
    features: ["Cushioning", "Breathable", "Lightweight", "Ergonomic"],
    specs: [
      ["Material", "Mesh + Rubber"],
      ["Sizes", "5-14"],
      ["Colors", "Multiple"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 7,
    name: "Non-Stick Cookware Set",
    category: "home",
    price: 3499,
    originalPrice: 7999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🍳",
    description: "Premium non-stick cookware set with 5 pieces.",
    features: ["Non-Stick", "Heat Resistant", "Durable", "Induction Ready"],
    specs: [
      ["Pieces", "5"],
      ["Material", "Aluminum"],
      ["Heat Resistance", "400F"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 8,
    name: "Kitchen Knife Set",
    category: "home",
    price: 999,
    originalPrice: 2499,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🔪",
    description: "Professional kitchen knife set with 6 pieces.",
    features: [
      "Stainless Steel",
      "Sharp Blades",
      "Comfortable",
      "Wood Stand Included",
    ],
    specs: [
      ["Pieces", "6"],
      ["Material", "Stainless Steel"],
      ["Warranty", "Lifetime"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 9,
    name: "Coffee Maker",
    category: "home",
    price: 2799,
    originalPrice: 5999,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "☕",
    description: "Automatic coffee maker with programmable features.",
    features: ["Programmable", "Auto Shut-off", "Keep Warm", "Easy Brewing"],
    specs: [
      ["Capacity", "1.5L"],
      ["Power", "1000W"],
      ["Filter", "Reusable"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 10,
    name: "Programming Basics Book",
    category: "books",
    price: 349,
    originalPrice: 599,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "📚",
    description: "Complete guide to programming fundamentals.",
    features: [
      "Easy to Understand",
      "Practical Examples",
      "Exercises",
      "Beginner Friendly",
    ],
    specs: [
      ["Pages", "450"],
      ["Language", "English"],
      ["Author", "Tech Academy"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 11,
    name: "Web Development Guide",
    category: "books",
    price: 499,
    originalPrice: 899,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "💻",
    description:
      "Master HTML, CSS, and JavaScript with this comprehensive guide.",
    features: ["Complete Coverage", "Project Based", "Code Examples", "Modern"],
    specs: [
      ["Pages", "600"],
      ["Language", "English"],
      ["Edition", "3rd"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
  {
    id: 12,
    name: "Self-Help Book",
    category: "books",
    price: 299,
    originalPrice: 599,
    rating: 0,
    reviews: 0,
    stock: "In Stock",
    image: "🌟",
    description: "Transform your life with proven strategies and techniques.",
    features: [
      "Practical Tips",
      "Life Changing",
      "Motivational",
      "Action Plans",
    ],
    specs: [
      ["Pages", "320"],
      ["Language", "English"],
      ["Author", "Life Coach"],
    ],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee",
    },
  },
];

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultStore() {
  return {
    defaultProducts: {
      products: DEFAULT_PRODUCTS,
      updatedAt: new Date().toISOString(),
    },
    products: {
      products: DEFAULT_PRODUCTS,
      updatedAt: new Date().toISOString(),
    },
    customers: [],
    reviews: {},
    orders: [],
    sessions: { seller: {}, customer: {} },
  };
}


function readLegacyFile(name, fallback) {
  const filePath = path.join(DATA_DIR, name);
  if (!fs.existsSync(filePath)) {
    return structuredCloneSafe(fallback);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return structuredCloneSafe(fallback);
  }
}

function migrateLegacyStore() {
  return {
    products: readLegacyFile("products.json", {
      products: DEFAULT_PRODUCTS,
      updatedAt: new Date().toISOString(),
    }),
    customers: readLegacyFile("customers.json", []),
    reviews: readLegacyFile("reviews.json", {}),
    orders: readLegacyFile("orders.json", []),
    sessions: readLegacyFile("sessions.json", { seller: {}, customer: {} }),
  };
}

async function seedMongoIfNeeded() {
  if (!mongoDb.isEnabled()) return;
  const productsCol = await mongoDb.getCollection("products");
  const count = await productsCol.countDocuments();
  if (count > 0) return;

  const now = new Date().toISOString();
  const defaults = readDefaultProductsStore()?.products || DEFAULT_PRODUCTS;

  const seeded = defaults.map((p) => ({
    ...p,
    imageUrl: p.imageUrl || "",
    imageGallery: Array.isArray(p.imageGallery) ? p.imageGallery : [],
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
  }));

  if (seeded.length) await productsCol.insertMany(seeded);
}


async function getMongoProductListWithRatings() {
  const productsCol = await mongoDb.getCollection("products");
  const reviewsCol = await mongoDb.getCollection("reviews");

  const productsArr = await productsCol.find({}).sort({ id: 1 }).toArray();
  const productIds = productsArr.map((p) => p.id);

  let reviews = [];
  if (productIds.length) {
    reviews = await reviewsCol
      .find({ productId: { $in: productIds.map(String) } })
      .toArray();
  }

  const byProduct = new Map();
  for (const r of reviews) {
    const key = String(r.productId);
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(r);
  }

  const isUploadedVisual = (value) => {
    if (!value) return false;
    const v = String(value).trim();
    if (!v) return false;
    return (
      v.startsWith("/api/uploads/") ||
      v.startsWith("data:image") ||
      /^https?:\/\//i.test(v)
    );
  };

  const normalized = productsArr.map((p) => {
    const key = String(p.id);
    const productReviews = byProduct.get(key) || [];
    const reviewCount = productReviews.length;
    const avg = reviewCount
      ? productReviews.reduce((s, rr) => s + Number(rr.rating || 0), 0) /
        reviewCount
      : 0;

    const rawImage = String(p.image || "").trim();
    const rawImageUrl = String(p.imageUrl || "").trim();
    const imageGalleryFromDoc = Array.isArray(p.imageGallery)
      ? p.imageGallery
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // 1) imageUrl (uploaded visual only): prefer imageUrl, else first uploaded from gallery, else (legacy) image.
    let imageUrl = "";
    if (rawImageUrl && isUploadedVisual(rawImageUrl)) {
      imageUrl = rawImageUrl;
    } else {
      const firstGalleryUploaded = imageGalleryFromDoc.find(isUploadedVisual);
      if (firstGalleryUploaded) {
        imageUrl = firstGalleryUploaded;
      } else if (isUploadedVisual(rawImage)) {
        // legacy: image stored the uploaded URL
        imageUrl = rawImage;
      }
    }

    // 2) imageGallery: keep uploaded gallery stable; if missing, derive from imageUrl.
    const uploadedGallery = imageGalleryFromDoc.filter(isUploadedVisual);
    const imageGallery = uploadedGallery.length
      ? uploadedGallery
      : imageUrl
        ? [imageUrl]
        : [];

    // 3) image (emoji-only fallback): keep emoji when no uploaded imageUrl exists.
    // If imageUrl exists, do not overwrite emoji; just blank image so clients can rely on imageUrl/imageGallery.
    const image = imageUrl ? "" : rawImage || "📦";

    return {
      ...p,
      imageUrl,
      imageGallery,
      image,
      rating: Number(avg.toFixed(1)),
      reviews: reviewCount,
    };
  });

  const updatedAt = normalized[0]?.updatedAt || new Date().toISOString();
  return { products: normalized, updatedAt };
}

function readStore() {
  ensureDataDir();

  if (!fs.existsSync(STORE_FILE)) {
    const migratedStore = fs.existsSync(path.join(DATA_DIR, "products.json"))
      ? migrateLegacyStore()
      : createDefaultStore();

    // Ensure defaultProducts exists even for older store.json.
    if (!migratedStore.defaultProducts) {
      migratedStore.defaultProducts = createDefaultStore().defaultProducts;
    }

    // Ensure products exists.
    if (!migratedStore.products) {
      migratedStore.products = createDefaultStore().products;
    }

    writeStore(migratedStore);
    return structuredCloneSafe(migratedStore);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));

    const fallbackStore = createDefaultStore();

    // Backfill missing keys for older store.json versions.
    const normalized = {
      defaultProducts: parsed.defaultProducts || fallbackStore.defaultProducts,
      products: parsed.products || fallbackStore.products,
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      reviews:
        parsed.reviews && typeof parsed.reviews === "object"
          ? parsed.reviews
          : {},
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      sessions:
        parsed.sessions && typeof parsed.sessions === "object"
          ? parsed.sessions
          : { seller: {}, customer: {} },
    };

    // Persist backfill so subsequent reads are consistent.
    if (!parsed.defaultProducts || !parsed.products) {
      writeStore(normalized);
    }

    return normalized;
  } catch {
    const fallbackStore = createDefaultStore();
    writeStore(fallbackStore);
    return structuredCloneSafe(fallbackStore);
  }
}


function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function readProductsStore() {
  return readStore().products;
}


function readDefaultProductsStore() {
  return readStore().defaultProducts;
}


function writeProductsStore(store) {
  const rootStore = readStore();
  rootStore.products = {
    products: Array.isArray(store.products) ? store.products : [],
    updatedAt: store.updatedAt || new Date().toISOString(),
  };
  writeStore(rootStore);
  return rootStore.products;
}

function writeDefaultProductsStore(store) {
  const rootStore = readStore();
  rootStore.defaultProducts = {
    products: Array.isArray(store.products) ? store.products : [],
    updatedAt: store.updatedAt || new Date().toISOString(),
  };
  writeStore(rootStore);
  return rootStore.defaultProducts;
}


function readCustomerStore() {
  return readStore().customers;
}

function writeCustomerStore(customers) {
  const rootStore = readStore();
  rootStore.customers = Array.isArray(customers) ? customers : [];
  writeStore(rootStore);
}

function readReviewsStore() {
  return readStore().reviews;
}

function writeReviewsStore(reviews) {
  const rootStore = readStore();
  rootStore.reviews = reviews && typeof reviews === "object" ? reviews : {};
  writeStore(rootStore);
}

function readOrdersStore() {
  return readStore().orders;
}

function writeOrdersStore(orders) {
  const rootStore = readStore();
  rootStore.orders = Array.isArray(orders) ? orders : [];
  writeStore(rootStore);
}

function readSessionsStore() {
  return readStore().sessions;
}

function writeSessionsStore(sessions) {
  const rootStore = readStore();
  rootStore.sessions =
    sessions && typeof sessions === "object"
      ? sessions
      : { seller: {}, customer: {} };
  writeStore(rootStore);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : "";
}

function parseImageDataUrl(value) {
  const match = String(value || "").match(
    /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) {
    throw new Error("Please upload a valid JPG, PNG, WEBP, or GIF image.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw new Error("The selected image could not be read.");
  }

  return {
    contentType: match[1],
    buffer,
  };
}

async function saveUploadedProductImage(imageData) {
  const parsed = parseImageDataUrl(imageData);
  const id = crypto.randomBytes(16).toString("hex");
  const ext = UPLOAD_MIME_EXTENSIONS[parsed.contentType] || ".jpg";
  const fileName = `${id}${ext}`;

  if (mongoDb.isEnabled()) {
    await (
      await mongoDb.getCollection("product_images")
    ).insertOne({
      id,
      contentType: parsed.contentType,
      data: parsed.buffer.toString("base64"),
      createdAt: new Date().toISOString(),
    });
    return `/api/uploads/${id}`;
  }

  fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGE_UPLOAD_DIR, fileName), parsed.buffer);
  return `/api/uploads/${fileName}`;
}

async function sendUploadedProductImage(res, uploadId) {
  const safeId = path.basename(String(uploadId || ""));
  if (!safeId) {
    sendJson(res, 404, { error: "Image not found." });
    return;
  }

  if (mongoDb.isEnabled()) {
    const image = await (
      await mongoDb.getCollection("product_images")
    ).findOne({ id: safeId });
    if (!image) {
      sendJson(res, 404, { error: "Image not found." });
      return;
    }

    res.writeHead(200, {
      "Content-Type": image.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.end(Buffer.from(image.data || "", "base64"));
    return;
  }

  const filePath = path.join(IMAGE_UPLOAD_DIR, safeId);
  if (!filePath.startsWith(IMAGE_UPLOAD_DIR) || !fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "Image not found." });
    return;
  }

  res.writeHead(200, {
    "Content-Type":
      MIME_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

function isUploadedImageUrl(value) {
  return typeof value === "string" && value.trim().startsWith("/api/uploads/");
}

function getUploadedImageIdsFromProduct(product) {
  const ids = new Set();
  if (!product || typeof product !== "object") return [];

  const candidates = [];
  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    candidates.push(product.imageUrl.trim());
  }
  if (Array.isArray(product.imageGallery)) {
    product.imageGallery.forEach((item) => {
      if (typeof item === "string" && item.trim()) {
        candidates.push(item.trim());
      }
    });
  }

  candidates.forEach((url) => {
    if (isUploadedImageUrl(url)) {
      ids.add(path.basename(url));
    }
  });

  return Array.from(ids);
}

async function deleteUploadedImagesFromProduct(product) {
  const ids = getUploadedImageIdsFromProduct(product);
  if (!ids.length) return;

  await Promise.all(
    ids.map(async (uploadId) => {
      await deleteUploadedProductImageById(uploadId);
    }),
  );
}

async function deleteUploadedProductImageById(uploadId) {
  const safeId = path.basename(String(uploadId || "")).trim();
  if (!safeId) return false;

  if (mongoDb.isEnabled()) {
    await (await mongoDb.getCollection("product_images")).deleteOne({
      id: safeId,
    });
    return true;
  }

  const filePath = path.join(IMAGE_UPLOAD_DIR, safeId);
  if (!filePath.startsWith(IMAGE_UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanupRemovedUploadedImages(input, existingProduct = {}) {
  const previousIds = getUploadedImageIdsFromProduct(existingProduct);
  const nextIds = getUploadedImageIdsFromProduct(input);
  const removedIds = previousIds.filter((id) => !nextIds.includes(id));

  await Promise.all(
    removedIds.map(async (uploadId) => {
      await deleteUploadedProductImageById(uploadId);
    }),
  );
}

async function persistProductImageIfNeeded(payload, existingProduct = {}) {
  const input = payload || {};

  // If seller provides base64 imageData, save it and convert to /api/uploads/... URL.
  const hasImageData =
    typeof input.imageData === "string" && input.imageData.trim().length > 0;
  if (hasImageData) {
    const uploadedUrl = await saveUploadedProductImage(input.imageData);

    // Ensure consistency for client rendering.
    input.imageUrl = uploadedUrl;
    input.imageGallery =
      Array.isArray(input.imageGallery) && input.imageGallery.length > 0
        ? input.imageGallery
        : [uploadedUrl];

    // Preserve emoji fallback only if client did not send a custom one.
    if (!input.image && existingProduct.image) input.image = existingProduct.image;

    await cleanupRemovedUploadedImages(input, existingProduct);
    return input;
  }

  // If client already uses an uploaded image URL, trust it.
  if (input.imageUrl && isUploadedImageUrl(input.imageUrl)) {
    if (!Array.isArray(input.imageGallery) || input.imageGallery.length === 0) {
      input.imageGallery = [input.imageUrl];
    }
    await cleanupRemovedUploadedImages(input, existingProduct);
    return input;
  }

  // Legacy: if imageGallery contains uploaded URLs, derive imageUrl.
  if (
    Array.isArray(input.imageGallery) &&
    input.imageGallery.some(isUploadedImageUrl)
  ) {
    const first = input.imageGallery.find(isUploadedImageUrl);
    if (first) {
      input.imageUrl = first;
    }
    await cleanupRemovedUploadedImages(input, existingProduct);
    return input;
  }

  await cleanupRemovedUploadedImages(input, existingProduct);
  return input;
}

function normalizeProductPayload(payload, existingProduct = {}) {
  const product = {
    ...existingProduct,
    name: String(payload.name || existingProduct.name || "").trim(),
    category: String(payload.category || existingProduct.category || "").trim(),
    price: Number.parseInt(payload.price, 10),
    originalPrice: Number.parseInt(payload.originalPrice, 10),
    stock: String(payload.stock || existingProduct.stock || "In Stock").trim(),
    image: String(payload.image || existingProduct.image || "📦").trim(),
    imageUrl: String(payload.imageUrl || existingProduct.imageUrl || "").trim(),
    imageGallery: Array.isArray(payload.imageGallery)
      ? payload.imageGallery.map(String)
      : existingProduct.imageGallery || [],
    description: String(
      payload.description || existingProduct.description || "",
    ).trim(),
    paymentOffers: {
      creditCard: String(
        payload.paymentOffers?.creditCard ||
          existingProduct.paymentOffers?.creditCard ||
          "Not available",
      ).trim(),
      debitCard: String(
        payload.paymentOffers?.debitCard ||
          existingProduct.paymentOffers?.debitCard ||
          "Not available",
      ).trim(),
      upi: String(
        payload.paymentOffers?.upi ||
          existingProduct.paymentOffers?.upi ||
          "Not available",
      ).trim(),
      cod: String(
        payload.paymentOffers?.cod ||
          existingProduct.paymentOffers?.cod ||
          "Not available",
      ).trim(),
    },
    features: Array.isArray(payload.features)
      ? payload.features.map(String)
      : existingProduct.features || [],
    specs: Array.isArray(payload.specs)
      ? payload.specs
      : existingProduct.specs || [],
    rating: Number.isFinite(existingProduct.rating)
      ? existingProduct.rating
      : 0,
    reviews: Number.isFinite(existingProduct.reviews)
      ? existingProduct.reviews
      : 0,
    updatedAt: new Date().toISOString(),
  };

  if (
    !product.name ||
    !product.category ||
    !Number.isFinite(product.price) ||
    !Number.isFinite(product.originalPrice)
  ) {
    throw new Error(
      "Product name, category, price, and original price are required.",
    );
  }

  if (!product.imageUrl && product.imageGallery.length > 0) {
    product.imageUrl = product.imageGallery[0];
  }

  if (product.imageUrl) {
    product.imageGallery =
      product.imageGallery.length > 0
        ? product.imageGallery
        : [product.imageUrl];

    // Use the uploaded image URL as the active product image when present.
    // This avoids showing the old emoji/icon fallback as the default.
    product.image = product.imageUrl;
  }

  if (!product.image && !product.imageUrl) {
    product.image = "📦";
  }

  return product;
}

function applyReviewStats(products, reviewsStore) {
  return products.map((product) => {
    const productReviews = Array.isArray(reviewsStore[product.id])
      ? reviewsStore[product.id]
      : [];
    const reviewCount = productReviews.length;
    const averageRating =
      reviewCount > 0
        ? productReviews.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0,
          ) / reviewCount
        : 0;

    return {
      ...product,
      rating: Number(averageRating.toFixed(1)),
      reviews: reviewCount,
    };
  });
}

function buildProductPayload() {
  const productStore = readProductsStore();
  const reviewsStore = readReviewsStore();

  // Normalize image fields so the main website can always render consistently.
  const normalizedProducts = (productStore.products || []).map((p) => {
    const existing = p || {};
    const payload = {
      ...existing,
      imageUrl: String(existing.imageUrl || "").trim(),
      imageGallery: Array.isArray(existing.imageGallery)
        ? existing.imageGallery
        : [],
      image: String(existing.image || "").trim() || "📦",
    };

    // Ensure gallery/imageUrl consistency.
    if (!payload.imageUrl && payload.imageGallery.length > 0) {
      payload.imageUrl = payload.imageGallery[0];
    }
    if (payload.imageUrl && payload.imageGallery.length === 0) {
      payload.imageGallery = [payload.imageUrl];
    }

    return payload;
  });

  return {
    products: applyReviewStats(normalizedProducts, reviewsStore),
    updatedAt: productStore.updatedAt || new Date().toISOString(),
  };
}

async function findCustomerByToken(token) {
  if (!token) {
    return null;
  }

  if (mongoDb.isEnabled()) {
    const session = await mongoDb
      .getCollection("sessions")
      .findOne({ token, type: "customer" });
    if (!session) return null;
    return await mongoDb
      .getCollection("customers")
      .findOne({ id: session.customerId });
  }

  const sessions = readSessionsStore();
  const session = sessions.customer[token];
  if (!session) {
    return null;
  }
  const customers = readCustomerStore();
  return (
    customers.find((customer) => customer.id === session.customerId) || null
  );
}

function sanitizeCustomer(customer) {
  if (!customer) {
    return null;
  }
  return {
    id: customer.id,
    firstname: customer.firstname,
    lastname: customer.lastname,
    email: customer.email,
    phone: customer.phone,
    defaultCity: customer.defaultCity || "",
    defaultAddress: customer.defaultAddress || "",
    createdAt: customer.createdAt || null,
    updatedAt: customer.updatedAt || null,
  };
}

function getOrderOwner(order) {
  return order.customerId || order.customerEmail || order.customerPhone || "";
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const apiPath = pathname;


  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && apiPath.startsWith("/api/uploads/")) {
    await sendUploadedProductImage(res, apiPath.split("/").pop());
    return;
  }

  if (req.method === "POST" && apiPath === "/api/seller/uploads") {
    const token = getToken(req);

    if (mongoDb.isEnabled()) {
      const session = await (
        await mongoDb.getCollection("sessions")
      ).findOne({ token, type: "seller" });
      if (!session) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }
    } else {
      const sessions = readSessionsStore();
      if (!sessions.seller[token]) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }
    }

    try {
      const body = await parseBody(req);
      const url = await saveUploadedProductImage(body.imageData);
      sendJson(res, 201, { url });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Unable to save image." });
    }
    return;
  }

  if (req.method === "GET" && apiPath === "/api/products") {
    // Prefer MongoDB; fallback to legacy local JSON when MongoDB is not configured.
    if (mongoDb.isEnabled()) {
      await seedMongoIfNeeded();
      sendJson(res, 200, await getMongoProductListWithRatings());
      return;
    }
    sendJson(res, 200, buildProductPayload());
    return;
  }

  if (req.method === "POST" && apiPath === "/api/seller/login") {
    const body = await parseBody(req);
    if (body.sellerId !== SELLER_ID || body.password !== SELLER_PASSWORD) {
      sendJson(res, 401, { error: "Invalid seller ID or password." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");

    if (mongoDb.isEnabled()) {
      await mongoDb
        .getCollection("sessions")
        .updateOne(
          { token, type: "seller" },
          {
            $set: {
              token,
              type: "seller",
              sellerName: SELLER_NAME,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          { upsert: true },
        );
      sendJson(res, 200, { token, sellerName: SELLER_NAME });
      return;
    }

    const sessions = readSessionsStore();
    sessions.seller[token] = {
      sellerName: SELLER_NAME,
      createdAt: new Date().toISOString(),
    };
    writeSessionsStore(sessions);
    sendJson(res, 200, { token, sellerName: SELLER_NAME });
    return;
  }

  // Admin default products API (seller panel admin/editor)
  // NOTE: Seller JWT already authorizes seller actions; admin is not separately modeled.
  // If you need admin-only, add a role check here.
  if (req.method === "GET" && apiPath === "/api/admin/default-products") {
    sendJson(res, 200, {
      defaultProducts: readDefaultProductsStore()?.products || DEFAULT_PRODUCTS,
      updatedAt:
        readDefaultProductsStore()?.updatedAt || new Date().toISOString(),
    });
    return;
  }

  if (req.method === "PUT" && apiPath === "/api/admin/default-products") {
    // Reuse seller authentication for now.
    const token = getToken(req);
    if (mongoDb.isEnabled()) {
      const session = await (
        await mongoDb.getCollection("sessions")
      ).findOne({ token, type: "seller" });
      if (!session) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }
    } else {
      const sessions = readSessionsStore();
      if (!sessions.seller[token]) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }
    }

    const body = await parseBody(req);
    const inputProducts = Array.isArray(body.products) ? body.products : null;
    if (!inputProducts) {
      sendJson(res, 400, { error: "products array is required" });
      return;
    }

    // Normalize and assign timestamps.
    const now = new Date().toISOString();
    const normalizedDefaults = inputProducts.map((p) => {
      const price = Number.parseInt(p.price, 10);
      const originalPrice = Number.parseInt(p.originalPrice, 10);
      return {
        ...p,
        id: Number.isFinite(Number(p.id)) ? Number(p.id) : p.id,
        name: String(p.name || "").trim(),
        category: String(p.category || "").trim(),
        price,
        originalPrice,
        stock: String(p.stock || "In Stock").trim(),
        image: String(p.image || "📦").trim(),
        imageUrl: String(p.imageUrl || "").trim(),
        imageGallery: Array.isArray(p.imageGallery)
          ? p.imageGallery.map(String).filter(Boolean)
          : [],
        description: String(p.description || "").trim(),
        features: Array.isArray(p.features) ? p.features.map(String) : [],
        specs: Array.isArray(p.specs) ? p.specs : [],
        paymentOffers: p.paymentOffers || {},
        rating: 0,
        reviews: 0,
        createdAt: p.createdAt || now,
        updatedAt: now,
      };
    });

    // Replace existing products immediately as per requirement.
    // Update defaultProducts store.
    writeDefaultProductsStore({ products: normalizedDefaults, updatedAt: now });

    if (mongoDb.isEnabled()) {
      const productsCol = await mongoDb.getCollection("products");
      const reviewsCol = await mongoDb.getCollection("reviews");
      await reviewsCol.deleteMany({});
      await productsCol.deleteMany({});
      await productsCol.insertMany(normalizedDefaults);
    } else {
      writeProductsStore({ products: normalizedDefaults, updatedAt: now });
      // In local JSON mode, also clear reviews since defaults changed.
      writeReviewsStore({});
    }

    // Return new canonical list.
    const updatedProducts = mongoDb.isEnabled()
      ? await getMongoProductListWithRatings()
      : buildProductPayload();

    sendJson(res, 200, {
      products: updatedProducts.products || updatedProducts,
      updatedAt: now,
    });
    return;
  }

  if (req.method === "GET" && apiPath === "/api/seller/session") {
    const token = getToken(req);

    if (mongoDb.isEnabled()) {

      const session = await mongoDb
        .getCollection("sessions")
        .findOne({ token, type: "seller" });
      if (!session) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }
      sendJson(res, 200, { sellerName: session.sellerName || SELLER_NAME });
      return;
    }

    const sessions = readSessionsStore();
    const session = sessions.seller[token];
    if (!session) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }
    sendJson(res, 200, { sellerName: session.sellerName || SELLER_NAME });
    return;
  }

  if (req.method === "POST" && apiPath === "/api/seller/logout") {
    const token = getToken(req);
    if (token) {
      if (mongoDb.isEnabled()) {
        await mongoDb
          .getCollection("sessions")
          .deleteOne({ token, type: "seller" });
      } else {
        const sessions = readSessionsStore();
        delete sessions.seller[token];
        writeSessionsStore(sessions);
      }
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (apiPath.startsWith("/api/seller/products")) {
    const token = getToken(req);

    if (mongoDb.isEnabled()) {
      const session = await mongoDb
        .getCollection("sessions")
        .findOne({ token, type: "seller" });
      if (!session) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
      }

      // MongoDB products endpoints
      if (apiPath === "/api/seller/products") {
        if (req.method === "GET") {
          const payload = await getMongoProductListWithRatings();
          sendJson(res, 200, payload);

          return;
        }

        if (req.method === "POST") {
          const body = await parseBody(req);
          const productsCol = await mongoDb.getCollection("products");
          const nextIdDoc = await productsCol
            .find()
            .sort({ id: -1 })
            .limit(1)
            .next();
          const nextId = (nextIdDoc?.id ? Number(nextIdDoc.id) : 0) + 1;

          const persisted = await persistProductImageIfNeeded(body);
          const product = normalizeProductPayload(persisted);
          product.id = nextId;

          product.rating = 0;
          product.reviews = 0;
          product.createdAt = new Date().toISOString();
          product.updatedAt = new Date().toISOString();
          await productsCol.insertOne(product);

          const payload = await getMongoProductListWithRatings();
          sendJson(res, 201, {
            products: payload.products,
            updatedAt: payload.updatedAt,
          });
          return;
        }
      }

      const productId = Number.parseInt(apiPath.split("/").pop(), 10);
      if (!Number.isFinite(productId)) {
        sendJson(res, 400, { error: "Invalid product ID." });
        return;
      }

      if (apiPath.startsWith("/api/seller/products/")) {
        if (req.method === "PUT") {
          const body = await parseBody(req);
          const productsCol = await mongoDb.getCollection("products");
          const existing = await productsCol.findOne({ id: productId });
          if (!existing) {
            sendJson(res, 404, { error: "Product not found." });
            return;
          }

          const persisted = await persistProductImageIfNeeded(body, existing);
          const updated = normalizeProductPayload(persisted, existing);

          updated.id = productId;
          updated.updatedAt = new Date().toISOString();
          delete updated._id;
          await productsCol.updateOne({ id: productId }, { $set: updated });

          const payload = await getMongoProductListWithRatings();
          sendJson(res, 200, {
            products: payload.products,
            updatedAt: payload.updatedAt,
          });
          return;
        }

        if (req.method === "DELETE") {
          const productsCol = await mongoDb.getCollection("products");
          const existing = await productsCol.findOne({ id: productId });
          if (!existing) {
            sendJson(res, 404, { error: "Product not found." });
            return;
          }

          await deleteUploadedImagesFromProduct(existing);
          const deleted = await productsCol.deleteOne({ id: productId });
          await (
            await mongoDb.getCollection("reviews")
          ).deleteMany({ productId: String(productId) });

          const payload = await getMongoProductListWithRatings();
          sendJson(res, 200, {
            products: payload.products,
            updatedAt: payload.updatedAt,
          });
          return;
        }
      }

      sendJson(res, 404, { error: "Not found." });
      return;
    }

    const sessions = readSessionsStore();
    if (!sessions.seller[token]) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }

    const productStore = readProductsStore();
    const reviewsStore = readReviewsStore();

    if (apiPath === "/api/seller/products") {
      if (req.method === "GET") {
        sendJson(res, 200, {
          products: applyReviewStats(productStore.products || [], reviewsStore),
          updatedAt: productStore.updatedAt,
        });
        return;
      }

      if (req.method === "POST") {
        const body = await parseBody(req);
        const nextId =
          (productStore.products || []).reduce(
            (maxId, product) => Math.max(maxId, Number(product.id) || 0),
            0,
          ) + 1;
        const persisted = await persistProductImageIfNeeded(body);
        const product = normalizeProductPayload(persisted);
        product.id = nextId;
        const nextStore = writeProductsStore({
          products: [...(productStore.products || []), product],
          updatedAt: new Date().toISOString(),
        });
        sendJson(res, 201, {
          products: applyReviewStats(nextStore.products, readReviewsStore()),
          updatedAt: nextStore.updatedAt,
        });
        return;
      }
    }

    const productId = Number.parseInt(apiPath.split("/").pop(), 10);
    if (!Number.isFinite(productId)) {
      sendJson(res, 400, { error: "Invalid product ID." });
      return;
    }

    const productIndex = (productStore.products || []).findIndex(
      (product) => Number(product.id) === productId,
    );
    if (productIndex === -1) {
      sendJson(res, 404, { error: "Product not found." });
      return;
    }

    if (req.method === "PUT") {
      const body = await parseBody(req);
      const persisted = await persistProductImageIfNeeded(
        body,
        productStore.products[productIndex],
      );
      const updatedProduct = normalizeProductPayload(
        persisted,
        productStore.products[productIndex],
      );
      updatedProduct.id = productId;

      productStore.products[productIndex] = updatedProduct;
      const nextStore = writeProductsStore({
        products: productStore.products,
        updatedAt: new Date().toISOString(),
      });
      sendJson(res, 200, {
        products: applyReviewStats(nextStore.products, readReviewsStore()),
        updatedAt: nextStore.updatedAt,
      });
      return;
    }

    if (req.method === "DELETE") {
      await deleteUploadedImagesFromProduct(productStore.products[productIndex]);
      const nextStore = writeProductsStore({
        products: productStore.products.filter(
          (product) => Number(product.id) !== productId,
        ),
        updatedAt: new Date().toISOString(),
      });
      sendJson(res, 200, {
        products: applyReviewStats(nextStore.products, readReviewsStore()),
        updatedAt: nextStore.updatedAt,
      });
      return;
    }
  }

  if (req.method === "GET" && pathname === "/api/reviews") {
    const productId = String(url.searchParams.get("productId") || "").trim();

    if (mongoDb.isEnabled()) {
      const reviewsCol = await mongoDb.getCollection("reviews");
      const query = productId ? { productId } : {};
      const reviews = await reviewsCol.find(query).toArray();
      sendJson(res, 200, { reviews });
      return;
    }

    const reviewsStore = readReviewsStore();
    sendJson(res, 200, {
      reviews: Array.isArray(reviewsStore[productId])
        ? reviewsStore[productId]
        : [],
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reviews") {
    const body = await parseBody(req);
    const productId = String(body.productId || "").trim();
    const rating = Number.parseInt(body.rating, 10);
    const text = String(body.text || "").trim();
    if (!productId || !Number.isFinite(rating) || !text) {
      sendJson(res, 400, {
        error: "Product ID, rating, and review text are required.",
      });
      return;
    }

    const token = getToken(req);
    const customer = await findCustomerByToken(token);

    if (mongoDb.isEnabled()) {
      const rating = Number.parseInt(body.rating, 10);
      const text = String(body.text || "").trim();

      if (!productId || !Number.isFinite(rating) || !text) {
        sendJson(res, 400, {
          error: "Product ID, rating, and review text are required.",
        });
        return;
      }

      const reviewsCol = await mongoDb.getCollection("reviews");
      const review = {
        productId,
        id: Date.now(),
        rating,
        text,
        author: customer
          ? `${customer.firstname || ""} ${customer.lastname || ""}`.trim() ||
            customer.email ||
            "Customer"
          : "Customer",
        date: new Date().toLocaleDateString("en-IN"),
        timestamp: Date.now(),
        customerId: customer ? customer.id : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await reviewsCol.insertOne(review);
      const saved = await reviewsCol.find({ productId }).toArray();
      sendJson(res, 201, { reviews: saved });
      return;
    }

    const reviewsStore = readReviewsStore();

    const review = {
      id: Date.now(),
      rating,
      text,
      author: customer
        ? `${customer.firstname || ""} ${customer.lastname || ""}`.trim() ||
          customer.email ||
          "Customer"
        : "Customer",
      date: new Date().toLocaleDateString("en-IN"),
      timestamp: Date.now(),
      customerId: customer ? customer.id : null,
    };

    if (!Array.isArray(reviewsStore[productId])) {
      reviewsStore[productId] = [];
    }
    reviewsStore[productId].push(review);
    writeReviewsStore(reviewsStore);
    sendJson(res, 201, { reviews: reviewsStore[productId] });
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/reviews/")) {
    const parts = pathname.split("/").filter(Boolean);
    const productId = parts[2];
    const reviewId = Number.parseInt(parts[3], 10);

    if (mongoDb.isEnabled()) {
      const reviewsCol = await mongoDb.getCollection("reviews");
      const existing = await reviewsCol.findOne({ productId, id: reviewId });
      if (!existing) {
        sendJson(res, 404, { error: "Review not found." });
        return;
      }

      await reviewsCol.deleteOne({ productId, id: reviewId });
      const remaining = await reviewsCol.find({ productId }).toArray();
      sendJson(res, 200, { reviews: remaining });
      return;
    }

    const reviewsStore = readReviewsStore();
    if (!Array.isArray(reviewsStore[productId])) {
      sendJson(res, 404, { error: "Review not found." });
      return;
    }
    reviewsStore[productId] = reviewsStore[productId].filter(
      (review) => Number(review.id) !== reviewId,
    );
    if (reviewsStore[productId].length === 0) {
      delete reviewsStore[productId];
    }
    writeReviewsStore(reviewsStore);
    sendJson(res, 200, {
      reviews: Array.isArray(reviewsStore[productId])
        ? reviewsStore[productId]
        : [],
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/register") {
    const body = await parseBody(req);
    const firstname = String(body.firstname || "").trim();
    const lastname = String(body.lastname || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (mongoDb.isEnabled()) {
      if (!firstname || !lastname || !password || (!email && !phone)) {
        sendJson(res, 400, {
          error: "Name, password, and an email or phone number are required.",
        });
        return;
      }

      const customersCol = await mongoDb.getCollection("customers");

      // Enforce: same email/phone should map to the same customer id.
      // If account already exists, do NOT create a new customer.
      let existingCustomer = null;
      if (email) {
        existingCustomer = await customersCol.findOne({ email });
      }
      if (!existingCustomer && phone) {
        // Note: phone storage can be inconsistent; for strict uniqueness enforce exact match.
        existingCustomer = await customersCol.findOne({ phone });
      }

      if (existingCustomer) {
        // Existing account found.
        // IMPORTANT: Do NOT overwrite the stored password; registration is not login.
        // Return a session only if password matches; otherwise behave like login and reject.
        // If the customer was created previously, the stored record may not have `password`
        // (e.g., legacy data). Fall back to accepting password for reuse, otherwise reject.
        const passwordStored =
          typeof existingCustomer.password === "string"
            ? existingCustomer.password
            : "";
        const passwordMatches = passwordStored
          ? passwordStored === password
          : true;
        if (!passwordMatches) {
          sendJson(res, 401, {
            error:
              "Invalid login details. Please check your email, phone number, and password.",
          });
          return;
        }

        // Update profile fields (safe) but keep password as-is.
        // Also ensure any delivery defaults are persisted with the customer identity.
        const updateFields = {
          firstname,
          lastname,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          updatedAt: new Date().toISOString(),
        };

        // If the UI sends delivery defaults during register, persist them.
        // (Otherwise leave existing defaults as-is.)
        const defaultAddress = body?.defaultAddress;
        const defaultCity = body?.defaultCity;
        if (typeof defaultAddress === "string" && defaultAddress.trim()) {
          updateFields.defaultAddress = defaultAddress.trim();
        }
        if (typeof defaultCity === "string" && defaultCity.trim()) {
          updateFields.defaultCity = defaultCity.trim();
        }

        await customersCol.updateOne(
          { id: existingCustomer.id },
          { $set: updateFields },
        );

        const refreshed = await customersCol.findOne({
          id: existingCustomer.id,
        });

        const token = crypto.randomBytes(24).toString("hex");
        const sessionsCol = await mongoDb.getCollection("sessions");
        await sessionsCol.updateOne(
          { token, type: "customer" },
          {
            $set: {
              token,
              type: "customer",
              customerId: existingCustomer.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          { upsert: true },
        );

        sendJson(res, 200, {
          token,
          customer: sanitizeCustomer(refreshed || existingCustomer),
        });
        return;
      }

      const customer = {
        id: crypto.randomUUID(),
        firstname,
        lastname,
        email,
        phone,
        password,
        createdAt: new Date().toISOString(),
      };

      await customersCol.insertOne(customer);

      const token = crypto.randomBytes(24).toString("hex");
      const sessionsCol = await mongoDb.getCollection("sessions");
      await sessionsCol.updateOne(
        { token, type: "customer" },
        {
          $set: {
            token,
            type: "customer",
            customerId: customer.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );

      sendJson(res, 201, { token, customer: sanitizeCustomer(customer) });
      return;
    }

    if (!firstname || !lastname || !password || (!email && !phone)) {
      sendJson(res, 400, {
        error: "Name, password, and an email or phone number are required.",
      });
      return;
    }

    const customers = readCustomerStore();
    if (email && customers.some((customer) => customer.email === email)) {
      sendJson(res, 409, {
        error: "An account with this email already exists.",
      });
      return;
    }
    if (phone && customers.some((customer) => customer.phone === phone)) {
      sendJson(res, 409, {
        error: "An account with this phone number already exists.",
      });
      return;
    }

    const customer = {
      id: crypto.randomUUID(),
      firstname,
      lastname,
      email,
      phone,
      password,
      createdAt: new Date().toISOString(),
    };

    customers.push(customer);
    writeCustomerStore(customers);

    const token = crypto.randomBytes(24).toString("hex");
    const sessions = readSessionsStore();
    sessions.customer[token] = {
      customerId: customer.id,
      createdAt: new Date().toISOString(),
    };
    writeSessionsStore(sessions);
    sendJson(res, 201, { token, customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/login") {
    const body = await parseBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (mongoDb.isEnabled()) {
      const customersCol = await mongoDb.getCollection("customers");
      let customer = null;

      if (email && phone) {
        // Normalize phone to improve compatibility across UI formats.
        // Backend now tolerates stored phone either as full(+CC + number) or digits-only.
        const phoneDigits = String(phone).replace(/\D/g, "");
        customer = await customersCol.findOne({
          email,
          password,
          $or: [
            { phone },
            { phone: phoneDigits },
            { phone: `+${phoneDigits}` },
          ],
        });
      } else if (email) {
        customer = await customersCol.findOne({ email, password });
      } else if (phone) {
        const phoneDigits = String(phone).replace(/\D/g, "");
        customer = await customersCol.findOne({
          password,
          $or: [
            { phone },
            { phone: phoneDigits },
            { phone: `+${phoneDigits}` },
          ],
        });
      }

      if (!customer) {
        sendJson(res, 401, {
          error:
            "Invalid login details. Please check your email, phone number, and password.",
        });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      const sessionsCol = await mongoDb.getCollection("sessions");
      await sessionsCol.updateOne(
        { token, type: "customer" },
        {
          $set: {
            token,
            type: "customer",
            customerId: customer.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );

      sendJson(res, 200, { token, customer: sanitizeCustomer(customer) });
      return;
    }

    const customers = readCustomerStore();
    const customer = customers.find((item) => {
      if (email && phone) {
        return (
          item.email === email &&
          item.phone === phone &&
          item.password === password
        );
      }
      if (email) {
        return item.email === email && item.password === password;
      }
      if (phone) {
        return item.phone === phone && item.password === password;
      }
      return false;
    });

    if (!customer) {
      sendJson(res, 401, {
        error:
          "Invalid login details. Please check your email, phone number, and password.",
      });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const sessions = readSessionsStore();
    sessions.customer[token] = {
      customerId: customer.id,
      createdAt: new Date().toISOString(),
    };
    writeSessionsStore(sessions);
    sendJson(res, 200, { token, customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/customers/session") {
    const customer = await findCustomerByToken(getToken(req));
    if (!customer) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }
    sendJson(res, 200, { customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/logout") {
    const token = getToken(req);

    // Logout should only invalidate the session token.
    // It must NOT delete customers or orders.
    if (mongoDb.isEnabled()) {
      if (token) {
        await mongoDb
          .getCollection("sessions")
          .deleteOne({ token, type: "customer" });
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (token) {
      const sessions = readSessionsStore();
      delete sessions.customer[token];
      writeSessionsStore(sessions);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/orders") {
    const token = getToken(req);
    // Note: Orders are the source for counts (My Orders / Account dashboard).
    // Ensure customer lookup is correct before returning orders.

    const customer = await findCustomerByToken(token);

    if (!customer) {
      sendJson(res, 401, { error: "Please log in to manage orders." });
      return;
    }

    if (req.method === "GET") {
      if (mongoDb.isEnabled()) {
        const ordersCol = await mongoDb.getCollection("orders");
        const orders = await ordersCol
          .find({ customerId: customer.id })
          .sort({ createdAt: -1 })
          .toArray();
        sendJson(res, 200, { orders });
        return;
      }

      const orders = readOrdersStore().filter(
        (order) => getOrderOwner(order) === customer.id,
      );
      sendJson(res, 200, { orders });
      return;
    }

    if (req.method === "POST") {
      const body = await parseBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        sendJson(res, 400, { error: "Your cart is empty." });
        return;
      }

      const order = {
        id: `#ORD${Math.random().toString(9).slice(2, 10)}`,
        date: new Date().toLocaleDateString("en-IN"),
        items,
        total: String(body.total || "0"),
        status: "pending",
        customerId: customer.id,
        customerName: String(
          body.customerName ||
            `${customer.firstname} ${customer.lastname}`.trim(),
        ).trim(),
        customerEmail: String(
          body.customerEmail || customer.email || "",
        ).trim(),
        customerPhone: String(
          body.customerPhone || customer.phone || "",
        ).trim(),
        customerCity: String(body.customerCity || "").trim(),
        shippingAddress: String(
          body.shippingAddress || "Address not provided",
        ).trim(),
        paymentMethod: String(body.paymentMethod || "Not specified").trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (mongoDb.isEnabled()) {
        // Persist customer defaults linked to the logged-in user id.
        const profileUpdate = {};
        if (order.shippingAddress)
          profileUpdate.defaultAddress = order.shippingAddress;
        if (order.customerCity) profileUpdate.defaultCity = order.customerCity;

        if (Object.keys(profileUpdate).length) {
          await mongoDb
            .getCollection("customers")
            .updateOne({ id: customer.id }, { $set: profileUpdate });
        }

        // Ensure order is saved with customer identity fields.
        order.customerId = customer.id;
        order.customerName = String(
          body.customerName ||
            `${customer.firstname} ${customer.lastname}`.trim(),
        ).trim();
        order.customerEmail = String(
          body.customerEmail || customer.email || "",
        ).trim();
        order.customerPhone = String(
          body.customerPhone || customer.phone || "",
        ).trim();
        order.customerCity = String(body.customerCity || "").trim();
        order.shippingAddress = String(
          body.shippingAddress || "Address not provided",
        ).trim();

        await mongoDb.getCollection("orders").insertOne(order);
        sendJson(res, 201, { order });
        return;
      }

      // Local JSON mode: persist both order and customer defaults.
      const orders = readOrdersStore();
      orders.push(order);
      writeOrdersStore(orders);

      if (order.shippingAddress || order.customerCity) {
        const customers = readCustomerStore();
        const idx = customers.findIndex((c) => c.id === customer.id);
        if (idx !== -1) {
          const next = { ...customers[idx] };
          if (order.shippingAddress)
            next.defaultAddress = order.shippingAddress;
          if (order.customerCity) next.defaultCity = order.customerCity;
          customers[idx] = next;
          writeCustomerStore(customers);
        }
      }

      sendJson(res, 201, { order });
      return;
    }
  }

  if (pathname.startsWith("/api/orders/")) {
    const customer = await findCustomerByToken(getToken(req));

    if (!customer) {
      sendJson(res, 401, { error: "Please log in to manage orders." });
      return;
    }

    const parts = pathname.split("/").filter(Boolean);
    const orderId = decodeURIComponent(parts[2] || "");
    const orders = readOrdersStore();
    const orderIndex = orders.findIndex(
      (order) => order.id === orderId && getOrderOwner(order) === customer.id,
    );
    if (orderIndex === -1) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }

    if (mongoDb.isEnabled()) {
      const ordersCol = await mongoDb.getCollection("orders");
      const orderDoc = await ordersCol.findOne({
        id: orderId,
        customerId: customer.id,
      });
      if (!orderDoc) {
        sendJson(res, 404, { error: "Order not found." });
        return;
      }

      if (req.method === "GET" && parts.length === 3) {
        sendJson(res, 200, { order: orderDoc });
        return;
      }

      if (req.method === "POST" && parts[3] === "cancel") {
        const body = await parseBody(req);
        const update = {
          $set: {
            status: "cancelled",
            cancellationReason: String(body.reason || "").trim(),
            cancellationDate: new Date().toLocaleDateString("en-IN"),
            updatedAt: new Date().toISOString(),
          },
        };

        await ordersCol.updateOne(
          { id: orderId, customerId: customer.id },
          update,
        );
        const updated = await ordersCol.findOne({
          id: orderId,
          customerId: customer.id,
        });
        sendJson(res, 200, { order: updated });
        return;
      }

      sendJson(res, 404, { error: "Not found." });
      return;
    }

    if (req.method === "GET" && parts.length === 3) {
      sendJson(res, 200, { order: orders[orderIndex] });
      return;
    }

    if (req.method === "POST" && parts[3] === "cancel") {
      const body = await parseBody(req);
      orders[orderIndex].status = "cancelled";
      orders[orderIndex].cancellationReason = String(body.reason || "").trim();
      orders[orderIndex].cancellationDate = new Date().toLocaleDateString(
        "en-IN",
      );
      orders[orderIndex].updatedAt = new Date().toISOString();
      writeOrdersStore(orders);
      sendJson(res, 200, { order: orders[orderIndex] });
      return;
    }
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      mode: "node-server",
      mongoEnabled: mongoDb.isEnabled(),
      mongoDb: process.env.MONGODB_DB || "quickpick_store",
    });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

function safePathname(pathname) {
  const normalized = path.normalize(pathname).replace(/^(\.\.[\\/])+/, "");
  return normalized === path.sep ? "" : normalized;
}

function serveStatic(req, res, url) {
  let pathname = url.pathname;
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const relativePath = safePathname(pathname);
  const targetPath = path.join(ROOT_DIR, relativePath);
  if (!targetPath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  const baseName = path.basename(targetPath);
  const extension = path.extname(targetPath).toLowerCase();
  const withinAllowedFolder = targetPath.startsWith(
    path.join(ROOT_DIR, "data"),
  );

  if (!PUBLIC_FILES.has(baseName) && !withinAllowedFolder) {
    sendText(res, 404, "Not found");
    return;
  }

  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  res.writeHead(200, { "content-type": contentType });
  fs.createReadStream(targetPath).pipe(res);
}

const requestHandler = async (req, res) => {
  try {
    const protocol = HTTPS_ENABLED ? "https" : "http";
    const url = new URL(
      req.url,
      `${protocol}://${req.headers.host || `${HOST}:${PORT}`}`,
    );

    // Only handle APIs here; everything else is static content.
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
};

const server = HTTPS_ENABLED
  ? https.createServer(
      {
        pfx: fs.readFileSync(HTTPS_PFX_FILE),
        passphrase: HTTPS_PFX_PASSPHRASE,
      },
      requestHandler,
    )
  : http.createServer(requestHandler);

let redirectServer = null;

if (HTTPS_ENABLED) {
  redirectServer = http.createServer((req, res) => {
    const hostHeader = req.headers.host || `${HOST}:${HTTP_REDIRECT_PORT}`;
    const hostname = hostHeader.split(":")[0] || HOST;
    const location = `https://${hostname}:${PORT}${req.url || "/"}`;
    res.writeHead(301, { Location: location });
    res.end();
  });
}

server.listen(PORT, HOST, () => {
  ensureDataDir();
  readProductsStore();
  readCustomerStore();
  readReviewsStore();
  readOrdersStore();
  readSessionsStore();
  const protocol = HTTPS_ENABLED ? "https" : "http";
  console.log(`Quickpick website running at ${protocol}://${HOST}:${PORT}`);
  if (!HTTPS_ENABLED) {
    console.log(
      `HTTPS certificate not found. Generate one at ${HTTPS_PFX_FILE} to enable HTTPS locally.`,
    );
  }
});

if (redirectServer) {
  redirectServer.listen(HTTP_REDIRECT_PORT, HOST, () => {
    console.log(
      `HTTP redirect active at http://${HOST}:${HTTP_REDIRECT_PORT} -> https://${HOST}:${PORT}`,
    );
  });
}
