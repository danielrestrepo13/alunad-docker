// ========================================
// Admin Panel - JavaScript
// ========================================

console.log("ADMIN JS CARGADO");

// Variables globales
let productos = [];
let usuarios = [];
let ordenes = [];

let isLoadingDashboard = false;

// Verificar autenticacion al cargar
document.addEventListener('DOMContentLoaded', function() {
    console.log("USER:", SessionManager.getUser());
    console.log("LOGGED:", SessionManager.isLoggedIn());

    const user = SessionManager.getUser();

    // ❌ No logueado
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // ❌ No es admin
    if (user.rol !== 'admin') {
        window.location.href = 'cliente.html';
        return;
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtnAdmin');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("CLICK LOGOUT");
            logout();
        });
    }

    // Mostrar info
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = user.nombre;
    if (avatarEl) avatarEl.textContent = getInitials(user.nombre);

    // Inicialización
    setupAdminNavigation();
    setupForms();
    
    // Cargar dashboard por defecto
    loadDashboardData();
});

// ========================================
// Navegacion Admin
// ========================================
function setupAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });
}

function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la seccion seleccionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar navegacion activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Cargar datos de la seccion
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'productos':
            loadProductos();
            break;
        case 'usuarios':
            loadUsuarios();
            break;
        case 'ordenes':
            loadOrdenes();
            break;
    }
}

// ========================================
// Dashboard
// ========================================
async function loadDashboardData() {
    console.log("Dashboard ejecutado");

    if (isLoadingDashboard) return;
    isLoadingDashboard = true;

    try {
        console.log("Cargando dashboard...");

        const [productosRes, usuariosRes, ordenesRes] = await Promise.all([
            fetch(API_CONFIG.PRODUCTOS_URL.slice(0, -1)),
            fetch(API_CONFIG.USUARIOS_URL.slice(0, -1)),
            fetch(API_CONFIG.ORDENES_URL.slice(0, -1))
        ]);

        if (!productosRes.ok || !usuariosRes.ok || !ordenesRes.ok) {
            throw new Error("Error en APIs");
        }

        productos = await productosRes.json();
        usuarios = await usuariosRes.json();
        ordenes = await ordenesRes.json();

        console.log("Datos cargados correctamente");

        const totalProductos = document.getElementById('totalProductos');
        const totalUsuarios = document.getElementById('totalUsuarios');
        const totalOrdenes = document.getElementById('totalOrdenes');
        const totalVentas = document.getElementById('totalVentas');
        
        if (totalProductos) totalProductos.textContent = productos.length;
        if (totalUsuarios) totalUsuarios.textContent = usuarios.length;
        if (totalOrdenes) totalOrdenes.textContent = ordenes.length;

        const totalVentasSum = ordenes.reduce((sum, orden) => {
            return sum + parseFloat(orden.precio_total || 0);
        }, 0);

        if (totalVentas) totalVentas.textContent = formatPrice(totalVentasSum);

        renderRecentOrders();

    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    } finally {
        isLoadingDashboard = false;
    }
}

function renderRecentOrders() {
    const tbody = document.getElementById('recentOrdersTable');
    
    if (!tbody) return;
    
    if (ordenes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay órdenes registradas</td></tr>';
        return;
    }
    
    // Mostrar las 5 órdenes más recientes
    const recentOrders = ordenes.slice(-5).reverse();
    
    tbody.innerHTML = recentOrders.map(orden => {
        const items = typeof orden.items === 'string' ? JSON.parse(orden.items) : (orden.items || []);
        
        return `
            <tr>
                <td>#${orden.id}</td>
                <td>${escapeHtml(orden.nombre_cliente)}</td>
                <td>${formatPrice(orden.precio_total)}
                    <br>
                    <small>
                        ${items.length > 0 
                            ? items.map(i => `${escapeHtml(i.nombre || 'Producto')} x${i.cantidad}`).join(', ') 
                            : 'Sin detalle'}
                    </small>
                </td>
                <td>${getEstadoBadge(orden.estado)}</td>
                <td>${formatDate(orden.fecha_creacion)}</td>
            </tr>
        `;
    }).join('');
}
// ========================================
// Productos CRUD
// ========================================
async function loadProductos() {
    try {
        const response = await fetch(API_CONFIG.PRODUCTOS_URL.slice(0, -1));
        if (!response.ok) throw new Error('Error al cargar productos');
        productos = await response.json();
        renderProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        const tbody = document.getElementById('productosTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar productos</td></tr>';
        }
    }
}

