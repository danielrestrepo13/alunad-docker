// ========================================
// Autenticacion - Login y Registro
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay sesion activa
    if (SessionManager.isLoggedIn()) {
        console.log("Usuario ya logueado");
        
        const currentPage = window.location.pathname;
        
        // SOLO redirigir si está en index (login)
        if (currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('/')) {
            redirectBasedOnRole();
        }
        return;
    }
    
    // Referencias a elementos del DOM (solo si estamos en la página de login)
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerLink = document.getElementById('registerLink');
    const registerModal = document.getElementById('registerModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (registerModal) registerModal.classList.add('active');
        });
    }
    
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', function() {
            if (registerModal) registerModal.classList.remove('active');
            if (registerForm) registerForm.reset();
            hideError('registerError');
            hideSuccess('registerSuccess');
        });
    }
    
    // Cerrar modal al hacer clic fuera
    if (registerModal) {
        registerModal.addEventListener('click', function(e) {
            if (e.target === registerModal) {
                registerModal.classList.remove('active');
                if (registerForm) registerForm.reset();
                hideError('registerError');
                hideSuccess('registerSuccess');
            }
        });
    }
});

// Manejar el login
async function handleLogin(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Ocultar errores previos
    hideError('loginError');
    
    // Validar campos
    if (!usuario || !password) {
        showError('loginError', 'Por favor completa todos los campos');
        return;
    }
    
    // Deshabilitar boton y mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Verificando...';
    
    try {
        const response = await fetch(`${API_CONFIG.USUARIOS_URL}${usuario}/${password}`, {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Usuario o contraseña incorrectos');
            }
            throw new Error('Error al conectar con el servidor');
        }
        
        const data = await response.json();
        console.log("Respuesta del backend:", data);
        
        // Si es array, tomar el primer elemento
        const user = Array.isArray(data) ? data[0] : data;
        
        if (!user || !user.usuario) {
            throw new Error('Usuario o contraseña incorrectos');
        }
        
        // Guardar sesión
        SessionManager.setUser(user);
        
        // Redirigir según rol
        if (user.rol === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'cliente.html';
        }
        
    } catch (error) {
        showError('loginError', error.message || 'Error al iniciar sesión');
    } finally {
        // Restaurar boton
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Iniciar Sesión</span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
    }
}

// Manejar el registro
async function handleRegister(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Obtener valores del formulario
    const userData = {
        nombre: document.getElementById('regNombre').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        usuario: document.getElementById('regUsuario').value.trim(),
        password: document.getElementById('regPassword').value,
        telefono: document.getElementById('regTelefono').value.trim(),
        direccion: document.getElementById('regDireccion').value.trim(),
        rol: 'cliente'
    };
    
    // Ocultar mensajes previos
    hideError('registerError');
    hideSuccess('registerSuccess');
    
    // Validar campos
    if (!userData.nombre || !userData.email || !userData.usuario || !userData.password || !userData.telefono || !userData.direccion) {
        showError('registerError', 'Por favor completa todos los campos');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showError('registerError', 'Por favor ingresa un email válido');
        return;
    }
    
    // Deshabilitar boton y mostrar loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';
    
    try {
        // Verificar si el usuario ya existe
        const checkResponse = await fetch(`${API_CONFIG.USUARIOS_URL}${userData.usuario}`);
        
        if (checkResponse.ok) {
            throw new Error('El nombre de usuario ya está en uso');
        }
        
        // Crear nuevo usuario
        const response = await fetch(`${API_CONFIG.USUARIOS_URL.slice(0, -1)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Error al crear la cuenta');
        }
        
        const result = await response.json();
        
        // Mostrar éxito
        showSuccess('registerSuccess', 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
        
        // Limpiar formulario
        document.getElementById('registerForm').reset();
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
            const modal = document.getElementById('registerModal');
            if (modal) modal.classList.remove('active');
            hideSuccess('registerSuccess');
        }, 2000);
        
    } catch (error) {
        showError('registerError', error.message || 'Error al registrar usuario');
    } finally {
        // Restaurar boton
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear Cuenta';
    }
}

// Redirigir basado en el rol del usuario
function redirectBasedOnRole() {
    const user = SessionManager.getUser();
    if (!user) return;
    
    if (user.rol === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'cliente.html';
    }
}

// Función para cerrar sesión
function logout() {
    SessionManager.clearUser();
    window.location.href = 'index.html';
}