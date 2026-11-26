import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, options = {}) {
  const token = localStorage.getItem('stockroom_token')
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = response.status === 204 || !isJson ? null : await response.json()

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Could not reach the Inventory API (HTTP ${response.status}). Check that the Flask backend is running.`)
  }

  if (data === null && response.status !== 204) {
    throw new Error('The Inventory API returned an unexpected response. Check the API URL and backend status.')
  }

  return data
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8" /><path d="M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.4" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function StockStatus({ quantity }) {
  if (quantity <= 0) return <span className="badge badge-out">Out of stock</span>
  if (quantity <= 5) return <span className="badge badge-low">Low stock</span>
  return <span className="badge badge-in">In stock</span>
}

function App() {
  const [authView, setAuthView] = useState('signin')
  const [authChecking, setAuthChecking] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeView, setActiveView] = useState('overview')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      const data = await request('/products/')
      if (!Array.isArray(data)) throw new Error('The products endpoint returned an unexpected response.')
      setProducts(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshProducts = useCallback(() => {
    setLoading(true)
    setError('')
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const token = localStorage.getItem('stockroom_token')
    if (!token) {
      setAuthChecking(false)
      return
    }

    request('/auth/me')
      .then((data) => setCurrentUser(data.user))
      .catch(() => {
        localStorage.removeItem('stockroom_token')
        setCurrentUser(null)
      })
      .finally(() => setAuthChecking(false))
  }, [])

  useEffect(() => {
    if (!currentUser) return undefined
    let active = true
    request('/products/')
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('The products endpoint returned an unexpected response.')
        if (active) setProducts(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [currentUser])

  const stats = useMemo(() => ({
    count: products.length,
    units: products.reduce((sum, product) => sum + Number(product.stock_level || 0), 0),
    value: products.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.stock_level || 0),
      0,
    ),
    low: products.filter((product) => Number(product.stock_level) > 0 && Number(product.stock_level) <= 5).length,
    out: products.filter((product) => Number(product.stock_level) <= 0).length,
  }), [products])

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.description || ''}`.toLowerCase().includes(search.toLowerCase())
    const quantity = Number(product.stock_level)
    const matchesFilter = filter === 'all'
      || (filter === 'low' && quantity > 0 && quantity <= 5)
      || (filter === 'out' && quantity <= 0)
      || (filter === 'in' && quantity > 5)
    return matchesSearch && matchesFilter
  }), [filter, products, search])

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  async function submitProduct(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const isEditing = modal.type === 'edit'
    const payload = {
      name: formData.get('name').trim(),
      description: formData.get('description').trim() || null,
      price: Number(formData.get('price')),
    }
    if (!isEditing) payload.stock_level = Number(formData.get('stock_level'))

    try {
      await request(isEditing ? `/products/${modal.product.id}` : '/products/', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setModal(null)
      showNotice(isEditing ? 'Product updated successfully.' : 'Product added successfully.')
      refreshProducts()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function submitStockAdjustment(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      await request(`/stock/${modal.type}/${modal.product.id}`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(formData.get('amount')),
          reason: formData.get('reason').trim() || null,
        }),
      })
      const adjustment = modal.type === 'increase' ? 'Stock added.' : 'Stock removed.'
      setModal(null)
      showNotice(adjustment)
      refreshProducts()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This will also remove its stock history.`)) return
    try {
      await request(`/products/${product.id}`, { method: 'DELETE' })
      showNotice('Product deleted.')
      refreshProducts()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function openHistory(product) {
    setModal({ type: 'history', product })
    setHistoryLoading(true)
    setHistory([])
    try {
      const data = await request(`/products/${product.id}/stock-history`)
      if (!Array.isArray(data)) throw new Error('The stock history endpoint returned an unexpected response.')
      setHistory(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    const formData = new FormData(event.currentTarget)
    const payload = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
    }
    if (authView === 'signup') payload.name = formData.get('name').trim()

    try {
      const data = await request(authView === 'signup' ? '/auth/signup' : '/auth/signin', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      localStorage.setItem('stockroom_token', data.token)
      setCurrentUser(data.user)
      setShowPassword(false)
      setAuthError('')
    } catch (requestError) {
      setAuthError(requestError.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  function signOut() {
    localStorage.removeItem('stockroom_token')
    setCurrentUser(null)
    setProducts([])
    setError('')
    setNotice('')
  }

  function navigate(view) {
    setActiveView(view)
    setMobileNavOpen(false)
    setFilter('all')
  }

  const isProductsView = activeView === 'products'
  const shownProducts = isProductsView ? visibleProducts : products.slice(0, 5)

  if (authChecking) {
    return <div className="auth-loading"><span className="auth-loader" /><span>Loading Rupesh's Stockroom...</span></div>
  }

  if (!currentUser) {
    const isSignUp = authView === 'signup'
    return (
      <main className="auth-page">
        <section className="auth-visual" aria-label="Inventory workspace preview">
          <a className="auth-brand" href="#" onClick={(event) => event.preventDefault()}>
            <span className="brand-mark"><Icon name="box" size={22} /></span>
            <span>Rupesh's Stockroom<span className="brand-period">.</span></span>
          </a>
          <div className="auth-visual-copy">
            <p className="auth-kicker">SMART INVENTORY</p>
            <h2>Everything in your stockroom, in view.</h2>
            <p>Track products, monitor movements, and stay ahead of low stock from one calm workspace.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-header">
              <span className="preview-mark"><Icon name="box" size={14} /></span>
              <strong>Inventory overview</strong>
              <span className="preview-workspace">Workspace</span>
              <span className="preview-avatar">A</span>
            </div>
            <div className="preview-content">
              <div className="preview-greeting">
                <span>YOUR WORKSPACE</span>
                <strong>Good morning, Alex</strong>
                <small>Here’s what’s happening with your stock today.</small>
              </div>
              <div className="preview-stats">
                <article><span>Total products</span><strong>248</strong><small>↗ 12% this month</small></article>
                <article><span>Units in stock</span><strong>1,842</strong><small>Across your catalog</small></article>
                <article><span>Stock value</span><strong>$24.6k</strong><small>Current inventory</small></article>
              </div>
              <div className="preview-activity">
                <div className="preview-activity-heading"><strong>Recent products</strong><span>View all</span></div>
                <div className="preview-row"><i className="preview-product purple" /><span><b>Wireless headphones</b><small>Electronics</small></span><strong>128 units</strong></div>
                <div className="preview-row"><i className="preview-product green" /><span><b>Everyday bottle</b><small>Accessories</small></span><strong>64 units</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow">{isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
            <h1>{isSignUp ? 'Create your account' : "Sign in to Rupesh's Stockroom"}</h1>
            <p className="auth-subtitle">{isSignUp ? 'Start managing your inventory today.' : 'Enter your details to access your workspace.'}</p>

            {authError && <div className="auth-error" role="alert"><Icon name="alert" size={16} /><span>{authError}</span></div>}

            <form className="auth-form" onSubmit={submitAuth}>
              {isSignUp && (
                <label>Full name
                  <input name="name" type="text" autoComplete="name" required maxLength="128" placeholder="Alex Morgan" />
                </label>
              )}
              <label>Email address
                <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
              </label>
              <label>Password
                <div className="auth-password">
                  <input name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} required minLength={isSignUp ? 8 : 1} placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'} />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button>
                </div>
              </label>
              {!isSignUp && <div className="auth-options"><label className="remember-option"><input type="checkbox" /> Remember me</label></div>}
              <button className="button auth-submit" type="submit" disabled={authSubmitting}>
                {authSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="auth-switch">
              {isSignUp ? 'Already have an account?' : "New to Rupesh's Stockroom?"}
              <button type="button" onClick={() => { setAuthView(isSignUp ? 'signin' : 'signup'); setAuthError(''); setShowPassword(false) }}>
                {isSignUp ? 'Sign in' : 'Create account'}
              </button>
            </p>
            <p className="auth-security"><span aria-hidden="true">✓</span> Your workspace is protected with secure sign-in</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('overview') }}>
          <span className="brand-mark"><Icon name="box" size={21} /></span>
          <span>Rupesh's Stockroom<span className="brand-period">.</span></span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => navigate('overview')}>
            <Icon name="grid" /> Overview
          </button>
          <button className={`nav-item ${isProductsView ? 'active' : ''}`} onClick={() => navigate('products')}>
            <Icon name="box" /> Products <span className="nav-count">{stats.count}</span>
          </button>
          <button className={`nav-item ${activeView === 'history' ? 'active' : ''}`} onClick={() => navigate('history')}>
            <Icon name="clock" /> Stock history
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="api-status"><span className={`status-dot ${error ? 'status-error' : ''}`} /><span>{error ? 'API connection issue' : 'Inventory API connected'}</span></div>
          <span className="sidebar-caption">Inventory management</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{activeView === 'overview' ? 'Overview' : activeView === 'products' ? 'Products' : 'Stock history'}</strong></div>
          <div className="topbar-right">
            <span className="user-name">{currentUser.name}</span>
            <span className="avatar" aria-label={`${currentUser.name} account`}>{currentUser.name.trim().charAt(0).toUpperCase()}</span>
            <button className="signout-button" type="button" onClick={signOut} title="Sign out" aria-label="Sign out"><Icon name="logout" size={17} /></button>
          </div>
        </header>

        <section className="page-content">
          {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={17} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
          {notice && <div className="alert alert-success" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}

          <div className="page-heading">
            <div>
              <p className="eyebrow">{isProductsView ? 'CATALOG' : activeView === 'history' ? 'ACTIVITY' : 'YOUR BUSINESS AT A GLANCE'}</p>
              <h1>{isProductsView ? 'Products' : activeView === 'history' ? 'Stock history' : 'Inventory overview'}</h1>
              <p className="page-subtitle">{isProductsView ? 'Manage your products and keep stock up to date.' : activeView === 'history' ? 'Review recent stock movements across your catalog.' : 'Here’s what’s happening with your inventory today.'}</p>
            </div>
            <button className="button button-primary" onClick={() => setModal({ type: 'create' })}><Icon name="plus" size={17} /> Add product</button>
          </div>

          {activeView !== 'history' && (
            <div className="stats-grid">
              <article className="stat-card"><div className="stat-top"><span className="stat-label">Total products</span><span className="stat-icon icon-lilac"><Icon name="box" /></span></div><div className="stat-value">{loading ? '—' : stats.count}</div><div className="stat-foot"><span className="stat-foot-muted">Unique items in catalog</span></div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-label">Units in stock</span><span className="stat-icon icon-blue"><Icon name="grid" /></span></div><div className="stat-value">{loading ? '—' : stats.units.toLocaleString()}</div><div className="stat-foot"><span className="stat-foot-muted">Across all products</span></div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-label">Stock value</span><span className="stat-icon icon-green"><Icon name="arrow" /></span></div><div className="stat-value">{loading ? '—' : formatCurrency(stats.value)}</div><div className="stat-foot"><span className="stat-foot-muted">Based on current quantity</span></div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-label">Needs attention</span><span className="stat-icon icon-orange"><Icon name="alert" /></span></div><div className="stat-value">{loading ? '—' : stats.low + stats.out}</div><div className="stat-foot"><span className="attention-count">{stats.low} low</span><span className="stat-foot-muted">· {stats.out} out of stock</span></div></article>
            </div>
          )}

          {activeView !== 'history' && stats.low + stats.out > 0 && (
            <section className="attention-banner">
              <span className="attention-icon"><Icon name="alert" size={18} /></span>
              <div><strong>Stock needs your attention</strong><span>{stats.low + stats.out} {stats.low + stats.out === 1 ? 'product is' : 'products are'} running low or out of stock.</span></div>
              <button className="text-button" onClick={() => { navigate('products'); setFilter('low') }}>Review stock <span aria-hidden="true">→</span></button>
            </section>
          )}

          <section className="panel product-panel">
            <div className="panel-header">
              <div><h2>{activeView === 'history' ? 'Recent movements' : isProductsView ? 'All products' : 'Recently added'}</h2><p>{activeView === 'history' ? 'Choose a product to view its stock activity.' : isProductsView ? `${visibleProducts.length} products in your catalog` : 'Your latest inventory items'}</p></div>
              {activeView !== 'history' && <button className="button button-secondary" onClick={() => isProductsView ? refreshProducts() : navigate('products')}>{isProductsView ? 'Refresh list' : 'View all products'} {!isProductsView && <span aria-hidden="true">→</span>}</button>}
            </div>
            <div className="table-toolbar">
              <label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." aria-label="Search products" /></label>
              {isProductsView && <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter products by stock status"><option value="all">All stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>PRODUCT</th><th>PRICE</th><th>STOCK LEVEL</th><th>STATUS</th><th>UPDATED</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="table-message" colSpan="6">Loading products…</td></tr>
                    : shownProducts.length === 0 ? <tr><td className="table-message" colSpan="6">{products.length === 0 ? 'No products yet. Add your first product to get started.' : 'No products match your search.'}</td></tr>
                      : shownProducts.map((product) => (
                        <tr key={product.id}>
                          <td><div className="product-cell"><span className="product-thumb">{product.name.trim().charAt(0).toUpperCase()}</span><div className="product-name-wrap"><span className="product-name">{product.name}</span><span className="product-description">{product.description || `Product #${product.id}`}</span></div></div></td>
                          <td className="price-cell">{formatCurrency(product.price)}</td>
                          <td><span className="quantity-cell">{product.stock_level}<span className="unit-label"> units</span></span></td>
                          <td><StockStatus quantity={Number(product.stock_level)} /></td>
                          <td className="date-cell">{formatDate(product.updated_at || product.created_at)}</td>
                          <td><div className="row-actions">
                            {activeView === 'history' ? <button className="icon-button" title="View stock history" aria-label={`View ${product.name} stock history`} onClick={() => openHistory(product)}><Icon name="clock" size={16} /></button> : <>
                              <button className="icon-button" title="Add stock" aria-label={`Add stock to ${product.name}`} onClick={() => setModal({ type: 'increase', product })}><Icon name="plus" size={16} /></button>
                              <button className="icon-button" title="Remove stock" aria-label={`Remove stock from ${product.name}`} onClick={() => setModal({ type: 'decrease', product })}><Icon name="minus" size={16} /></button>
                              <button className="icon-button" title="View history" aria-label={`View ${product.name} stock history`} onClick={() => openHistory(product)}><Icon name="clock" size={16} /></button>
                              <button className="icon-button" title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => setModal({ type: 'edit', product })}><Icon name="edit" size={16} /></button>
                              <button className="icon-button icon-danger" title="Delete product" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><Icon name="trash" size={16} /></button>
                            </>}
                          </div></td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {isProductsView && <div className="table-footer"><span>Showing {visibleProducts.length} of {products.length} products</span><button className="text-button" onClick={refreshProducts}>Refresh data</button></div>}
          </section>

          {!isProductsView && activeView !== 'history' && stats.low + stats.out > 0 && (
            <section className="panel low-stock-panel">
              <div className="panel-header"><div><h2>Stock alerts</h2><p>Products that may need a restock soon</p></div><button className="text-button" onClick={() => { navigate('products'); setFilter('low') }}>See all alerts <span aria-hidden="true">→</span></button></div>
              <div className="alert-list">{products.filter((product) => Number(product.stock_level) <= 5).slice(0, 4).map((product) => <div className="alert-row" key={product.id}><span className="alert-product-icon">{product.name.trim().charAt(0).toUpperCase()}</span><span className="alert-product-name">{product.name}</span><span className="alert-product-qty">{product.stock_level} units left</span><StockStatus quantity={Number(product.stock_level)} /><button className="text-button" onClick={() => setModal({ type: 'increase', product })}>Restock</button></div>)}</div>
            </section>
          )}
        </section>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
        <section className={`modal ${modal.type === 'history' ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><p className="eyebrow">{modal.type === 'history' ? 'PRODUCT ACTIVITY' : modal.type === 'increase' || modal.type === 'decrease' ? 'INVENTORY UPDATE' : 'PRODUCT DETAILS'}</p><h2 id="modal-title">{modal.type === 'create' ? 'Add a product' : modal.type === 'edit' ? 'Edit product' : modal.type === 'increase' ? 'Add stock' : modal.type === 'decrease' ? 'Remove stock' : `History · ${modal.product.name}`}</h2></div><button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></button></div>

          {(modal.type === 'create' || modal.type === 'edit') && <form className="modal-form" onSubmit={submitProduct}>
            <label>Product name<input name="name" required maxLength="128" defaultValue={modal.product?.name || ''} placeholder="e.g. Ceramic coffee mug" /></label>
            <label>Description <span className="optional-label">Optional</span><textarea name="description" rows="3" defaultValue={modal.product?.description || ''} placeholder="A short description of this product" /></label>
            <div className="form-row"><label>Price<input name="price" type="number" min="0" step="0.01" required defaultValue={modal.product?.price ?? ''} placeholder="0.00" /></label>{modal.type === 'create' && <label>Initial stock<input name="stock_level" type="number" min="0" step="1" required defaultValue="0" /></label>}</div>
            {modal.type === 'edit' && <p className="form-hint">To change stock levels, use the stock adjustment action after saving.</p>}
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary">{modal.type === 'create' ? 'Add product' : 'Save changes'}</button></div>
          </form>}

          {(modal.type === 'increase' || modal.type === 'decrease') && <form className="modal-form" onSubmit={submitStockAdjustment}>
            <div className="stock-summary"><span className="product-thumb">{modal.product.name.trim().charAt(0).toUpperCase()}</span><div><strong>{modal.product.name}</strong><span>Current stock: {modal.product.stock_level} units</span></div></div>
            <label>Quantity<input name="amount" type="number" min="1" step="1" required autoFocus placeholder="Enter quantity" /></label>
            <label>Reason <span className="optional-label">Optional</span><input name="reason" maxLength="256" placeholder={modal.type === 'increase' ? 'e.g. Supplier delivery' : 'e.g. Customer order'} /></label>
            <p className="form-hint">This adjustment will be recorded in the product’s stock history.</p>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary">{modal.type === 'increase' ? 'Add stock' : 'Remove stock'}</button></div>
          </form>}

          {modal.type === 'history' && <div className="history-content">
            {historyLoading ? <p className="history-message">Loading stock activity…</p> : history.length === 0 ? <p className="history-message">No stock movements recorded for this product yet.</p> : <div className="history-table-wrap"><table className="history-table"><thead><tr><th>DATE</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th><th>REASON</th></tr></thead><tbody>{history.map((item) => <tr key={item.Sno}><td>{formatDate(item.created_at)}</td><td className={item.change > 0 ? 'change-positive' : 'change-negative'}>{item.change > 0 ? '+' : ''}{item.change}</td><td>{item.stock_level_before}</td><td>{item.stock_level_after}</td><td>{item.reason || '—'}</td></tr>)}</tbody></table></div>}
          </div>}
        </section>
      </div>}
    </div>
  )
}

export default App
