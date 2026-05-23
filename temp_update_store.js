const fs = require('fs');
const path = require('path');
const storePath = path.join(__dirname, 'data', 'store.json');

const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

const uploadMap = {
  1: '/api/uploads/c186347d17eaddc4a07406f4ed37c9ae.png',
  2: '/api/uploads/5fa1f4d024a6a2b2cae7bad3324d6799.png',
  3: '/api/uploads/f9ae050ead5fa13f9aa40a0834b0c637.png',
};

const colors = ['#2f77f8', '#4a148c', '#00796b', '#c2185b', '#6d4c41', '#ffa000', '#d32f2f', '#455a64', '#5d4037', '#303f9f', '#1976d2', '#388e3c'];

function escapeText(name) {
  return name
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeSvgUrl(name, bg) {
  const text = escapeText(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#ffffff">${text}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function updateProducts(products) {
  products.forEach(product => {
    const id = product.id;
    if (typeof id !== 'number') return;
    const url = uploadMap[id] || makeSvgUrl(product.name || `Product ${id}`, colors[(id - 1) % colors.length]);
    product.imageUrl = url;
    product.imageGallery = [url];
    product.image = '';
    delete product.imageData;
  });
}

if (store.defaultProducts && Array.isArray(store.defaultProducts.products)) {
  updateProducts(store.defaultProducts.products);
}
if (store.products && Array.isArray(store.products.products)) {
  updateProducts(store.products.products);
}

fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('Updated store.json with permanent image defaults.');
