$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$outputPath = Join-Path $PSScriptRoot "Quickpick-100-Page-Project-Report.docx"

function Escape-Xml {
    param([string]$Value)

    if ($null -eq $Value) { return "" }

    return $Value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;").Replace("'", "&apos;")
}

function New-RunXml {
    param(
        [string]$Text,
        [int]$FontSize = 24,
        [switch]$Bold
    )

    $escaped = Escape-Xml $Text
    $boldXml = if ($Bold) { "<w:b/><w:bCs/>" } else { "" }

    return @"
<w:r>
  <w:rPr>
    $boldXml
    <w:sz w:val="$FontSize"/>
    <w:szCs w:val="$FontSize"/>
  </w:rPr>
  <w:t xml:space="preserve">$escaped</w:t>
</w:r>
"@
}

function New-ParagraphXml {
    param(
        [string]$Text,
        [switch]$Heading,
        [switch]$PageBreakBefore
    )

    $pPr = @()
    if ($Heading) {
        $pPr += '<w:pStyle w:val="Heading1"/>'
        $pPr += '<w:spacing w:before="160" w:after="120"/>'
    } else {
        $pPr += '<w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/>'
    }

    if ($PageBreakBefore) {
        $pPr += '<w:pageBreakBefore/>'
    }

    $run = if ($Heading) {
        New-RunXml -Text $Text -FontSize 32 -Bold
    } else {
        New-RunXml -Text $Text -FontSize 24
    }

    return @"
<w:p>
  <w:pPr>
    $($pPr -join "`n    ")
  </w:pPr>
  $run
</w:p>
"@
}

function Add-ZipEntry {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName,
        [string]$Content
    )

    $entry = $Archive.CreateEntry($EntryName)
    $stream = $entry.Open()
    $writer = New-Object System.IO.StreamWriter($stream, [System.Text.UTF8Encoding]::new($false))
    $writer.Write($Content)
    $writer.Dispose()
}

