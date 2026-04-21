// Configuracion de las URLs de los microservicios
const API_CONFIG = {
    PRODUCTOS_URL: 'http://192.168.100.3:8080/api/productos',
    USUARIOS_URL: 'http://192.168.100.3:8080/api/usuarios',
    ORDENES_URL: 'http://192.168.100.3:8080/api/ordenes',
    DOMICILIARIOS_URL: 'http://192.168.100.3:8080/api/domiciliarios-disponibles'
};

// Funcion helper para formatear precios en pesos colombianos
function formatPrice(price) {
    if (!price && price !== 0) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// Funcion helper para formatear fechas
function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Funcion para obtener las iniciales de un nombre
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Funcion para mostrar mensajes de error
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            if (element) element.style.display = 'none';
        }, 5000);
    }
}

// Funcion para ocultar mensajes de error
function hideError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Funcion para mostrar mensajes de exito
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            if (element) element.style.display = 'none';
        }, 5000);
    }
}

// Funcion para ocultar mensajes de exito
function hideSuccess(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Gestion de sesion en localStorage
const SessionManager = {
    setUser: function(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    
    getUser: function() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    
    clearUser: function() {
        localStorage.removeItem('currentUser');
    },
    
    isLoggedIn: function() {
        return this.getUser() !== null;
    },
    
    isAdmin: function() {
        const user = this.getUser();
        return user && user.rol === 'admin';
    }
};
