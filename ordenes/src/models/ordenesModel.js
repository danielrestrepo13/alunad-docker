const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysql',
    database: process.env.DB_NAME || 'ordenes_abonos'
});

async function crearOrden(orden) {
    const { nombreCliente, emailCliente, telefonoCliente, direccionEntrega, totalCuenta, metodoPago = 'efectivo', items } = orden;
    const result = await connection.query(
        `INSERT INTO ordenes (nombre_cliente, email_cliente, telefono_cliente, direccion_entrega, precio_total, metodo_pago, estado, items) 
        VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`, 
        [nombreCliente, emailCliente, telefonoCliente, direccionEntrega, totalCuenta, metodoPago, JSON.stringify(items)]
    );
    return result;
}

async function traerOrden(id) {
    const result = await connection.query('SELECT * FROM ordenes WHERE id = ?', [id]);
    return result[0];
}

async function traerOrdenes() {
    const result = await connection.query('SELECT * FROM ordenes ORDER BY fecha_creacion DESC');
    return result[0];
}

// NUEVAS funciones para seguimiento y CRUD
async function actualizarEstado(id, estado) {
    const result = await connection.query('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, id]);
    return result;
}

async function asignarDomiciliario(id, nombreDomiciliario, telefonoDomiciliario) {
    const result = await connection.query(
        'UPDATE ordenes SET domiciliario_nombre = ?, domiciliario_telefono = ? WHERE id = ?', 
        [nombreDomiciliario, telefonoDomiciliario, id]
    );
    return result;
}

async function actualizarOrden(id, nombreCliente, telefonoCliente, direccionEntrega, metodoPago) {
    const result = await connection.query(
        `UPDATE ordenes SET 
         nombre_cliente = ?, telefono_cliente = ?, direccion_entrega = ?, metodo_pago = ? 
         WHERE id = ?`,
        [nombreCliente, telefonoCliente, direccionEntrega, metodoPago, id]
    );
    return result;
}

async function eliminarOrden(id) {
    const result = await connection.query('DELETE FROM ordenes WHERE id = ?', [id]);
    return result;
}

module.exports = { 
    crearOrden, 
    traerOrden, 
    traerOrdenes, 
    actualizarEstado, 
    asignarDomiciliario,
    actualizarOrden,
    eliminarOrden
};
