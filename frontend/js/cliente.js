// ========================================
// Cliente Store - JavaScript
// ========================================

// Variables globales
let productos = [];
let servicios = [];
let cart = [];

// Verificar autenticacion al cargar
document.addEventListener('DOMContentLoaded', function() {
    const user = SessionManager.getUser();

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    if (user.rol === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    console.log("Usuario cliente autorizado:", user);

    // Mostrar info del usuario
    const nameEl = document.getElementById('clientName');
    const avatarEl = document.getElementById('clientAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    if (nameEl) nameEl.textContent = user.nombre;
    if (avatarEl) avatarEl.textContent = getInitials(user.nombre);

    // Logout seguro
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Inicializar
    loadCart();
    setupNavigation();
    loadProductosYServicios();
    setupCart();
    setupCheckout();
    
    // Cargar órdenes si el usuario está logueado
    if (SessionManager.isLoggedIn()) {
        loadOrdenes();
    }

    // Mostrar inicio por defecto
    setTimeout(() => {
        // Ocultar checkout si está visible
        const checkoutView = document.getElementById('view-checkout');
        if (checkoutView) checkoutView.style.display = 'none';
        
        // Mostrar productos, servicios y órdenes
        const productosView = document.getElementById('view-productos');
        const serviciosView = document.getElementById('view-servicios');
        const ordenesView = document.getElementById('view-ordenes');
        
        if (productosView) productosView.style.display = 'block';
        if (serviciosView) serviciosView.style.display = 'block';
        if (ordenesView) ordenesView.style.display = 'block';
        
        // Actualizar navegación activa
        const inicioLink = document.querySelector('.store-nav a[data-view="inicio"]');
        if (inicioLink) {
            document.querySelectorAll('.store-nav a').forEach(l => l.classList.remove('active'));
            inicioLink.classList.add('active');
        }
    }, 100);
});

// ========================================
// Navegacion
// ========================================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.store-nav a[data-view]');
    const views = document.querySelectorAll('.store-view');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let viewId = this.getAttribute('data-view');
            
            console.log("Navegando a:", viewId);

            // 🔥 CASO ESPECIAL: Vista "inicio" muestra productos, servicios y órdenes
            if (viewId === 'inicio') {
                // Ocultar SOLO checkout
                const checkoutView = document.getElementById('view-checkout');
                if (checkoutView) checkoutView.style.display = 'none';
                
                // Mostrar productos, servicios y órdenes
                const productosView = document.getElementById('view-productos');
                const serviciosView = document.getElementById('view-servicios');
                const ordenesView = document.getElementById('view-ordenes');
                
                if (productosView) productosView.style.display = 'block';
                if (serviciosView) serviciosView.style.display = 'block';
                if (ordenesView) ordenesView.style.display = 'block';
                
                // Recargar órdenes si es necesario
                loadOrdenes();

                // Actualizar clases activas
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                return;
            }

            // 🔥 Para las demás vistas: ocultar todo y mostrar solo la seleccionada
            // Cambiar estado activo
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Ocultar TODAS las vistas
            views.forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });

            // Mostrar la vista seleccionada
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) {
                targetView.style.display = 'block';
                targetView.classList.add('active');
            }

            // Cargar datos específicos
            if (viewId === 'ordenes') {
                loadOrdenes();
            } else if (viewId === 'checkout') {
                prepareCheckout();
            }
        });
    });
}




// Mostrar vista de checkout (asegurar que prepareCheckout se ejecute)
function showView(viewId) {
    console.log("showView llamado con:", viewId);
    
    // Buscar el link en la navegación
    const link = document.querySelector(`.store-nav a[data-view="${viewId}"]`);
    if (link) {
        link.click();
    } else {
        // Si no hay link, mostrar directamente
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            // Para checkout, ocultar las otras
            if (viewId === 'checkout') {
                const productosView = document.getElementById('view-productos');
                const serviciosView = document.getElementById('view-servicios');
                const ordenesView = document.getElementById('view-ordenes');
                
                if (productosView) productosView.style.display = 'none';
                if (serviciosView) serviciosView.style.display = 'none';
                if (ordenesView) ordenesView.style.display = 'none';
                if (targetView) targetView.style.display = 'block';
                
                prepareCheckout();
            } else {
                // Ocultar todas las vistas
                document.querySelectorAll('.store-view').forEach(view => {
                    view.style.display = 'none';
                });
                targetView.style.display = 'block';
            }
        }
    }
}

