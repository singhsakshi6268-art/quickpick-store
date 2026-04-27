const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DISK_MOUNT_PATH || path.join(ROOT_DIR, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const CERTS_DIR = path.join(ROOT_DIR, "certs");
const HTTPS_PFX_FILE = path.join(CERTS_DIR, "localhost-dev.pfx");
const HTTPS_PFX_PASSPHRASE = process.env.HTTPS_PFX_PASSPHRASE || "quickpick-local-dev";
const HTTPS_ENABLED = fs.existsSync(HTTPS_PFX_FILE);
const PORT = Number.parseInt(process.env.PORT || (HTTPS_ENABLED ? "8443" : "8888"), 10);
const HTTP_REDIRECT_PORT = Number.parseInt(process.env.HTTP_PORT || "8888", 10);
const PUBLIC_FILES = new Set(["index.html", "seller-panel.html", "netlify.toml", "_redirects"]);
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
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8"
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
    description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    features: ["Noise Cancellation", "30-hour battery", "Bluetooth 5.0", "Built-in microphone"],
    specs: [["Color", "Black"], ["Battery", "30 hours"], ["Connectivity", "Bluetooth 5.0"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    description: "Advanced smartwatch with fitness tracking and 7-day battery life.",
    features: ["Heart Rate Monitor", "GPS", "Fitness Tracking", "Sleep Monitoring"],
    specs: [["Display", "1.4\" AMOLED"], ["Battery", "7 days"], ["Water Resistance", "5ATM"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    features: ["65W Power", "Fast Charging", "Compact", "Multiple Device Support"],
    specs: [["Output", "65W"], ["Ports", "2x USB-C"], ["Input", "100-240V"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    specs: [["Material", "100% Cotton"], ["Sizes", "XS-XXL"], ["Colors", "Multiple"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    specs: [["Material", "Polyester"], ["Sizes", "S-XXL"], ["Colors", "Multiple"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    specs: [["Material", "Mesh + Rubber"], ["Sizes", "5-14"], ["Colors", "Multiple"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    specs: [["Pieces", "5"], ["Material", "Aluminum"], ["Heat Resistance", "400F"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    features: ["Stainless Steel", "Sharp Blades", "Comfortable", "Wood Stand Included"],
    specs: [["Pieces", "6"], ["Material", "Stainless Steel"], ["Warranty", "Lifetime"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    specs: [["Capacity", "1.5L"], ["Power", "1000W"], ["Filter", "Reusable"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    features: ["Easy to Understand", "Practical Examples", "Exercises", "Beginner Friendly"],
    specs: [["Pages", "450"], ["Language", "English"], ["Author", "Tech Academy"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    description: "Master HTML, CSS, and JavaScript with this comprehensive guide.",
    features: ["Complete Coverage", "Project Based", "Code Examples", "Modern"],
    specs: [["Pages", "600"], ["Language", "English"], ["Edition", "3rd"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
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
    features: ["Practical Tips", "Life Changing", "Motivational", "Action Plans"],
    specs: [["Pages", "320"], ["Language", "English"], ["Author", "Life Coach"]],
    paymentOffers: {
      creditCard: "10% off up to Rs.750",
      debitCard: "5% off up to Rs.400",
      upi: "Flat Rs.100 cashback",
      cod: "No extra fee"
    }
  }
];

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultStore() {
  return {
    products: {
      products: DEFAULT_PRODUCTS,
      updatedAt: new Date().toISOString()
    },
    customers: [],
    reviews: {},
    orders: [],
    sessions: { seller: {}, customer: {} }
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
      updatedAt: new Date().toISOString()
    }),
    customers: readLegacyFile("customers.json", []),
    reviews: readLegacyFile("reviews.json", {}),
    orders: readLegacyFile("orders.json", []),
    sessions: readLegacyFile("sessions.json", { seller: {}, customer: {} })
  };
}

function readStore() {
  ensureDataDir();

  if (!fs.existsSync(STORE_FILE)) {
    const migratedStore = fs.existsSync(path.join(DATA_DIR, "products.json")) ? migrateLegacyStore() : createDefaultStore();
    writeStore(migratedStore);
    return structuredCloneSafe(migratedStore);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return {
      products: parsed.products || createDefaultStore().products,
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      reviews: parsed.reviews && typeof parsed.reviews === "object" ? parsed.reviews : {},
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : { seller: {}, customer: {} }
    };
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

function writeProductsStore(store) {
  const rootStore = readStore();
  rootStore.products = {
    products: Array.isArray(store.products) ? store.products : [],
    updatedAt: store.updatedAt || new Date().toISOString()
  };
  writeStore(rootStore);
  return rootStore.products;
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
  rootStore.sessions = sessions && typeof sessions === "object" ? sessions : { seller: {}, customer: {} };
  writeStore(rootStore);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS"
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
    imageGallery: Array.isArray(payload.imageGallery) ? payload.imageGallery.map(String) : (existingProduct.imageGallery || []),
    description: String(payload.description || existingProduct.description || "").trim(),
    paymentOffers: {
      creditCard: String(payload.paymentOffers?.creditCard || existingProduct.paymentOffers?.creditCard || "Not available").trim(),
      debitCard: String(payload.paymentOffers?.debitCard || existingProduct.paymentOffers?.debitCard || "Not available").trim(),
      upi: String(payload.paymentOffers?.upi || existingProduct.paymentOffers?.upi || "Not available").trim(),
      cod: String(payload.paymentOffers?.cod || existingProduct.paymentOffers?.cod || "Not available").trim()
    },
    features: Array.isArray(payload.features) ? payload.features.map(String) : (existingProduct.features || []),
    specs: Array.isArray(payload.specs) ? payload.specs : (existingProduct.specs || []),
    rating: Number.isFinite(existingProduct.rating) ? existingProduct.rating : 0,
    reviews: Number.isFinite(existingProduct.reviews) ? existingProduct.reviews : 0,
    updatedAt: new Date().toISOString()
  };

  if (!product.name || !product.category || !Number.isFinite(product.price) || !Number.isFinite(product.originalPrice)) {
    throw new Error("Product name, category, price, and original price are required.");
  }

  if (!product.imageUrl && product.imageGallery.length > 0) {
    product.imageUrl = product.imageGallery[0];
  }

  if (product.imageUrl) {
    product.imageGallery = product.imageGallery.length > 0 ? product.imageGallery : [product.imageUrl];
  }

  if (!product.image && !product.imageUrl) {
    product.image = "📦";
  }

  return product;
}

function applyReviewStats(products, reviewsStore) {
  return products.map((product) => {
    const productReviews = Array.isArray(reviewsStore[product.id]) ? reviewsStore[product.id] : [];
    const reviewCount = productReviews.length;
    const averageRating = reviewCount > 0
      ? productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount
      : 0;

    return {
      ...product,
      rating: Number(averageRating.toFixed(1)),
      reviews: reviewCount
    };
  });
}

function buildProductPayload() {
  const productStore = readProductsStore();
  const reviewsStore = readReviewsStore();
  return {
    products: applyReviewStats(productStore.products || [], reviewsStore),
    updatedAt: productStore.updatedAt || new Date().toISOString()
  };
}

function findCustomerByToken(token) {
  if (!token) {
    return null;
  }
  const sessions = readSessionsStore();
  const session = sessions.customer[token];
  if (!session) {
    return null;
  }
  const customers = readCustomerStore();
  return customers.find((customer) => customer.id === session.customerId) || null;
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
    phone: customer.phone
  };
}

function getOrderOwner(order) {
  return order.customerId || order.customerEmail || order.customerPhone || "";
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/.netlify/functions/api/products") {
    sendJson(res, 200, buildProductPayload());
    return;
  }

  if (req.method === "POST" && pathname === "/.netlify/functions/api/seller/login") {
    const body = await parseBody(req);
    if (body.sellerId !== SELLER_ID || body.password !== SELLER_PASSWORD) {
      sendJson(res, 401, { error: "Invalid seller ID or password." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const sessions = readSessionsStore();
    sessions.seller[token] = { sellerName: SELLER_NAME, createdAt: new Date().toISOString() };
    writeSessionsStore(sessions);
    sendJson(res, 200, { token, sellerName: SELLER_NAME });
    return;
  }

  if (req.method === "GET" && pathname === "/.netlify/functions/api/seller/session") {
    const token = getToken(req);
    const sessions = readSessionsStore();
    const session = sessions.seller[token];
    if (!session) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }
    sendJson(res, 200, { sellerName: session.sellerName || SELLER_NAME });
    return;
  }

  if (req.method === "POST" && pathname === "/.netlify/functions/api/seller/logout") {
    const token = getToken(req);
    if (token) {
      const sessions = readSessionsStore();
      delete sessions.seller[token];
      writeSessionsStore(sessions);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname.startsWith("/.netlify/functions/api/seller/products")) {
    const token = getToken(req);
    const sessions = readSessionsStore();
    if (!sessions.seller[token]) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }

    const productStore = readProductsStore();
    const reviewsStore = readReviewsStore();

    if (pathname === "/.netlify/functions/api/seller/products") {
      if (req.method === "GET") {
        sendJson(res, 200, {
          products: applyReviewStats(productStore.products || [], reviewsStore),
          updatedAt: productStore.updatedAt
        });
        return;
      }

      if (req.method === "POST") {
        const body = await parseBody(req);
        const nextId = (productStore.products || []).reduce((maxId, product) => Math.max(maxId, Number(product.id) || 0), 0) + 1;
        const product = normalizeProductPayload(body);
        product.id = nextId;
        const nextStore = writeProductsStore({
          products: [...(productStore.products || []), product],
          updatedAt: new Date().toISOString()
        });
        sendJson(res, 201, {
          products: applyReviewStats(nextStore.products, readReviewsStore()),
          updatedAt: nextStore.updatedAt
        });
        return;
      }
    }

    const productId = Number.parseInt(pathname.split("/").pop(), 10);
    if (!Number.isFinite(productId)) {
      sendJson(res, 400, { error: "Invalid product ID." });
      return;
    }

    const productIndex = (productStore.products || []).findIndex((product) => Number(product.id) === productId);
    if (productIndex === -1) {
      sendJson(res, 404, { error: "Product not found." });
      return;
    }

    if (req.method === "PUT") {
      const body = await parseBody(req);
      const updatedProduct = normalizeProductPayload(body, productStore.products[productIndex]);
      updatedProduct.id = productId;
      productStore.products[productIndex] = updatedProduct;
      const nextStore = writeProductsStore({
        products: productStore.products,
        updatedAt: new Date().toISOString()
      });
      sendJson(res, 200, {
        products: applyReviewStats(nextStore.products, readReviewsStore()),
        updatedAt: nextStore.updatedAt
      });
      return;
    }

    if (req.method === "DELETE") {
      const nextStore = writeProductsStore({
        products: productStore.products.filter((product) => Number(product.id) !== productId),
        updatedAt: new Date().toISOString()
      });
      sendJson(res, 200, {
        products: applyReviewStats(nextStore.products, readReviewsStore()),
        updatedAt: nextStore.updatedAt
      });
      return;
    }
  }

  if (req.method === "GET" && pathname === "/api/reviews") {
    const productId = String(url.searchParams.get("productId") || "").trim();
    const reviewsStore = readReviewsStore();
    sendJson(res, 200, { reviews: Array.isArray(reviewsStore[productId]) ? reviewsStore[productId] : [] });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reviews") {
    const body = await parseBody(req);
    const productId = String(body.productId || "").trim();
    const rating = Number.parseInt(body.rating, 10);
    const text = String(body.text || "").trim();
    if (!productId || !Number.isFinite(rating) || !text) {
      sendJson(res, 400, { error: "Product ID, rating, and review text are required." });
      return;
    }

    const token = getToken(req);
    const customer = findCustomerByToken(token);
    const reviewsStore = readReviewsStore();
    const review = {
      id: Date.now(),
      rating,
      text,
      author: customer ? `${customer.firstname || ""} ${customer.lastname || ""}`.trim() || customer.email || "Customer" : "Customer",
      date: new Date().toLocaleDateString("en-IN"),
      timestamp: Date.now(),
      customerId: customer ? customer.id : null
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
    const reviewsStore = readReviewsStore();
    if (!Array.isArray(reviewsStore[productId])) {
      sendJson(res, 404, { error: "Review not found." });
      return;
    }
    reviewsStore[productId] = reviewsStore[productId].filter((review) => Number(review.id) !== reviewId);
    if (reviewsStore[productId].length === 0) {
      delete reviewsStore[productId];
    }
    writeReviewsStore(reviewsStore);
    sendJson(res, 200, { reviews: Array.isArray(reviewsStore[productId]) ? reviewsStore[productId] : [] });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/register") {
    const body = await parseBody(req);
    const firstname = String(body.firstname || "").trim();
    const lastname = String(body.lastname || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!firstname || !lastname || !password || (!email && !phone)) {
      sendJson(res, 400, { error: "Name, password, and an email or phone number are required." });
      return;
    }

    const customers = readCustomerStore();
    if (email && customers.some((customer) => customer.email === email)) {
      sendJson(res, 409, { error: "An account with this email already exists." });
      return;
    }
    if (phone && customers.some((customer) => customer.phone === phone)) {
      sendJson(res, 409, { error: "An account with this phone number already exists." });
      return;
    }

    const customer = {
      id: crypto.randomUUID(),
      firstname,
      lastname,
      email,
      phone,
      password,
      createdAt: new Date().toISOString()
    };

    customers.push(customer);
    writeCustomerStore(customers);

    const token = crypto.randomBytes(24).toString("hex");
    const sessions = readSessionsStore();
    sessions.customer[token] = { customerId: customer.id, createdAt: new Date().toISOString() };
    writeSessionsStore(sessions);
    sendJson(res, 201, { token, customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/login") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const customers = readCustomerStore();
    const customer = customers.find((item) => {
      if (email && phone) {
        return item.email === email && item.phone === phone && item.password === password;
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
      sendJson(res, 401, { error: "Invalid login details. Please check your email, phone number, and password." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const sessions = readSessionsStore();
    sessions.customer[token] = { customerId: customer.id, createdAt: new Date().toISOString() };
    writeSessionsStore(sessions);
    sendJson(res, 200, { token, customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/customers/session") {
    const customer = findCustomerByToken(getToken(req));
    if (!customer) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }
    sendJson(res, 200, { customer: sanitizeCustomer(customer) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/customers/logout") {
    const token = getToken(req);
    if (token) {
      const sessions = readSessionsStore();
      delete sessions.customer[token];
      writeSessionsStore(sessions);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/orders") {
    const customer = findCustomerByToken(getToken(req));
    if (!customer) {
      sendJson(res, 401, { error: "Please log in to manage orders." });
      return;
    }

    if (req.method === "GET") {
      const orders = readOrdersStore().filter((order) => getOrderOwner(order) === customer.id);
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
        customerName: String(body.customerName || `${customer.firstname} ${customer.lastname}`.trim()).trim(),
        customerEmail: String(body.customerEmail || customer.email || "").trim(),
        customerPhone: String(body.customerPhone || customer.phone || "").trim(),
        customerCity: String(body.customerCity || "").trim(),
        shippingAddress: String(body.shippingAddress || "Address not provided").trim(),
        paymentMethod: String(body.paymentMethod || "Not specified").trim(),
        createdAt: new Date().toISOString()
      };

      const orders = readOrdersStore();
      orders.push(order);
      writeOrdersStore(orders);
      sendJson(res, 201, { order });
      return;
    }
  }

  if (pathname.startsWith("/api/orders/")) {
    const customer = findCustomerByToken(getToken(req));
    if (!customer) {
      sendJson(res, 401, { error: "Please log in to manage orders." });
      return;
    }

    const parts = pathname.split("/").filter(Boolean);
    const orderId = decodeURIComponent(parts[2] || "");
    const orders = readOrdersStore();
    const orderIndex = orders.findIndex((order) => order.id === orderId && getOrderOwner(order) === customer.id);
    if (orderIndex === -1) {
      sendJson(res, 404, { error: "Order not found." });
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
      orders[orderIndex].cancellationDate = new Date().toLocaleDateString("en-IN");
      writeOrdersStore(orders);
      sendJson(res, 200, { order: orders[orderIndex] });
      return;
    }
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, mode: "node-server" });
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
  const withinAllowedFolder = targetPath.startsWith(path.join(ROOT_DIR, "data")) || targetPath.startsWith(path.join(ROOT_DIR, "netlify"));

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
    const url = new URL(req.url, `${protocol}://${req.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith("/.netlify/functions/api") || url.pathname.startsWith("/api/")) {
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
        passphrase: HTTPS_PFX_PASSPHRASE
      },
      requestHandler
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
    console.log(`HTTPS certificate not found. Generate one at ${HTTPS_PFX_FILE} to enable HTTPS locally.`);
  }
});

if (redirectServer) {
  redirectServer.listen(HTTP_REDIRECT_PORT, HOST, () => {
    console.log(`HTTP redirect active at http://${HOST}:${HTTP_REDIRECT_PORT} -> https://${HOST}:${PORT}`);
  });
}