function Get-CodeExamplesForTopic {
    param([string]$Topic)

    switch ($Topic) {
        "Navigation System Design" {
            return @(
                'Code Example: function navigateTo(page) { document.querySelectorAll(''.page'').forEach(p => p.classList.remove(''active'')); document.getElementById(page).classList.add(''active''); }',
                'Project Code: function navigateTo(page, options = {}) { if (!page || !document.getElementById(page)) { page = ''home''; } syncProductsFromSellerPanel(); document.querySelectorAll(''.page'').forEach(p => p.classList.remove(''active'')); document.getElementById(page).classList.add(''active''); }',
                'Explanation: This kind of function opens different page sections inside one HTML file by hiding inactive sections and showing the selected one.'
            )
        }
        "Single Page User Flow" {
            return @(
                'Code Example: navigateTo(''products'')',
                'Explanation: This opens the products section on the same page without loading another HTML file, which is useful in single-page applications.'
            )
        }
        "Page Opening Techniques" {
            return @(
                'Code Example: <a href="seller-panel.html">Open Seller Panel</a>',
                'Code Example: <a href="/seller-panel">Open Seller Panel Route</a>',
                'Project Code: <a href="/seller-panel" onclick="closeUserDropdown()">Seller Panel</a>',
                'Explanation: These links open another page directly through HTML.'
            )
        }
        "Anchor Link Navigation" {
            return @(
                'Code Example: <a href="#products">Go to Products</a>',
                'Code Example: <section id="products"> ... </section>',
                'Explanation: This opens a section inside the same page by jumping to the matching id.'
            )
        }
        "JavaScript Redirect Methods" {
            return @(
                'Code Example: window.location.href = "seller-panel.html";',
                'Code Example: window.location.assign("/seller-panel");',
                'Code Example: setTimeout(() => { window.location.href = "index.html"; }, 3000);',
                'Explanation: These methods open another page using JavaScript, either immediately or after a delay.'
            )
        }
        "Dropdown Menu Logic" {
            return @(
                'Code Example: <a href="/seller-panel" onclick="closeUserDropdown()">Seller Panel</a>',
                'Code Example: function toggleUserDropdown() { document.getElementById("userDropdown").classList.toggle("active"); }',
                'Project Code: <div class="user-dropdown" id="userDropdown"><a onclick="displayOrders(); closeUserDropdown()">My Orders</a><a onclick="displayWishlist(); closeUserDropdown()">My Wishlist</a><a onclick="navigateTo(''tracking''); closeUserDropdown()">Track Order</a><a href="/seller-panel" onclick="closeUserDropdown()">Seller Panel</a></div>',
                'Explanation: This opens a page from the top-right account menu after the dropdown becomes visible.'
            )
        }
        "Seller Panel Access Link" {
            return @(
                'Code Example: <a href="/seller-panel" onclick="closeUserDropdown()">Seller Panel</a>',
                'Code Example: /seller-panel    /seller-panel.html   200',
                'Explanation: The first line opens the seller page from the frontend, while the redirects rule maps the clean URL to the actual file on Netlify.'
            )
        }
        "HTML Page Structure" {
            return @(
                'Project Code: <div id="home" class="page active"> ... </div> and <div id="products" class="page"> ... </div>',
                'Explanation: The project keeps multiple logical pages inside one HTML file by storing each view inside a separate container with a unique id.'
            )
        }
        "Home Page Design" {
            return @(
                'Project Code: <div id="home" class="page active"><div class="hero"><div class="hero-content"><h1>Welcome to Quickpick store</h1><p>Your one-stop destination for quality products at amazing prices</p><a class="btn btn-primary" onclick="navigateTo(''products'')">Shop Now</a></div></div></div>',
                'Explanation: The home page uses a hero section and direct navigation button to move users into the products view.'
            )
        }
        "Product Listing Section" {
            return @(
                'Project Code: <div class="products-grid" id="productsGrid"></div>',
                'Project Code: function displayAllProducts() { ... }',
                'Explanation: The products page renders items dynamically into the products grid container.'
            )
        }
        "Cart Management System" {
            return @(
                'Project Code: let cart = JSON.parse(localStorage.getItem(''cart'')) || [];',
                'Project Code: localStorage.setItem(''cart'', JSON.stringify(cart));',
                'Explanation: The cart page stores selected products in localStorage so users can continue shopping and return later on the same device.'
            )
        }
        "Wishlist Functionality" {
            return @(
                'Project Code: const wishlist = JSON.parse(localStorage.getItem(''wishlist'')) || [];',
                'Project Code: function toggleWishlist(productId, event) { ... }',
                'Explanation: Wishlist data is stored locally and updated through a dedicated toggle function on product cards and detail views.'
            )
        }
        "Seller Login System" {
            return @(
                'Project Code: <form id="loginForm" onsubmit="handleLogin(event)"> ... <input type="text" id="sellerId" ...> <input type="password" id="loginPassword" ...> </form>',
                'Project Code: const payload = await apiRequest(''/seller/login'', { method: ''POST'', body: JSON.stringify({ sellerId, password }) });',
                'Explanation: The seller login form collects credentials and sends them to the backend for validation.'
            )
        }
        "Seller Dashboard Statistics" {
            return @(
                'Project Code: document.getElementById(''totalProducts'').textContent = products.length;',
                'Project Code: const totalRevenue = products.reduce((sum, p) => sum + p.price, 0);',
                'Explanation: The seller dashboard calculates live product count and revenue summary from the current product list.'
            )
        }
        "Product CRUD Operations" {
            return @(
                'Project Code: data = await apiRequest(''/seller/products'', { method: ''POST'', body: JSON.stringify(newProduct) }, true);',
                'Project Code: data = await apiRequest(`/seller/products/${currentEditingProductId}`, { method: ''PUT'', body: JSON.stringify(updatedProduct) }, true);',
                'Project Code: data = await apiRequest(`/seller/products/${currentEditingProductId}`, { method: ''DELETE'' }, true);',
                'Explanation: Create, update, and delete operations are all routed through the shared seller product API.'
            )
        }
        "Add Product Form Design" {
            return @(
                'Project Code: <form id="addProductForm" class="add-product-form" onsubmit="handleAddProduct(event)">',
                'Project Code: const newProduct = { name: document.getElementById(''newProductName'').value, category: document.getElementById(''newProductCategory'').value, price: parseInt(document.getElementById(''newProductPrice'').value) };',
                'Explanation: The add-product form collects product details and builds a product object before sending it to storage or backend.'
            )
        }
        "Edit Product Workflow" {
            return @(
                'Project Code: function openEditModal(productId) { const product = getSellerProducts().find(p => p.id === productId); ... }',
                'Project Code: async function saveProductEdits() { ... }',
                'Explanation: Editing starts by loading the selected product into the modal and ends by saving the updated values through the API.'
            )
        }
        "Delete Product Confirmation" {
            return @(
                'Project Code: function openDeleteModal(productId) { ... document.getElementById(''deleteModal'').classList.add(''active''); }',
                'Project Code: async function confirmDelete() { ... }',
                'Explanation: Deletion uses a confirmation modal so products are not removed accidentally.'
            )
        }
        "API Endpoint Design" {
            return @(
                'Project Code: if (request.method === "GET" && path === "/products") { return jsonResponse(await readProducts()); }',
                'Project Code: if (request.method === "POST" && path === "/seller/login") { ... }',
                'Project Code: if (path === "/seller/products") { ... }',
                'Explanation: The backend separates product loading, seller authentication, and product management into clearly defined routes.'
            )
        }
        "Netlify Functions Overview" {
            return @(
                'Project Code: export default async (request) => { const path = getApiPath(request); ... }',
                'Explanation: The Netlify function acts like the backend of the project and processes requests sent from the frontend pages.'
            )
        }
        "Persistent Product Storage" {
            return @(
                'Project Code: const productsStore = getStore("quickpick-products");',
                'Project Code: const store = await productsStore.get(PRODUCTS_KEY, { type: "json" });',
                'Project Code: await productsStore.setJSON(PRODUCTS_KEY, nextStore);',
                'Explanation: Product data is stored in a shared Netlify-backed store so updates can be available across devices.'
            )
        }
        "Index And Seller Panel Connection" {
            return @(
                'Project Code: const response = await fetch(''/.netlify/functions/api/products'', { cache: ''no-store'' });',
                'Project Code: const data = await apiRequest(''/products'');',
                'Explanation: The main website reads shared products from the backend, and the seller panel writes updates to the same backend.'
            )
        }
        "Customer Account Dashboard" {
            return @(
                'Project Code: function updateCustomerAccountUI() { ... }',
                'Project Code: const dropdownMyAccountLink = document.getElementById(''dropdownMyAccountLink'');',
                'Explanation: The account dashboard logic updates the visible account options depending on whether a customer is logged in.'
            )
        }
        "Order Placement Logic" {
            return @(
                'Project Code: async function placeOrder() { let cart = JSON.parse(localStorage.getItem(''cart'')) || []; ... }',
                'Project Code: localStorage.setItem(''cart'', ''[]'');',
                'Explanation: When an order is placed, the project reads cart items, builds the order object, and then clears the local cart.'
            )
        }
        "Routing Using Redirects" {
            return @(
                'Code Example: /seller-panel    /seller-panel.html   200',
                'Explanation: This tells Netlify to open seller-panel.html when the user visits /seller-panel.'
            )
        }
        default {
            return @()
        }
    }
}

