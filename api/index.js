const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const db = require("./db");

const DB_ENABLED = db.isEnabled();
const REQUIRES_PERSISTENT_DB = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV,
);

const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const IMAGE_UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const UPLOAD_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const UPLOAD_EXTENSION_MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore() {
  ensureDataDir();

  if (!fs.existsSync(STORE_FILE)) {
    return {
      products: { products: [], updatedAt: new Date().toISOString() },
      customers: [],
      reviews: {},
      orders: [],
      sessions: { seller: {}, customer: {} },
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return {
      products: parsed.products || {
        products: [],
        updatedAt: new Date().toISOString(),
      },
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
  } catch {
    return {
      products: { products: [], updatedAt: new Date().toISOString() },
      customers: [],
      reviews: {},
      orders: [],
      sessions: { seller: {}, customer: {} },
    };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function readOrdersStore() {
  return readStore().orders;
}

function writeOrdersStore(nextOrders) {
  const store = readStore();
  store.orders = Array.isArray(nextOrders) ? nextOrders : [];
  writeStore(store);
}

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
    features: ["Noise Cancellation", "30-hour battery", "Bluetooth 5.0"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Heart Rate Monitor", "GPS", "Fitness Tracking"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["65W Power", "Fast Charging", "Compact"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    description: "Comfortable 100% cotton premium T-shirt.",
    features: ["100% Cotton", "Comfortable", "Breathable"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Water Resistant", "Warm Lining", "Multiple Pockets"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Cushioning", "Breathable", "Lightweight"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Non-Stick", "Heat Resistant", "Durable"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Stainless Steel", "Sharp Blades", "Comfortable"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Programmable", "Auto Shut-off", "Keep Warm"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    features: ["Easy to Understand", "Practical Examples", "Exercises"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    description: "Master HTML, CSS, and JavaScript.",
    features: ["Complete Coverage", "Project Based", "Code Examples"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
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
    description: "Transform your life with proven strategies.",
    features: ["Practical Tips", "Life Changing", "Motivational"],
    paymentOffers: {
      creditCard: "10% off",
      debitCard: "5% off",
      upi: "Rs.100 cashback",
      cod: "No extra fee",
    },
  },
];

let products = DEFAULT_PRODUCTS.slice();
let customers = [];
let reviews = {};
let sessions = { seller: {}, customer: {} };

// Seller credentials
const SELLER_ID = process.env.SELLER_ID || "homelycollection.829@gmail.com";
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || "@Dipshikha.8212.s";
const SELLER_NAME = process.env.SELLER_NAME || "Quickpick Store";

function getBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    if (typeof req.body === "string") {
      try {
        resolve(req.body ? JSON.parse(req.body) : {});
      } catch {
        resolve({});
      }
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
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

  if (DB_ENABLED) {
    await (
      await getCollection("product_images")
    ).insertOne({
      id,
      contentType: parsed.contentType,
      data: parsed.buffer.toString("base64"),
      createdAt: new Date().toISOString(),
    });
    return `/api/uploads/${id}`;
  }

  ensureDataDir();
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

  if (DB_ENABLED) {
    const image = await (
      await getCollection("product_images")
    ).findOne({ id: safeId });
    if (!image) {
      sendJson(res, 404, { error: "Image not found." });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", image.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(Buffer.from(image.data || "", "base64"));
    return;
  }

  const filePath = path.join(IMAGE_UPLOAD_DIR, safeId);
  if (!filePath.startsWith(IMAGE_UPLOAD_DIR) || !fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "Image not found." });
    return;
  }

  res.statusCode = 200;
  res.setHeader(
    "Content-Type",
    UPLOAD_EXTENSION_MIME_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream",
  );
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sendDatabaseUnavailable(res) {
  sendJson(res, 503, {
    error:
      "Database is not configured. Add MONGODB_URI in Vercel Environment Variables so customers, credentials, and orders can be stored.",
  });
}

function needsDatabaseResponse(res) {
  if (REQUIRES_PERSISTENT_DB && !DB_ENABLED) {
    sendDatabaseUnavailable(res);
    return true;
  }
  return false;
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  const [scheme, token] = auth.split(" ");
  return scheme === "Bearer" ? token : "";
}

function createSellerToken() {
  const payload = Buffer.from(
    JSON.stringify({
      type: "seller",
      sellerName: SELLER_NAME,
      createdAt: new Date().toISOString(),
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SELLER_PASSWORD)
    .update(payload)
    .digest("base64url");

  return `seller.${payload}.${signature}`;
}

function createCustomerToken(customer) {
  const payload = Buffer.from(
    JSON.stringify({
      type: "customer",
      customerId: customer.id,
      customer: {
        id: customer.id,
        firstname: customer.firstname,
        lastname: customer.lastname,
        email: customer.email,
        phone: customer.phone,
      },
      createdAt: new Date().toISOString(),
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SELLER_PASSWORD)
    .update(payload)
    .digest("base64url");

  return `customer.${payload}.${signature}`;
}

function sanitizeCustomer(customer) {
  if (!customer) return null;
  return {
    id: customer.id,
    firstname: customer.firstname || "",
    lastname: customer.lastname || "",
    email: customer.email || "",
    phone: customer.phone || "",
    defaultAddress: customer.defaultAddress || "",
    defaultCity: customer.defaultCity || "",
    createdAt: customer.createdAt || "",
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .pbkdf2Sync(String(password || ""), salt, 120000, 64, "sha512")
    .toString("hex");
  return { passwordHash, passwordSalt: salt };
}

function verifyCustomerPassword(customer, password) {
  if (!customer) return false;

  if (customer.passwordHash && customer.passwordSalt) {
    const { passwordHash } = hashPassword(password, customer.passwordSalt);
    const stored = Buffer.from(customer.passwordHash, "hex");
    const supplied = Buffer.from(passwordHash, "hex");
    return (
      stored.length === supplied.length &&
      crypto.timingSafeEqual(stored, supplied)
    );
  }

  return customer.password === password;
}

async function upgradeLegacyCustomerPassword(customer, password) {
  if (!customer || customer.passwordHash || !customer.password) return;

  const passwordParts = hashPassword(password);
  const update = { ...passwordParts, updatedAt: new Date().toISOString() };

  if (!DB_ENABLED) {
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index !== -1) {
      delete customers[index].password;
      Object.assign(customers[index], update);
    }
    return;
  }

  try {
    await (
      await getCollection("customers")
    ).updateOne(
      { id: customer.id },
      { $set: update, $unset: { password: "" } },
    );
  } catch (error) {
    console.error("MongoDB password upgrade fallback:", error.message);
  }
}

function verifySellerToken(token) {
  return verifySignedToken(token, "seller");
}

function verifyCustomerToken(token) {
  return verifySignedToken(token, "customer");
}

function verifySignedToken(token, type) {
  if (!token || !token.startsWith(`${type}.`)) return null;

  const [, payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", SELLER_PASSWORD)
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.type === type ? data : null;
  } catch {
    return null;
  }
}

async function ensureDb() {
  return DB_ENABLED ? db.connect() : null;
}

async function getCollection(name) {
  if (!DB_ENABLED) return null;
  const database = await ensureDb();
  return database.collection(name);
}

function getProducts() {
  const normalizeStoredProducts = (items) =>
    (items || []).map((product) => {
      const legacyImage = String(product.image || "").trim();
      const legacyImageIsUrl =
        legacyImage.startsWith("/api/uploads/") ||
        legacyImage.startsWith("data:image") ||
        /^https?:\/\//i.test(legacyImage);

      const imageUrlFromField = String(product.imageUrl || "").trim();
      const imageGalleryFromField = Array.isArray(product.imageGallery)
        ? product.imageGallery.map(String).filter(Boolean)
        : [];

      // Prefer explicit imageGallery when present, otherwise fall back to
      // imageUrl or legacy image values. This ensures that once images are
      // provided they take precedence over emoji/icon until the seller
      // intentionally clears them.
      const imageGallery = imageGalleryFromField.length
        ? imageGalleryFromField
        : imageUrlFromField
          ? [imageUrlFromField]
          : legacyImageIsUrl
            ? [legacyImage]
            : [];

      const imageUrl = imageUrlFromField || imageGallery[0] || "";

      // Resolved image should be the imageUrl when present. If no imageUrl,
      // preserve the existing emoji/icon stored in `product.image` (which
      // might be an emoji) or fall back to the box emoji.
      const resolvedImage = imageUrl || String(product.image || "📦").trim();

      return {
        ...product,
        // Ensure product always exposes normalized imageGallery and imageUrl
        // and that `image` reflects the active display value.
        imageGallery,
        imageUrl,
        image: resolvedImage,
      };
    });


  if (!DB_ENABLED) {
    const store = readStore();
    const persistedProducts = Array.isArray(store.products)
      ? store.products
      : Array.isArray(store.products?.products)
      ? store.products.products
      : products;
    return normalizeStoredProducts(persistedProducts);
  }

  try {
    const collection = await getCollection("products");
    const count = await collection.countDocuments();
    if (count === 0) {
      await collection.insertMany(products);
      return normalizeStoredProducts(products);
    }
    return normalizeStoredProducts(
      await collection.find().sort({ id: 1 }).toArray(),
    );
  } catch (error) {
    console.error("MongoDB products fallback:", error.message);
    return normalizeStoredProducts(products);
  }
}

async function findCustomerByEmail(email) {
  if (!DB_ENABLED) return customers.find((c) => c.email === email);
  try {
    return await (await getCollection("customers")).findOne({ email });
  } catch (error) {
    console.error("MongoDB customer email fallback:", error.message);
    return customers.find((c) => c.email === email);
  }
}

function getPhoneCandidates(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  return [
    ...new Set([raw, digits, digits ? `+${digits}` : ""].filter(Boolean)),
  ];
}

function phonesMatch(left, right) {
  const leftDigits = String(left || "").replace(/\D/g, "");
  const rightDigits = String(right || "").replace(/\D/g, "");
  return Boolean(
    leftDigits &&
    rightDigits &&
    (leftDigits === rightDigits ||
      leftDigits.endsWith(rightDigits) ||
      rightDigits.endsWith(leftDigits)),
  );
}

async function findCustomerByPhone(phone) {
  const candidates = getPhoneCandidates(phone);
  if (!DB_ENABLED)
    return customers.find(
      (c) => candidates.includes(c.phone) || phonesMatch(c.phone, phone),
    );
  try {
    const exact = await (
      await getCollection("customers")
    ).findOne({ phone: { $in: candidates } });
    if (exact) return exact;
    const allCustomers = await (await getCollection("customers"))
      .find({})
      .toArray();
    return allCustomers.find((c) => phonesMatch(c.phone, phone)) || null;
  } catch (error) {
    console.error("MongoDB customer phone fallback:", error.message);
    return customers.find(
      (c) => candidates.includes(c.phone) || phonesMatch(c.phone, phone),
    );
  }
}

async function authenticateCustomer({ email, phone, password }) {
  const phoneCandidates = getPhoneCandidates(phone);
  if (!DB_ENABLED) {
    const customer = customers.find((c) => {
      if (email) return c.email === email;
      if (phoneCandidates.length)
        return phoneCandidates.includes(c.phone) || phonesMatch(c.phone, phone);
      return false;
    });

    if (!verifyCustomerPassword(customer, password)) return null;
    await upgradeLegacyCustomerPassword(customer, password);
    return customer;
  }

  try {
    const collection = await getCollection("customers");
    let customer = null;

    if (email) customer = await collection.findOne({ email });
    else if (phoneCandidates.length)
      customer = await collection.findOne({ phone: { $in: phoneCandidates } });
    if (!customer && phoneCandidates.length) {
      const allCustomers = await collection.find({}).toArray();
      customer = allCustomers.find((c) => phonesMatch(c.phone, phone)) || null;
    }

    if (!verifyCustomerPassword(customer, password)) return null;
    await upgradeLegacyCustomerPassword(customer, password);
    return customer;
  } catch (error) {
    console.error("MongoDB customer login fallback:", error.message);
    const customer = customers.find((c) => {
      if (email) return c.email === email;
      if (phoneCandidates.length)
        return phoneCandidates.includes(c.phone) || phonesMatch(c.phone, phone);
      return false;
    });

    return verifyCustomerPassword(customer, password) ? customer : null;
  }
}

async function getSession(token, type) {
  if (!token) return null;

  if (type === "seller") {
    const sellerSession = verifySellerToken(token);
    if (sellerSession) return sellerSession;
  }

  if (type === "customer") {
    const customerSession = verifyCustomerToken(token);
    if (customerSession) return customerSession;
  }

  if (!DB_ENABLED) {
    const store = readStore();
    return store.sessions?.[type]?.[token] || sessions[type]?.[token] || null;
  }

  try {
    return await (await getCollection("sessions")).findOne({ token, type });
  } catch (error) {
    console.error("MongoDB session fallback:", error.message);
    return sessions[type]?.[token] || null;
  }
}

async function saveSession(type, token, data) {
  if (token.startsWith("seller.") || token.startsWith("customer.")) {
    return;
  }

  if (!DB_ENABLED) {
    const store = readStore();
    if (!store.sessions) store.sessions = { seller: {}, customer: {} };
    if (!store.sessions[type]) store.sessions[type] = {};
    store.sessions[type][token] = data;
    writeStore(store);
    sessions[type][token] = data;
    return;
  }

  try {
    const collection = await getCollection("sessions");
    await collection.updateOne(
      { token, type },
      { $set: { token, type, ...data, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
  } catch (error) {
    console.error("MongoDB save session fallback:", error.message);
    const store = readStore();
    if (!store.sessions) store.sessions = { seller: {}, customer: {} };
    if (!store.sessions[type]) store.sessions[type] = {};
    store.sessions[type][token] = data;
    writeStore(store);
    sessions[type][token] = data;
  }
}

async function deleteSession(token, type) {
  if (!DB_ENABLED) {
    const store = readStore();
    if (store.sessions?.[type]?.[token]) delete store.sessions[type][token];
    writeStore(store);
    if (sessions[type] && sessions[type][token]) delete sessions[type][token];
    return;
  }

  await (await getCollection("sessions")).deleteOne({ token, type });
}

async function createCustomer(customer) {
  if (!DB_ENABLED) {
    customers.push(customer);
    const store = readStore();
    store.customers = store.customers || [];
    store.customers.push(customer);
    writeStore(store);
    return customer;
  }

  try {
    await (await getCollection("customers")).insertOne(customer);
  } catch (error) {
    console.error("MongoDB create customer fallback:", error.message);
    customers.push(customer);
    const store = readStore();
    store.customers = store.customers || [];
    store.customers.push(customer);
    writeStore(store);
  }
  return customer;
}

async function createOrder(order) {
  if (!DB_ENABLED) {
    const current = readOrdersStore();
    current.push(order);
    writeOrdersStore(current);
    return order;
  }

  try {
    await (await getCollection("orders")).insertOne(order);
  } catch (error) {
    console.error("MongoDB create order fallback:", error.message);
    orders.push(order);
    const current = readOrdersStore();
    current.push(order);
    writeOrdersStore(current);
  }
  return order;
}

async function updateCustomerProfile(customerId, profile) {
  const update = { ...profile, updatedAt: new Date().toISOString() };

  if (!DB_ENABLED) {
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...update };
      const store = readStore();
      store.customers = store.customers || [];
      const cidx = store.customers.findIndex((c) => c.id === customerId);
      if (cidx !== -1)
        store.customers[cidx] = { ...store.customers[cidx], ...update };
      writeStore(store);
      return customers[idx];
    }
    return null;
  }

  try {
    await (
      await getCollection("customers")
    ).updateOne({ id: customerId }, { $set: update });
    return await (await getCollection("customers")).findOne({ id: customerId });
  } catch (error) {
    console.error("MongoDB update customer fallback:", error.message);
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...update };
      const store = readStore();
      store.customers = store.customers || [];
      const cidx = store.customers.findIndex((c) => c.id === customerId);
      if (cidx !== -1)
        store.customers[cidx] = { ...store.customers[cidx], ...update };
      writeStore(store);
      return customers[idx];
    }
    return null;
  }
}

async function createProduct(product) {
  if (!DB_ENABLED) {
    products.push(product);
    const store = readStore();
    store.products = store.products || {
      products: [],
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(store.products.products)) store.products.products = [];
    store.products.products.push(product);
    store.products.updatedAt = new Date().toISOString();
    writeStore(store);
    return product;
  }

  try {
    await (await getCollection("products")).insertOne(product);
  } catch (error) {
    console.error("MongoDB create product fallback:", error.message);
    products.push(product);
    const store = readStore();
    store.products = store.products || {
      products: [],
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(store.products.products)) store.products.products = [];
    store.products.products.push(product);
    store.products.updatedAt = new Date().toISOString();
    writeStore(store);
  }
  return product;
}

async function persistProductImageIfNeeded(product, existingProduct = {}) {
  const input = { ...(product || {}) };

  if (typeof input.imageData === "string" && input.imageData.trim()) {
    const imageUrl = await saveUploadedProductImage(input.imageData);
    input.imageUrl = imageUrl;
    input.imageGallery =
      Array.isArray(input.imageGallery) && input.imageGallery.length > 0
        ? input.imageGallery
        : [imageUrl];
    input.image = imageUrl;
    delete input.imageData;
  }

  if (
    input.imageUrl &&
    (!Array.isArray(input.imageGallery) || input.imageGallery.length === 0)
  ) {
    input.imageGallery = [input.imageUrl];
  }

  if (
    !input.imageUrl &&
    Array.isArray(input.imageGallery) &&
    input.imageGallery.length > 0
  ) {
    input.imageUrl = input.imageGallery[0];
  }

  if (input.imageUrl) {
    input.image = input.imageUrl;
  }

  return input;
}

function normalizeProductPayload(product, existingProduct = {}) {
  const normalized = {
    ...existingProduct,
    ...product,
    name: String(product.name || existingProduct.name || "").trim(),
    category: String(product.category || existingProduct.category || "").trim(),
    price: Number.parseInt(product.price ?? existingProduct.price, 10),
    originalPrice: Number.parseInt(
      product.originalPrice ?? existingProduct.originalPrice,
      10,
    ),
    stock: String(product.stock || existingProduct.stock || "In Stock").trim(),
    // Decide image fields carefully:
    // - If the incoming payload explicitly provides `imageGallery` or
    //   `imageUrl`, treat that as the seller's intent (even if empty) and
    //   do not fall back to existing values.
    imageGallery: Array.isArray(product.imageGallery)
      ? product.imageGallery.map(String)
      : existingProduct.imageGallery || [],
    imageUrl: String(
      // prefer explicitly provided imageUrl, otherwise prefer existing
      // imageUrl only when caller didn't explicitly send imageUrl.
      product.hasOwnProperty("imageUrl")
        ? product.imageUrl
        : existingProduct.imageUrl || "",
    ).trim(),
    image: String(
      // Resolution order:
      // 1. If caller provided imageUrl (even empty), prefer that or gallery.
      // 2. If caller provided imageGallery (even empty), prefer its first item.
      // 3. If caller provided image (emoji/icon), prefer that.
      // 4. Otherwise, keep existing product images/icons.
      (() => {
        if (product.hasOwnProperty("imageUrl") && String(product.imageUrl || "").trim()) {
          return product.imageUrl;
        }
        if (product.hasOwnProperty("imageGallery") && Array.isArray(product.imageGallery) && product.imageGallery.length > 0) {
          return product.imageGallery[0];
        }
        if (product.hasOwnProperty("image") && String(product.image || "").trim()) {
          return product.image;
        }
        // No explicit image fields provided in payload — preserve existing
        // imageUrl/gallery if present.
        if (existingProduct.imageUrl) return existingProduct.imageUrl;
        if (Array.isArray(existingProduct.imageGallery) && existingProduct.imageGallery.length > 0) return existingProduct.imageGallery[0];
        return "📦";
      })(),
    ).trim(),
    description: String(
      product.description || existingProduct.description || "",
    ).trim(),
    features: Array.isArray(product.features)
      ? product.features.map(String)
      : existingProduct.features || [],
    specs: Array.isArray(product.specs)
      ? product.specs
      : existingProduct.specs || [],
    paymentOffers: product.paymentOffers || existingProduct.paymentOffers || {},
    rating: Number.isFinite(Number(existingProduct.rating))
      ? Number(existingProduct.rating)
      : 0,
    reviews: Number.isFinite(Number(existingProduct.reviews))
      ? Number(existingProduct.reviews)
      : 0,
    updatedAt: new Date().toISOString(),
  };

  if (!normalized.imageUrl && normalized.imageGallery.length > 0) {
    normalized.imageUrl = normalized.imageGallery[0];
  }

  if (normalized.imageUrl && normalized.imageGallery.length === 0) {
    normalized.imageGallery = [normalized.imageUrl];
  }

  if (normalized.imageUrl) {
    normalized.image = normalized.imageUrl;
  }

  if (!normalized.image && !normalized.imageUrl) {
    normalized.image = "📦";
  }

  return normalized;
}

async function updateProduct(productId, product) {
  if (!DB_ENABLED) {
    const index = products.findIndex(
      (item) => String(item.id) === String(productId),
    );
    if (index === -1) return null;
    products[index] = normalizeProductPayload(product, products[index]);
    products[index].id = productId;

    const store = readStore();
    store.products = store.products || {
      products: [],
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(store.products.products)) store.products.products = [];
    const pidx = store.products.products.findIndex(
      (p) => String(p.id) === String(productId),
    );
    if (pidx !== -1) store.products.products[pidx] = products[index];
    store.products.updatedAt = new Date().toISOString();
    writeStore(store);

    return products[index];
  }

  try {
    const collection = await getCollection("products");
    const existing = await collection.findOne({ id: productId });
    if (!existing) return null;

    const updatedProduct = normalizeProductPayload(product, existing);
    updatedProduct.id = existing.id;
    delete updatedProduct._id;

    await collection.updateOne({ id: productId }, { $set: updatedProduct });
    return updatedProduct;
  } catch (error) {
    console.error("MongoDB update product fallback:", error.message);
    const index = products.findIndex(
      (item) => String(item.id) === String(productId),
    );
    if (index === -1) return null;
    products[index] = normalizeProductPayload(product, products[index]);
    products[index].id = productId;
    const store = readStore();
    store.products = store.products || {
      products: [],
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(store.products.products)) store.products.products = [];
    const pidx = store.products.products.findIndex(
      (p) => String(p.id) === String(productId),
    );
    if (pidx !== -1) store.products.products[pidx] = products[index];
    store.products.updatedAt = new Date().toISOString();
    writeStore(store);
    return products[index];
  }
}

async function deleteProduct(productId) {
  if (!DB_ENABLED) {
    const prev = products.length;
    products = products.filter((item) => String(item.id) !== String(productId));

    const store = readStore();
    store.products = store.products || {
      products: [],
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(store.products.products)) store.products.products = [];
    store.products.products = store.products.products.filter(
      (item) => String(item.id) !== String(productId),
    );
    store.products.updatedAt = new Date().toISOString();
    writeStore(store);

    return products.length !== prev;
  }

  try {
    const result = await (
      await getCollection("products")
    ).deleteOne({ id: productId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("MongoDB delete product fallback:", error.message);
    const prev = products.length;
    products = products.filter((item) => String(item.id) !== String(productId));
    return products.length !== prev;
  }
}

async function getOrders() {
  if (!DB_ENABLED) return readOrdersStore();

  try {
    return await (await getCollection("orders"))
      .find()
      .sort({ createdAt: -1 })
      .toArray();
  } catch (error) {
    console.error("MongoDB orders fallback:", error.message);
    return [];
  }
}

function getOrderOwner(order) {
  return order.customerId || order.customerEmail || order.customerPhone || "";
}

async function getReviews(productId) {
  if (!DB_ENABLED) {
    return productId ? reviews[productId] || [] : Object.values(reviews).flat();
  }
  try {
    const collection = await getCollection("reviews");
    return productId
      ? await collection.find({ productId }).toArray()
      : await collection.find().toArray();
  } catch (error) {
    console.error("MongoDB reviews fallback:", error.message);
    return productId ? reviews[productId] || [] : Object.values(reviews).flat();
  }
}

async function saveReview(productId, review) {
  if (!DB_ENABLED) {
    if (!reviews[productId]) reviews[productId] = [];
    reviews[productId].push(review);

    const store = readStore();
    store.reviews = store.reviews || {};
    store.reviews[productId] = store.reviews[productId] || [];
    store.reviews[productId].push(review);
    writeStore(store);

    return review;
  }

  await (await getCollection("reviews")).insertOne({ productId, ...review });
  return review;
}

async function getSellerProducts() {
  return await getProducts();
}

async function getAdminData() {
  if (!DB_ENABLED) {
    const store = readStore();
    return {
      products: store.products?.products || products,
      customers: store.customers || customers,
      orders: readOrdersStore(),
      reviews: store.reviews || reviews,
      sessions: store.sessions || sessions,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    products: await getProducts(),
    customers: await (await getCollection("customers")).find().toArray(),
    orders: await getOrders(),
    reviews: await getReviews(),
    sessions: await (await getCollection("sessions")).find().toArray(),
    timestamp: new Date().toISOString(),
  };
}

async function getNextIdForProducts() {
  if (!DB_ENABLED) return products.length + 1;
  const collection = await getCollection("products");
  const latest = await collection.find().sort({ id: -1 }).limit(1).next();
  return latest ? latest.id + 1 : 1;
}

module.exports = async (req, res) => {
  const url = req.url || "";
  const method = req.method || "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const body = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ? await getBody(req)
    : {};

  if (url.startsWith("/api/uploads/") && method === "GET") {
    await sendUploadedProductImage(res, url.split("/").pop());
    return;
  }

  if (
    (url === "/api/seller/uploads" || url === "/api/seller/upload-image") &&
    method === "POST"
  ) {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    if (!(await getSession(token, "seller"))) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    try {
      const imageUrl = await saveUploadedProductImage(body.imageData);
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ url: imageUrl }));
    } catch (error) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: error.message || "Unable to save image." }),
      );
    }
    return;
  }

  if (url === "/api/products" && method === "GET") {
    const allProducts = await getProducts();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        products: allProducts,
        updatedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  if (url === "/api/customers/register" && method === "POST") {
    if (needsDatabaseResponse(res)) return;

    const firstname = String(body.firstname || "").trim();
    const lastname = String(body.lastname || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    if (!firstname || !lastname || !password || (!email && !phone)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Name, password, and email or phone required",
        }),
      );
      return;
    }

    const existingByEmail = email ? await findCustomerByEmail(email) : null;
    const existingByPhone = !email && phone ? await findCustomerByPhone(phone) : null;

    // Only enforce email<->phone cross-account conflict when both are provided.
    if (
      existingByEmail &&
      existingByPhone &&
      existingByEmail.id !== existingByPhone.id
    ) {
      res.statusCode = 409;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error:
            "Email and phone are already linked to different accounts. Please log in with the correct account.",
        }),
      );
      return;
    }

    // If email is provided, use email as the source of truth for whether this is an existing account.
    // Phone-based fuzzy matching can otherwise cause incorrect reuse and prevent creating a new customer.
    const existingCustomer = email ? existingByEmail : existingByPhone;

    if (existingCustomer) {

      if (!verifyCustomerPassword(existingCustomer, password)) {
        res.statusCode = 409;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "An account already exists. Please log in with the saved password.",
          }),
        );
        return;
      }

      await upgradeLegacyCustomerPassword(existingCustomer, password);
      const profileUpdate = {
        firstname: firstname || existingCustomer.firstname || "",
        lastname: lastname || existingCustomer.lastname || "",
        email: email || existingCustomer.email || "",
        phone: phone || existingCustomer.phone || "",
      };
      const refreshed =
        (await updateCustomerProfile(existingCustomer.id, profileUpdate)) ||
        existingCustomer;
      const token = createCustomerToken(refreshed);
      await saveSession("customer", token, {
        customerId: refreshed.id,
        createdAt: new Date().toISOString(),
      });

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ token, customer: sanitizeCustomer(refreshed) }));
      return;
    }

    const passwordParts = hashPassword(password);
    const customer = {
      id: crypto.randomUUID(),
      firstname,
      lastname,
      email,
      phone,
      ...passwordParts,
      defaultAddress: "",
      defaultCity: "",
      createdAt: new Date().toISOString(),
    };

    await createCustomer(customer);

    const token = createCustomerToken(customer);
    await saveSession("customer", token, {
      customerId: customer.id,
      createdAt: new Date().toISOString(),
    });

    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ token, customer: sanitizeCustomer(customer) }));
    return;

  }

  if (url === "/api/customers/login" && method === "POST") {
    if (needsDatabaseResponse(res)) return;

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    const customer = await authenticateCustomer({ email, phone, password });

    if (!customer) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid login details" }));
      return;
    }

    const token = createCustomerToken(customer);
    await saveSession("customer", token, {
      customerId: customer.id,
      createdAt: new Date().toISOString(),
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ token, customer: sanitizeCustomer(customer) }));
    return;
  }

  if (url === "/api/customers/session" && method === "GET") {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    const session = await getSession(token, "customer");
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    let customer = null;
    if (DB_ENABLED) {
      try {
        customer = await (
          await getCollection("customers")
        ).findOne({ id: session.customerId });
      } catch {
        customer = customers.find((c) => c.id === session.customerId) || null;
      }
    } else {
      const store = readStore();
      customer =
        (store.customers || []).find((c) => c.id === session.customerId) ||
        session.customer ||
        null;
    }

    if (!customer) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Customer not found" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ customer: sanitizeCustomer(customer) }));
    return;
  }

  if (url === "/api/customers/logout" && method === "POST") {
    const token = getToken(req);
    await deleteSession(token, "customer");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url === "/api/orders" && method === "GET") {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    const session = await getSession(token, "customer");
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please log in" }));
      return;
    }

    const allOrders = await getOrders();
    const customerOrders = allOrders.filter(
      (o) => o.customerId === session.customerId,
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ orders: customerOrders }));
    return;
  }

  if (url === "/api/orders" && method === "POST") {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    const session = await getSession(token, "customer");
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please log in" }));
      return;
    }

    const {
      items,
      total,
      customerName,
      customerEmail,
      customerPhone,
      customerCity,
      shippingAddress,
      paymentMethod,
    } = body;
    if (!items || items.length === 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Cart is empty" }));
      return;
    }

    const order = {
      id: `#ORD${Math.random().toString(9).slice(2, 10)}`,
      date: new Date().toLocaleDateString("en-IN"),
      items,
      total,
      customerName,
      customerEmail,
      customerPhone,
      customerCity,
      shippingAddress,
      paymentMethod,
      status: "pending",
      customerId: session.customerId,
      createdAt: new Date().toISOString(),
    };

    await createOrder(order);

    const profileUpdate = {};
    if (shippingAddress)
      profileUpdate.defaultAddress = String(shippingAddress).trim();
    if (customerCity) profileUpdate.defaultCity = String(customerCity).trim();
    if (customerEmail)
      profileUpdate.email = String(customerEmail).trim().toLowerCase();
    if (customerPhone) profileUpdate.phone = String(customerPhone).trim();
    if (Object.keys(profileUpdate).length > 0) {
      await updateCustomerProfile(session.customerId, profileUpdate);
    }

    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ order }));
    return;
  }

  if (url.startsWith("/api/orders/")) {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    const session = await getSession(token, "customer");
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Please log in" }));
      return;
    }

    const parts = url.split("/").filter(Boolean);
    const orderId = decodeURIComponent(parts[2] || "");

    const allOrders = await getOrders();
    const orderIndex = allOrders.findIndex(
      (order) =>
        order.id === orderId && getOrderOwner(order) === session.customerId,
    );

    if (orderIndex === -1) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Order not found" }));
      return;
    }

    if (method === "GET" && parts.length === 3) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ order: allOrders[orderIndex] }));
      return;
    }

    if (method === "POST" && parts[3] === "cancel") {
      const reason = String(body.reason || "").trim();
      const update = {
        status: "cancelled",
        cancellationReason: reason,
        cancellationDate: new Date().toLocaleDateString("en-IN"),
        updatedAt: new Date().toISOString(),
      };

      if (DB_ENABLED) {
        try {
          await (
            await getCollection("orders")
          ).updateOne(
            { id: orderId, customerId: session.customerId },
            { $set: update },
          );
        } catch (error) {
          console.error("MongoDB cancel order fallback:", error.message);
          Object.assign(allOrders[orderIndex], update);
        }
      } else {
        const current = readOrdersStore();
        const idx = current.findIndex(
          (o) => o.id === orderId && getOrderOwner(o) === session.customerId,
        );
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...update };
          writeOrdersStore(current);
          allOrders[orderIndex] = current[idx];
        } else {
          Object.assign(allOrders[orderIndex], update);
        }
      }

      const updatedOrder = { ...allOrders[orderIndex], ...update };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ order: updatedOrder }));
      return;
    }
  }

  if (url === "/api/seller/login" && method === "POST") {
    const { sellerId, password } = body;
    if (sellerId !== SELLER_ID || password !== SELLER_PASSWORD) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid seller ID or password" }));
      return;
    }

    const token = createSellerToken();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ token, sellerName: SELLER_NAME }));
    return;
  }

  if (url === "/api/seller/session" && method === "GET") {
    const token = getToken(req);
    const session = await getSession(token, "seller");
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ sellerName: session.sellerName || SELLER_NAME }));
    return;
  }

  if (url === "/api/seller/logout" && method === "POST") {
    const token = getToken(req);
    await deleteSession(token, "seller");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url === "/api/seller/products" && method === "GET") {
    const token = getToken(req);
    if (!(await getSession(token, "seller"))) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    const allProducts = await getSellerProducts();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        products: allProducts,
        updatedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  if (url === "/api/seller/products" && method === "POST") {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    if (!(await getSession(token, "seller"))) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    const { name, category, price, originalPrice } = body;
    if (!name || !category || !price || !originalPrice) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Name, category, price, and original price required",
        }),
      );
      return;
    }

    const persistedBody = await persistProductImageIfNeeded(body);
    const newProduct = {
      ...normalizeProductPayload(persistedBody),
      id: await getNextIdForProducts(),
      rating: 0,
      reviews: 0,
      createdAt: new Date().toISOString(),
    };

    await createProduct(newProduct);

    const allProducts = await getSellerProducts();
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        products: allProducts,
        updatedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  if (
    url.startsWith("/api/seller/products/") &&
    (method === "PUT" || method === "DELETE")
  ) {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    if (!(await getSession(token, "seller"))) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    const productId = Number.parseInt(url.split("/").pop(), 10);
    if (!Number.isFinite(productId)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid product ID" }));
      return;
    }

    if (method === "PUT") {
      const existingProducts = await getSellerProducts();
      const existingProduct =
        existingProducts.find(
          (product) => String(product.id) === String(productId),
        ) || {};
      const persistedBody = await persistProductImageIfNeeded(
        body,
        existingProduct,
      );
      const updatedProduct = await updateProduct(productId, persistedBody);
      if (!updatedProduct) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Product not found" }));
        return;
      }
    } else {
      const deleted = await deleteProduct(productId);
      if (!deleted) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Product not found" }));
        return;
      }
    }

    const allProducts = await getSellerProducts();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        products: allProducts,
        updatedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  if (url === "/api/seller/orders" && method === "GET") {
    if (needsDatabaseResponse(res)) return;

    const token = getToken(req);
    if (!(await getSession(token, "seller"))) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    const allOrders = await getOrders();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ orders: allOrders }));
    return;
  }

  if (url.startsWith("/api/reviews") && method === "GET") {
    const productId = url.split("?")[1]?.split("=")[1];
    const productReviews = await getReviews(productId);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reviews: productReviews }));
    return;
  }

  if (url === "/api/reviews" && method === "POST") {
    if (needsDatabaseResponse(res)) return;

    const { productId, rating, text } = body;
    if (!productId || !rating || !text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Product ID, rating, and review text required",
        }),
      );
      return;
    }

    const token = getToken(req);
    const session = await getSession(token, "customer");
    const author = session ? "Customer" : "Guest";

    const review = {
      id: Date.now(),
      rating,
      text,
      author,
      date: new Date().toLocaleDateString("en-IN"),
      createdAt: new Date().toISOString(),
    };
    await saveReview(productId, review);

    const productReviews = await getReviews(productId);
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reviews: productReviews }));
    return;
  }

  if (url === "/api/admin/data" && method === "GET") {
    const data = await getAdminData();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return;
  }

  if (url === "/api/health") {
    const productCount = (await getProducts()).length;
    const store = readStore();

    let customerCount = (store.customers || []).length;
    let orderCount = readOrdersStore().length;

    if (DB_ENABLED) {
      try {
        customerCount = await (
          await getCollection("customers")
        ).countDocuments();
        orderCount = await (await getCollection("orders")).countDocuments();
      } catch (error) {
        console.error("MongoDB health fallback:", error.message);
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        mode: DB_ENABLED ? "vercel-mongodb" : "vercel-inmemory",
        customers: customerCount,
        orders: orderCount,
        products: productCount,
        dbEnabled: DB_ENABLED,
        databaseConfigured: DB_ENABLED,
        persistentStorageRequired: REQUIRES_PERSISTENT_DB,
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found" }));
};
