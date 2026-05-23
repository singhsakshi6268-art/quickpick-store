import json
import urllib.parse

path = r'c:\Users\Deepshikha\Pictures\CODING\data\store.json'
with open(path, 'r', encoding='utf-8') as f:
    store = json.load(f)

upload_map = {
    1: '/api/uploads/c186347d17eaddc4a07406f4ed37c9ae.png',
    2: '/api/uploads/5fa1f4d024a6a2b2cae7bad3324d6799.png',
    3: '/api/uploads/f9ae050ead5fa13f9aa40a0834b0c637.png',
}

colors = [
    '#2f77f8',
    '#4a148c',
    '#00796b',
    '#c2185b',
    '#6d4c41',
    '#ffa000',
    '#d32f2f',
    '#455a64',
    '#5d4037',
    '#303f9f',
    '#1976d2',
    '#388e3c',
]


def make_svg_url(name, bg):
    text = (
        name.replace('&', '&amp;')
        .replace("'", '&#39;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">'
        f'<rect width="100%" height="100%" fill="{bg}"/>'
        f'<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" '
        f'font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#ffffff">'
        f'{text}</text></svg>'
    )
    return 'data:image/svg+xml,' + urllib.parse.quote(svg, safe='')


def update_products(arr):
    for prod in arr:
        pid = prod.get('id')
        if not isinstance(pid, int):
            continue
        if pid in upload_map:
            url = upload_map[pid]
        else:
            name = prod.get('name', f'Product {pid}')
            url = make_svg_url(name, colors[(pid - 1) % len(colors)])
        prod['imageUrl'] = url
        prod['imageGallery'] = [url]
        prod['image'] = ''
        prod.pop('imageData', None)

update_products(store.get('defaultProducts', {}).get('products', []))
update_products(store.get('products', {}).get('products', []))

with open(path, 'w', encoding='utf-8') as f:
    json.dump(store, f, indent=2)

print('Completed store.json update')