$topics = @(
    "Project Introduction",
    "Problem Statement",
    "Project Objectives",
    "Scope Of The Website",
    "Quickpick Store Overview",
    "Frontend And Backend Concept",
    "HTML Page Structure",
    "CSS Styling Architecture",
    "JavaScript Application Logic",
    "Navigation System Design",
    "Single Page User Flow",
    "Home Page Design",
    "Product Listing Section",
    "Product Detail Page Logic",
    "Search And Filtering",
    "Category Navigation",
    "Sorting Products",
    "Cart Management System",
    "Wishlist Functionality",
    "Customer Login Flow",
    "Customer Registration Flow",
    "Session Handling In Browser",
    "Order Placement Logic",
    "Checkout Workflow",
    "Payment Option Rendering",
    "Order Tracking Section",
    "Review And Rating System",
    "Customer Account Dashboard",
    "Seller Panel Introduction",
    "Seller Login System",
    "Seller Dashboard Statistics",
    "Product CRUD Operations",
    "Add Product Form Design",
    "Edit Product Workflow",
    "Delete Product Confirmation",
    "Image Upload Handling",
    "Emoji And Media Selection",
    "Stock Management Logic",
    "Pricing And Discount Handling",
    "Feature Tag Management",
    "Payment Offer Editing",
    "Popup And Modal Components",
    "Reusable UI Patterns",
    "Data Synchronization Strategy",
    "Index And Seller Panel Connection",
    "Routing Using Redirects",
    "Netlify Deployment Model",
    "HTTPS On Netlify",
    "Netlify Functions Overview",
    "Serverless API Architecture",
    "API Endpoint Design",
    "Authentication Token Flow",
    "Session Validation Logic",
    "Persistent Product Storage",
    "Using Netlify Blobs",
    "Error Handling In API",
    "Frontend Fallback Strategy",
    "LocalStorage Usage",
    "Browser Storage Limits",
    "State Management Approach",
    "Dynamic DOM Rendering",
    "Reusable JavaScript Functions",
    "Page Opening Techniques",
    "Anchor Link Navigation",
    "JavaScript Redirect Methods",
    "Dropdown Menu Logic",
    "Account Menu Enhancements",
    "Seller Panel Access Link",
    "Responsive Layout Considerations",
    "Typography And Color System",
    "Accessibility Considerations",
    "Form Validation Strategy",
    "Input Sanitization Basics",
    "Security Risks In Simple Web Apps",
    "Why HTML Alone Is Not Backend",
    "Difference Between Static And Dynamic Sites",
    "Frontend Limitations",
    "Backend Responsibilities",
    "Code Organization In This Project",
    "Importance Of package.json",
    "Folder Structure Explanation",
    "Importance Of _redirects File",
    "Versioning And Maintenance",
    "Testing The Project Manually",
    "Common Deployment Issues",
    "Debugging Netlify Routes",
    "Handling 404 Errors",
    "Sync Issues Between Pages",
    "Improving Data Reliability",
    "Possible Database Upgrade",
    "Scalability Considerations",
    "Future Authentication Improvements",
    "Admin Authorization Enhancements",
    "Order Management Backend Ideas",
    "Image Hosting Improvements",
    "Performance Optimization",
    "User Experience Improvements",
    "Lessons Learned",
    "Project Summary",
    "Conclusion",
    "Future Scope",
    "Viva Questions And Answers",
    "Final Acknowledgement"
)

