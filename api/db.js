const { MongoClient } = require("mongodb");

function cleanEnvValue(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function encodeCredentialPart(value) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function normalizeMongoUri(value) {
  const cleaned = cleanEnvValue(value);

  // Strictly require mongodb(s) URI.
  if (!cleaned || !/^mongodb(\+srv)?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  // For mongodb+srv URIs, avoid complex rewriting that can break auth parts.
  // Only trim and return as-is (after cleaning quotes/whitespace).
  if (cleaned.startsWith("mongodb+srv://")) {
    return cleaned;
  }

  // For mongodb:// URIs, keep the existing credential encoding logic.
  const protocolEnd = cleaned.indexOf("://");
  if (protocolEnd === -1) return cleaned;

  const prefix = cleaned.slice(0, protocolEnd + 3);
  const rest = cleaned.slice(protocolEnd + 3);
  const hostSeparator = rest.lastIndexOf("@");
  const firstSlash = rest.search(/[/?]/);
  if (hostSeparator === -1 || (firstSlash !== -1 && hostSeparator > firstSlash)) {
    return cleaned;
  }

  const auth = rest.slice(0, hostSeparator);
  const hostAndPath = rest.slice(hostSeparator + 1);
  const colon = auth.indexOf(":");
  if (colon === -1) return cleaned;

  const username = encodeCredentialPart(auth.slice(0, colon));
  const password = encodeCredentialPart(auth.slice(colon + 1));
  return `${prefix}${username}:${password}@${hostAndPath}`;
}


let cachedClient = global._mongodbClient || null;
let cachedDb = global._mongodbDb || null;
let cachedUri = global._mongodbUri || null;
let cachedDbName = global._mongodbDbName || null;

function getUri() {
  return normalizeMongoUri(process.env.MONGODB_URI);
}

function getDbName() {
  return cleanEnvValue(process.env.MONGODB_DB) || "quickpick_store";
}

async function connect() {
  const uri = getUri();
  const dbName = getDbName();

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  if (cachedClient && cachedUri && cachedUri !== uri) {
    await cachedClient.close().catch(() => {});
    cachedClient = null;
    cachedDb = null;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    global._mongodbClient = cachedClient;
    cachedUri = uri;
    global._mongodbUri = uri;
  }

  await cachedClient.connect();

  if (!cachedDb || cachedDbName !== dbName) {
    cachedDb = cachedClient.db(dbName);
    global._mongodbDb = cachedDb;
    cachedDbName = dbName;
    global._mongodbDbName = dbName;
  }

  return cachedDb;
}

async function getCollection(name) {
  const database = await connect();
  return database.collection(name);
}

function isEnabled() {
  return Boolean(getUri());
}

module.exports = {
  connect,
  getCollection,
  isEnabled,
};