// ========================================
// Productos y Servicios
// ========================================
async function loadProductosYServicios() {
    try {
        const response = await fetch(API_CONFIG.PRODUCTOS_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const allItems = await response.json();
        console.log("Datos recibidos:", allItems);

        if (!Array.isArray(allItems)) {
            throw new Error("La respuesta no es un array");
        }

        // Separar productos y servicios (tipo: 'producto_fisico' o 'servicio')
        productos = allItems.filter(item => item.tipo === 'producto_fisico');
        servicios = allItems.filter(item => item.tipo === 'servicio');

        console.log("Productos:", productos);
        console.log("Servicios:", servicios);
        
        renderProductos(productos);
        renderServicios(servicios);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productosGrid').innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>Error al cargar productos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderProductos(items) {
    const grid = document.getElementById('productosGrid');
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m7.5 4.27 9 5.15"/>
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                </svg>
                <h3>No hay productos disponibles</h3>
                <p>Vuelve pronto, estamos preparando nuevos productos</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(producto => `
        <div class="product-card" data-id="${producto.id}">
            <div class="product-image">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 20h10"/>
                    <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
                    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
                    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
                </svg>
            </div>
            <div class="product-info">
                <span class="product-type">Producto</span>
                <h3 class="product-name">${escapeHtml(producto.nombre)}</h3>
                <p class="product-description">${escapeHtml(producto.descripcion || 'Sin descripción')}</p>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(producto.precio)}</span>
                    ${producto.cantidad > 0 ? `
                        <button class="add-to-cart" onclick="addToCart(${producto.id})" title="Agregar al carrito">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14"/>
                                <path d="M12 5v14"/>
                            </svg>
                        </button>
                    ` : `
                        <span class="badge badge-danger">Agotado</span>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function renderServicios(items) {
    const grid = document.getElementById('serviciosGrid');
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <h3>No hay servicios disponibles</h3>
                <p>Vuelve pronto, estamos preparando nuevos servicios</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(servicio => `
        <div class="product-card" data-id="${servicio.id}">
            <div class="product-image" style="background: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-light) 100%);">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
            </div>
            <div class="product-info">
                <span class="product-type" style="color: var(--secondary);">Servicio</span>
                <h3 class="product-name">${escapeHtml(servicio.nombre)}</h3>
                <p class="product-description">${escapeHtml(servicio.descripcion || 'Sin descripción')}</p>
                <div class="product-footer">
                    <span class="product-price" style="color: var(--secondary);">${formatPrice(servicio.precio)}</span>
                    <button class="add-to-cart" style="background: var(--secondary);" onclick="addToCart(${servicio.id})" title="Agregar al carrito">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"/>
                            <path d="M12 5v14"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Carrito de Compras
// ========================================
function setupCart() {
    const openBtn = document.getElementById('openCartBtn');
    const closeBtn = document.getElementById('closeCartBtn');
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCart);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeCart);
    }
    
    function closeCart() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function loadCart() {
    const savedCart = localStorage.getItem('humus_alunad_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('humus_alunad_cart', JSON.stringify(cart));
}

function addToCart(productId) {
    // Buscar en productos y servicios
    const allItems = [...productos, ...servicios];
    const item = allItems.find(p => p.id === productId);
    
    if (!item) return;
    
    // Verificar si ya esta en el carrito
    const existingItem = cart.find(c => c.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            tipo: item.tipo,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    
    // Abrir carrito
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('active');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartUI();
    }
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const cartFooter = document.getElementById('cartFooter');
    
    // Actualizar contador
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        if (cartItems) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="8" cy="21" r="1"/>
                        <circle cx="19" cy="21" r="1"/>
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                    </svg>
                    <p style="margin-top: 12px;">Tu carrito está vacío</p>
                </div>
            `;
        }
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }
    
    if (cartFooter) cartFooter.style.display = 'block';
    
    if (cartItems) {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image" style="${item.tipo === 'servicio' ? 'background: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-light) 100%);' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${item.tipo === 'servicio' ? `
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        ` : `
                            <path d="M7 20h10"/>
                            <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
                            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
                            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
                        `}
                    </svg>
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
                    <div class="cart-item-price">${formatPrice(item.precio)}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"/>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Calcular total
    const total = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = formatPrice(total);
}

function goToCheckout() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    
    console.log("Yendo a checkout, carrito:", cart);
    
    // Cerrar carrito
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    
    // Mostrar checkout directamente
    const productosView = document.getElementById('view-productos');
    const serviciosView = document.getElementById('view-servicios');
    const ordenesView = document.getElementById('view-ordenes');
    const checkoutView = document.getElementById('view-checkout');
    
    if (productosView) productosView.style.display = 'none';
    if (serviciosView) serviciosView.style.display = 'none';
    if (ordenesView) ordenesView.style.display = 'none';
    if (checkoutView) checkoutView.style.display = 'block';
    
    // Preparar datos del checkout
    prepareCheckout();
}

// ========================================
// Checkout
// ========================================

function prepareCheckout() {
    const user = SessionManager.getUser();
    console.log("Preparando checkout para usuario:", user);
    console.log("Carrito actual:", cart);
    
    // Pre-llenar datos del usuario
    const nombreInput = document.getElementById('checkoutNombre');
    const emailInput = document.getElementById('checkoutEmail');
    const telefonoInput = document.getElementById('checkoutTelefono');
    const direccionInput = document.getElementById('checkoutDireccion');
    
    if (nombreInput) nombreInput.value = user.nombre || '';
    if (emailInput) emailInput.value = user.email || '';
    if (telefonoInput) telefonoInput.value = user.telefono || '';
    if (direccionInput) direccionInput.value = user.direccion || '';
    
    // Renderizar items del carrito
    const checkoutItems = document.getElementById('checkoutItems');
    if (checkoutItems) {
        if (cart.length === 0) {
            checkoutItems.innerHTML = '<div style="text-align: center; padding: 20px;">No hay productos en el carrito</div>';
        } else {
            checkoutItems.innerHTML = cart.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                    <div>
                        <strong>${escapeHtml(item.nombre)}</strong>
                        <span style="color: var(--text-muted); margin-left: 8px;">x${item.quantity}</span>
                    </div>
                    <span>${formatPrice(parseFloat(item.precio) * item.quantity)}</span>
                </div>
            `).join('');
        }
    }
    
    // Calcular total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0);
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutTotal) checkoutTotal.textContent = formatPrice(total);
}

function setupCheckout() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) {
        console.error("No se encontró el formulario checkoutForm");
        return;
    }

    console.log("Configurando checkout form"); // Debug
    
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("Formulario de checkout enviado"); // Debug

        if (!cart || cart.length === 0) {
            showError('checkoutError', 'Tu carrito está vacío');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Procesando...';

        hideError('checkoutError');
        hideSuccess('checkoutSuccess');

        const user = SessionManager.getUser();

        const orderData = {
            usuario: user.usuario,
            items: cart.map(item => ({
                id: item.id,
                cantidad: item.quantity,
                nombre: item.nombre,
                precio: item.precio
            })),
            direccionEntrega: document.getElementById('checkoutDireccion').value.trim(),
            metodoPago: document.getElementById('checkoutMetodoPago').value
        };

        console.log("ORDER DATA:", orderData);

        try {
            const response = await fetch(API_CONFIG.ORDENES_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la orden');
            }

            const result = await response.json();

            // Vaciar carrito
            cart = [];
            saveCart();
            updateCartUI();

            showSuccess('checkoutSuccess', `¡Orden #${result.ordenId} creada exitosamente!`);

            // Redirigir a la vista de órdenes después de 3 segundos
            setTimeout(() => {
                showView('ordenes');
                // Limpiar el formulario de checkout
                document.getElementById('checkoutForm').reset();
                hideSuccess('checkoutSuccess');
            }, 3000);

        } catch (error) {
            showError('checkoutError', error.message || 'Error al procesar tu pedido');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// ========================================
// Ordenes del Cliente (CORREGIDO - muestra items y estado)
// ========================================

async function loadOrdenes() {
    const user = SessionManager.getUser();
    const container = document.getElementById('ordenesClienteList');
    
    if (!container || !user) return;

    try {
        const response = await fetch(API_CONFIG.ORDENES_URL);
        if (!response.ok) throw new Error('Error al cargar órdenes');
        
        const allOrdenes = await response.json();
        
        // Filtrar órdenes por email del cliente
        const ordenes = allOrdenes.filter(o => o.email_cliente === user.email);
        
        if (ordenes.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No tienes órdenes aún</h3><p>Realiza tu primera compra</p></div>';
            return;
        }

        // Renderizado de órdenes con items CORREGIDO
        container.innerHTML = ordenes.map(orden => {
            // Parsear los items correctamente
            let items = [];
            try {
                if (typeof orden.items === 'string') {
                    items = JSON.parse(orden.items);
                } else if (Array.isArray(orden.items)) {
                    items = orden.items;
                } else {
                    items = [];
                }
                console.log("Items de orden", orden.id, ":", items); // Debug
            } catch (e) {
                console.error('Error parsing items:', e);
                items = [];
            }
            
            return `
                <div class="order-card" style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 700; font-size: 1.1em; color: var(--primary);">Orden #${orden.id}</span>
                        ${getEstadoBadgeCliente(orden.estado)}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Productos/Servicios:</strong>
                        <div style="margin-top: 8px;">
                            ${items.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <span>${escapeHtml(item.nombre || 'Producto')} x${item.cantidad}</span>
                                    <span style="color: var(--primary); font-weight: 500;">${formatPrice((item.precio || 0) * (item.cantidad || 0))}</span>
                                </div>
                            `).join('')}
                            ${items.length === 0 ? '<div style="color: gray;">No hay detalles disponibles</div>' : ''}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-light);">
                        <div>
                            <small style="color: var(--text-muted);">Fecha: ${formatDate(orden.fecha_creacion)}</small><br>
                            <small style="color: var(--text-muted);">Método de pago: ${orden.metodo_pago}</small>
                        </div>
                        <span style="font-weight: 700; font-size: 1.2em; color: var(--primary);">${formatPrice(orden.precio_total)}</span>
                    </div>
                    ${orden.domiciliario_nombre ? `
                        <div style="margin-top: 12px; padding: 8px; background: var(--info-light); border-radius: 8px;">
                            <small><strong>Domiciliario:</strong> ${escapeHtml(orden.domiciliario_nombre)} - ${escapeHtml(orden.domiciliario_telefono)}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando ordenes:', error);
        container.innerHTML = `<div class="empty-state"><h3>Error al conectar con el servidor</h3><p>${error.message}</p></div>`;
    }
}

function getEstadoBadgeCliente(estado) {
    const estados = {
        'pendiente': { class: 'badge-warning', text: 'Pendiente' },
        'pagado': { class: 'badge-info', text: 'Pagado' },
        'en_camino': { class: 'badge-info', text: 'En Camino' },
        'entregado': { class: 'badge-success', text: 'Entregado' }
    };
    
    const estadoInfo = estados[estado] || { class: 'badge-secondary', text: estado };
    return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
}

function logout() {
    SessionManager.clearUser();
    window.location.href = 'index.html';
}