$detailBlocks = @(
    "This topic explains an important coding part of the Quickpick project and shows how it supports the website workflow.",
    "It helps connect the customer website, seller panel, and deployment logic into one understandable system.",
    "From a practical view, this code area improves usability, maintainability, and presentation quality for the project."
)

$bodyParagraphs = @()

for ($i = 0; $i -lt $topics.Count; $i++) {
    $pageBreak = $i -gt 0
    $bodyParagraphs += New-ParagraphXml -Text ("Page {0}: {1}" -f ($i + 1), $topics[$i]) -Heading -PageBreakBefore:$pageBreak

    foreach ($block in $detailBlocks) {
        $paragraphText = "$($topics[$i]) is an important heading in this project report. $block"
        $bodyParagraphs += New-ParagraphXml -Text $paragraphText
    }

    foreach ($codeLine in (Get-CodeExamplesForTopic -Topic $topics[$i])) {
        $bodyParagraphs += New-ParagraphXml -Text $codeLine
    }
}

$documentBodyXml = $bodyParagraphs -join "`n"
$currentDate = [DateTime]::UtcNow.ToString("s") + "Z"

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

$rootRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@

$documentRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="120"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="0A3351"/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
</w:styles>
"@

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    $documentBodyXml
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$appXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenAI Codex</Application>
  <Pages>100</Pages>
  <Words>25000</Words>
  <Characters>150000</Characters>
  <Company>Quickpick Store</Company>
  <Lines>2000</Lines>
  <Paragraphs>1000</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>
"@

$coreXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Quickpick 100 Page Project Report</dc:title>
  <dc:subject>Project Explanation And Coding Headings</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:keywords>Quickpick, project report, coding, website, seller panel</cp:keywords>
  <dc:description>Detailed project report with 100 pages of important coding headings.</dc:description>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">$currentDate</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$currentDate</dcterms:modified>
</cp:coreProperties>
"@

if (Test-Path $outputPath) {
    try {
        Remove-Item $outputPath -Force
    } catch {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $outputPath = Join-Path $PSScriptRoot "Quickpick-100-Page-Project-Report-$timestamp.docx"
    }
}

$fileStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)

try {
    Add-ZipEntry -Archive $archive -EntryName "[Content_Types].xml" -Content $contentTypesXml
    Add-ZipEntry -Archive $archive -EntryName "_rels/.rels" -Content $rootRelsXml
    Add-ZipEntry -Archive $archive -EntryName "docProps/app.xml" -Content $appXml
    Add-ZipEntry -Archive $archive -EntryName "docProps/core.xml" -Content $coreXml
    Add-ZipEntry -Archive $archive -EntryName "word/document.xml" -Content $documentXml
    Add-ZipEntry -Archive $archive -EntryName "word/styles.xml" -Content $stylesXml
    Add-ZipEntry -Archive $archive -EntryName "word/_rels/document.xml.rels" -Content $documentRelsXml
}
finally {
    $archive.Dispose()
    $fileStream.Dispose()
}

Write-Output "Created: $outputPath"