function renderProductos() {
    const tbody = document.getElementById('productosTable');
    
    if (!tbody) return;
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = productos.map(producto => `
        <tr>
            <td>${producto.id}</td>
            <td>${escapeHtml(producto.nombre)}</td>
            <td><span class="badge ${producto.tipo === 'producto_fisico' ? 'badge-success' : 'badge-info'}">${producto.tipo === 'producto_fisico' ? 'Producto' : 'Servicio'}</span></td>
            <td>${formatPrice(producto.precio)}</td>
            <td>${producto.cantidad}</td>
            <td>${producto.descripcion ? escapeHtml(producto.descripcion.substring(0, 50)) + (producto.descripcion.length > 50 ? '...' : '') : '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editProduct(${producto.id})" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                        </svg>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${producto.id})" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProductModal(producto = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal) return;
    
    form.reset();
    hideError('productError');
    
    if (producto) {
        title.textContent = 'Editar Producto';
        document.getElementById('productId').value = producto.id;
        document.getElementById('productNombre').value = producto.nombre;
        document.getElementById('productTipo').value = producto.tipo;
        document.getElementById('productPrecio').value = producto.precio;
        document.getElementById('productCantidad').value = producto.cantidad;
        document.getElementById('productDescripcion').value = producto.descripcion || '';
    } else {
        title.textContent = 'Nuevo Producto';
        document.getElementById('productId').value = '';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
}

async function editProduct(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        openProductModal(producto);
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.PRODUCTOS_URL}${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar el producto');
        }
        
        await loadProductos();
        await loadDashboardData(); // Actualizar dashboard
        showSuccess('productSuccess', 'Producto eliminado exitosamente');
    } catch (error) {
        alert('Error al eliminar el producto: ' + error.message);
    }
}

// ========================================
// Usuarios CRUD
// ========================================
async function loadUsuarios() {
    try {
        const response = await fetch(API_CONFIG.USUARIOS_URL.slice(0, -1));
        if (!response.ok) throw new Error('Error al cargar usuarios');
        usuarios = await response.json();
        renderUsuarios();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        const tbody = document.getElementById('usuariosTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar usuarios</td></tr>';
        }
    }
}

function renderUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    
    if (!tbody) return;
    
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay usuarios registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td>${usuario.id}</td>
            <td>${escapeHtml(usuario.nombre)}</td>
            <td>${escapeHtml(usuario.email)}</td>
            <td>${escapeHtml(usuario.usuario)}</td>
            <td>${escapeHtml(usuario.telefono || '-')}</td>
            <td><span class="badge ${getRolBadgeClass(usuario.rol)}">${getRolText(usuario.rol)}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editUser('${usuario.usuario}')" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                        </svg>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${usuario.usuario}')" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getRolBadgeClass(rol) {
    switch(rol) {
        case 'admin': return 'badge-warning';
        case 'domiciliario': return 'badge-info';
        default: return 'badge-secondary';
    }
}

function getRolText(rol) {
    switch(rol) {
        case 'admin': return 'Administrador';
        case 'domiciliario': return 'Domiciliario';
        default: return 'Cliente';
    }
}

function openUserModal(usuario = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');
    
    if (!modal) return;
    
    form.reset();
    hideError('userError');
    
    if (usuario) {
        title.textContent = 'Editar Usuario';
        document.getElementById('userId').value = usuario.usuario;
        document.getElementById('userNombre').value = usuario.nombre;
        document.getElementById('userEmail').value = usuario.email;
        document.getElementById('userUsuario').value = usuario.usuario;
        document.getElementById('userTelefono').value = usuario.telefono || '';
        document.getElementById('userDireccion').value = usuario.direccion || '';
        document.getElementById('userRol').value = usuario.rol || 'cliente';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').placeholder = 'Dejar vacío para mantener';
    } else {
        title.textContent = 'Nuevo Usuario';
        document.getElementById('userId').value = '';
        document.getElementById('userPassword').placeholder = 'Contraseña requerida';
    }
    
    modal.classList.add('active');
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.classList.remove('active');
}

async function editUser(usuario) {
    const user = usuarios.find(u => u.usuario === usuario);
    if (user) {
        openUserModal(user);
    }
}

async function deleteUser(usuario) {
    const currentUser = SessionManager.getUser();
    if (currentUser.usuario === usuario) {
        alert('No puedes eliminar tu propia cuenta');
        return;
    }
    
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.USUARIOS_URL}${usuario}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar el usuario');
        }
        
        await loadUsuarios();
        await loadDashboardData();
        showSuccess('userSuccess', 'Usuario eliminado exitosamente');
    } catch (error) {
        alert('Error al eliminar el usuario: ' + error.message);
    }
}

// ========================================
// Ordenes CRUD
// ========================================
async function loadOrdenes() {
    try {
        const response = await fetch(API_CONFIG.ORDENES_URL.slice(0, -1));
        if (!response.ok) throw new Error('Error al cargar órdenes');
        ordenes = await response.json();
        renderOrdenes();
    } catch (error) {
        console.error('Error cargando ordenes:', error);
        const tbody = document.getElementById('ordenesTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar órdenes</td></tr>';
        }
    }
}

function renderOrdenes() {
    const tbody = document.getElementById('ordenesTable');
    
    if (!tbody) return;
    
    if (ordenes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay órdenes registradas</td></tr>';
        return;
    }

    tbody.innerHTML = ordenes.map(orden => {
        // Parsear items correctamente
        let items = [];
        try {
            if (typeof orden.items === 'string') {
                items = JSON.parse(orden.items);
            } else if (Array.isArray(orden.items)) {
                items = orden.items;
            }
            console.log("Items orden", orden.id, ":", items); // Debug
        } catch (e) {
            console.error('Error parsing items:', e);
            items = [];
        }
        
        const detalleProductos = items.length > 0
            ? items.map(i => `${escapeHtml(i.nombre || 'Producto ' + i.id)} x${i.cantidad} - ${formatPrice((i.precio || 0) * (i.cantidad || 0))}`).join('<br>')
            : '<span style="color: gray">Sin detalle</span>';

        return `
            <tr>
                <td>#${orden.id}</td>
                <td>
                    <strong>${escapeHtml(orden.nombre_cliente)}</strong><br>
                    <small style="color: var(--text-muted)">${escapeHtml(orden.email_cliente)}</small>
                </td>
                <td>${escapeHtml(orden.direccion_entrega)}</td>
                <td>
                    ${formatPrice(orden.precio_total)}<br>
                    <small>${detalleProductos}</small>            
                </td>
                <td>${orden.metodo_pago}</td>
                <td>${getEstadoBadge(orden.estado)}</td>
                <td>
                    ${orden.domiciliario_nombre ? `
                        <strong>${escapeHtml(orden.domiciliario_nombre)}</strong><br>
                        <small style="color: var(--text-muted)">${escapeHtml(orden.domiciliario_telefono)}</small>
                    ` : '<span style="color: var(--text-muted)">Sin asignar</span>'}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="viewOrderDetail(${orden.id})" title="Ver detalle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="changeOrderStatus(${orden.id}, '${orden.estado}')" title="Cambiar estado">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 3v3"/><path d="M18.5 5.5l-2.12 2.12"/><path d="M21 12h-3"/><path d="M18.5 18.5l-2.12-2.12"/><path d="M12 21v-3"/><path d="M5.5 18.5l2.12-2.12"/><path d="M3 12h3"/><path d="M5.5 5.5l2.12 2.12"/>
                            </svg>
                        </button>
                        <button class="btn btn-success btn-sm" onclick="openAssignDeliveryModal(${orden.id})" title="Asignar domiciliario">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteOrder(${orden.id})" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getEstadoBadge(estado) {
    const estados = {
        'pendiente': { class: 'badge-warning', text: 'Pendiente' },
        'pagado': { class: 'badge-info', text: 'Pagado' },
        'en_camino': { class: 'badge-info', text: 'En Camino' },
        'entregado': { class: 'badge-success', text: 'Entregado' }
    };
    
    const estadoInfo = estados[estado] || { class: 'badge-secondary', text: estado };
    return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
}

function viewOrderDetail(id) {
    const orden = ordenes.find(o => o.id === id);
    if (!orden) return;
    
    // Parsear items
    let items = [];
    try {
        if (typeof orden.items === 'string') {
            items = JSON.parse(orden.items);
        } else if (Array.isArray(orden.items)) {
            items = orden.items;
        }
    } catch (e) {
        console.error('Error parsing items:', e);
        items = [];
    }
    
    const content = document.getElementById('orderDetailContent');
    if (content) {
        content.innerHTML = `
            <div class="order-details">
                <div class="order-detail-item">
                    <label>ID de Orden</label>
                    <span>#${orden.id}</span>
                </div>
                <div class="order-detail-item">
                    <label>Estado</label>
                    <span>${getEstadoBadge(orden.estado)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Cliente</label>
                    <span>${escapeHtml(orden.nombre_cliente)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Email</label>
                    <span>${escapeHtml(orden.email_cliente)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Teléfono</label>
                    <span>${escapeHtml(orden.telefono_cliente || '-')}</span>
                </div>
                <div class="order-detail-item">
                    <label>Dirección de Entrega</label>
                    <span>${escapeHtml(orden.direccion_entrega)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Productos/Servicios</label>
                    <div style="margin-top: 8px;">
                        ${items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                                <span>${escapeHtml(item.nombre || 'Producto')} x${item.cantidad}</span>
                                <span>${formatPrice((item.precio || 0) * (item.cantidad || 0))}</span>
                            </div>
                        `).join('')}
                        ${items.length === 0 ? '<div style="color: gray;">No hay detalles disponibles</div>' : ''}
                    </div>
                </div>
                <div class="order-detail-item">
                    <label>Total</label>
                    <span style="font-weight: bold; color: var(--primary)">${formatPrice(orden.precio_total)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Método de Pago</label>
                    <span>${orden.metodo_pago}</span>
                </div>
                <div class="order-detail-item">
                    <label>Fecha de Creación</label>
                    <span>${formatDate(orden.fecha_creacion)}</span>
                </div>
                <div class="order-detail-item">
                    <label>Domiciliario</label>
                    <span>${orden.domiciliario_nombre ? `${escapeHtml(orden.domiciliario_nombre)} - ${escapeHtml(orden.domiciliario_telefono)}` : 'Sin asignar'}</span>
                </div>
            </div>
        `;
    }
    
    const modal = document.getElementById('orderDetailModal');
    if (modal) modal.classList.add('active');
}

function closeOrderDetailModal() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) modal.classList.remove('active');
}

async function changeOrderStatus(id, currentStatus) {
    const estados = ['pendiente', 'pagado', 'en_camino', 'entregado'];
    const estadosNombres = ['Pendiente', 'Pagado', 'En Camino', 'Entregado'];
    
    const nuevoEstado = prompt(
        `Estado actual: ${currentStatus}\n\nOpciones:\n${estadosNombres.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nIngresa el número del nuevo estado:`,
        ''
    );
    
    if (!nuevoEstado) return;
    
    const index = parseInt(nuevoEstado) - 1;
    if (index < 0 || index >= estados.length) {
        alert('Opción inválida');
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.ORDENES_URL}${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: estados[index] })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar el estado');
        }
        
        await loadOrdenes();
        await loadDashboardData();
        showSuccess('orderSuccess', 'Estado actualizado correctamente');
    } catch (error) {
        alert('Error al actualizar el estado: ' + error.message);
    }
}
async function openAssignDeliveryModal(orderId) {
    const modal = document.getElementById('assignDeliveryModal');
    const select = document.getElementById('deliverySelect');
    
    if (!modal || !select) return;
    
    document.getElementById('deliveryOrderId').value = orderId;
    hideError('deliveryError');

    try {
        // Llamar al endpoint que obtiene los domiciliarios disponibles
        const response = await fetch(`${API_CONFIG.DOMICILIARIOS_URL`);
        
        if (!response.ok) {
            throw new Error('Error al cargar domiciliarios');
        }
        
        const domiciliarios = await response.json();
        console.log("Domiciliarios cargados:", domiciliarios);
        
        // Limpiar y llenar el select
        select.innerHTML = '<option value="">Seleccionar domiciliario</option>';
        
        if (domiciliarios.length === 0) {
            select.innerHTML = '<option value="">No hay domiciliarios disponibles</option>';
        } else {
            domiciliarios.forEach(dom => {
                const option = document.createElement('option');
                option.value = dom.usuario;
                option.textContent = `${dom.nombre} (${dom.telefono || 'Sin teléfono'})`;
                select.appendChild(option);
            });
        }

        modal.classList.add('active');
    } catch (error) {
        console.error('Error cargando domiciliarios:', error);
        alert('Error al cargar la lista de domiciliarios: ' + error.message);
    }
}

function closeAssignDeliveryModal() {
    const modal = document.getElementById('assignDeliveryModal');
    if (modal) modal.classList.remove('active');
}

async function deleteOrder(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta orden?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.ORDENES_URL}${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar la orden');
        }
        
        await loadOrdenes();
        await loadDashboardData();
        showSuccess('orderSuccess', 'Orden eliminada exitosamente');
    } catch (error) {
        alert('Error al eliminar la orden: ' + error.message);
    }
}

// ========================================
// Configuración de Formularios
// ========================================
function setupForms() {
    // Formulario de Producto - CORREGIDO
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const id = document.getElementById('productId').value;
            const tipoSeleccionado = document.getElementById('productTipo').value;
            
            // CORREGIDO: Convertir 'producto' a 'producto_fisico'
            let tipoReal = '';
            if (tipoSeleccionado === 'producto') {
                tipoReal = 'producto_fisico';
            } else if (tipoSeleccionado === 'servicio') {
                tipoReal = 'servicio';
            }
            
            const productData = {
                nombre: document.getElementById('productNombre').value.trim(),
                tipo: tipoReal,  // Usar el valor corregido
                precio: parseFloat(document.getElementById('productPrecio').value),
                cantidad: parseInt(document.getElementById('productCantidad').value),
                descripcion: document.getElementById('productDescripcion').value.trim()
            };
            
            console.log("Enviando producto:", productData); // Debug
            
            hideError('productError');
            
            try {
                let response;
                if (id) {
                    response = await fetch(`${API_CONFIG.PRODUCTOS_URL}${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                } else {
                    response = await fetch(API_CONFIG.PRODUCTOS_URL.slice(0, -1), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                }
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al guardar el producto');
                }
                
                closeProductModal();
                await loadProductos();
                await loadDashboardData();
                showSuccess('productSuccess', id ? 'Producto actualizado' : 'Producto creado exitosamente');
            } catch (error) {
                showError('productError', error.message);
            }
        });
    }
    
    // Formulario de Usuario
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const usuarioOriginal = document.getElementById('userId').value;
            const userData = {
                nombre: document.getElementById('userNombre').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                usuario: document.getElementById('userUsuario').value.trim(),
                telefono: document.getElementById('userTelefono').value.trim(),
                direccion: document.getElementById('userDireccion').value.trim(),
                rol: document.getElementById('userRol').value
            };
            
            const password = document.getElementById('userPassword').value;
            if (password) {
                userData.password = password;
            }
            
            hideError('userError');
            
            try {
                let response;
                if (usuarioOriginal) {
                    // Actualizar
                    response = await fetch(`${API_CONFIG.USUARIOS_URL}${usuarioOriginal}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData)
                    });
                } else {
                    // Crear - password es obligatorio
                    if (!password) {
                        showError('userError', 'La contraseña es obligatoria para nuevos usuarios');
                        return;
                    }
                    response = await fetch(API_CONFIG.USUARIOS_URL.slice(0, -1), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData)
                    });
                }
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al guardar el usuario');
                }
                
                closeUserModal();
                await loadUsuarios();
                await loadDashboardData();
                showSuccess('userSuccess', usuarioOriginal ? 'Usuario actualizado' : 'Usuario creado exitosamente');
            } catch (error) {
                showError('userError', error.message);
            }
        });
    }
    
    // Formulario de Asignar Domiciliario
    const assignDeliveryForm = document.getElementById('assignDeliveryForm');
    if (assignDeliveryForm) {
        assignDeliveryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const orderId = document.getElementById('deliveryOrderId').value;
            const usuarioDomiciliario = document.getElementById('deliverySelect').value;
            
            if (!usuarioDomiciliario) {
                showError('deliveryError', 'Selecciona un domiciliario');
                return;
            }
            
            hideError('deliveryError');
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Asignando...';
            
            try {
                const response = await fetch(`${API_CONFIG.ORDENES_URL}${orderId}/asignar-domiciliario`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuarioDomiciliario })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al asignar el domiciliario');
                }
                
                closeAssignDeliveryModal();
                await loadOrdenes();
                showSuccess('orderSuccess', 'Domiciliario asignado exitosamente');
            } catch (error) {
                showError('deliveryError', error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

function logout() {
    console.log("Ejecutando logout...");
    SessionManager.clearUser();
    window.location.href = 'index.html';
}

// Función de escape HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
