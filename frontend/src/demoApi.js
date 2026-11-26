// Demo data used when VITE_API_BASE_URL is not configured on a deployed build.
// Data lives in the browser's localStorage so changes persist per visitor.
const STORAGE_KEY = 'inventory-demo-data-v1'

function seed() {
  const now = new Date().toISOString()
  const products = [
    { id: 1, name: 'Wireless Mouse', description: 'Ergonomic 2.4GHz mouse', price: 24.99, stock_level: 42 },
    { id: 2, name: 'Mechanical Keyboard', description: 'Tenkeyless, brown switches', price: 89.0, stock_level: 4 },
    { id: 3, name: 'USB-C Hub', description: '7-in-1 adapter', price: 39.5, stock_level: 0 },
    { id: 4, name: 'Monitor Stand', description: 'Adjustable aluminium riser', price: 32.0, stock_level: 15 },
  ].map((p) => ({ ...p, created_at: now, updated_at: now }))
  const logs = products.map((p, i) => ({
    Sno: i + 1, product_id: p.id, product_name: p.name, change: p.stock_level,
    stock_level_before: 0, stock_level_after: p.stock_level, reason: 'Initial stock', created_at: now,
  }))
  return { products, logs, nextId: 5, nextSno: logs.length + 1 }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const data = seed()
  save(data)
  return data
}

function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

function fail(message) {
  throw new Error(message)
}

export async function demoRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}
  const data = load()
  const now = new Date().toISOString()
  const find = (id) => data.products.find((p) => p.id === Number(id)) || fail('Product not found')
  let m

  if (path === '/products/' && method === 'GET') return data.products
  if (path === '/products/' && method === 'POST') {
    if (!body.name?.trim()) fail('Product name is required')
    if (data.products.some((p) => p.name === body.name.trim())) fail('A product with this name already exists')
    const price = Number(body.price) || 0
    const stock = Number(body.stock_level) || 0
    if (price < 0) fail('Price cannot be negative')
    if (stock < 0) fail('Stock level cannot be negative')
    const product = { id: data.nextId++, name: body.name.trim(), description: body.description || '', price, stock_level: stock, created_at: now, updated_at: now }
    data.products.push(product)
    if (stock > 0) data.logs.push({ Sno: data.nextSno++, product_id: product.id, product_name: product.name, change: stock, stock_level_before: 0, stock_level_after: stock, reason: 'Initial stock', created_at: now })
    save(data)
    return product
  }
  if ((m = path.match(/^\/products\/(\d+)\/stock-history$/))) {
    find(m[1])
    return data.logs.filter((l) => l.product_id === Number(m[1])).reverse()
  }
  if ((m = path.match(/^\/products\/(\d+)$/))) {
    const product = find(m[1])
    if (method === 'GET') return product
    if (method === 'DELETE') {
      data.products = data.products.filter((p) => p.id !== product.id)
      data.logs = data.logs.filter((l) => l.product_id !== product.id)
      save(data)
      return { message: 'Product deleted' }
    }
    if (method === 'PUT' || method === 'PATCH') {
      if (body.name !== undefined) product.name = String(body.name).trim() || fail('Product name is required')
      if (body.description !== undefined) product.description = body.description
      if (body.price !== undefined) {
        if (Number(body.price) < 0) fail('Price cannot be negative')
        product.price = Number(body.price)
      }
      product.updated_at = now
      save(data)
      return product
    }
  }
  if ((m = path.match(/^\/stock\/(increase|decrease)\/(\d+)$/)) && method === 'POST') {
    const product = find(m[2])
    const amount = Number(body.amount)
    if (!Number.isInteger(amount) || amount <= 0) fail('Amount must be greater than 0')
    const change = m[1] === 'increase' ? amount : -amount
    const before = product.stock_level
    if (before + change < 0) fail('Insufficient stock')
    product.stock_level = before + change
    product.updated_at = now
    data.logs.push({ Sno: data.nextSno++, product_id: product.id, product_name: product.name, change, stock_level_before: before, stock_level_after: product.stock_level, reason: body.reason || null, created_at: now })
    save(data)
    return product
  }
  fail('Unsupported demo request')
}
