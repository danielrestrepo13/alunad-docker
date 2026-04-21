const mysql = require('mysql2/promise'); 

const connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysql',
    database: process.env.DB_NAME || 'productos_abonos'
}); 

async function obtenerProductos(tipo = null) {
    if (tipo) {
        const result = await connection.query('SELECT * FROM productos WHERE tipo = ?', [tipo]);
        return result[0];
    }
    const result = await connection.query('SELECT * FROM productos');
    return result[0];
}

async function buscarProductos(termino) {
    // El % permite buscar coincidencias parciales (ej: "tierra" encuentra "Tierra de Diatomeas")
    const result = await connection.query(
        'SELECT * FROM productos WHERE nombre LIKE ? OR descripcion LIKE ?',
        [`%${termino}%`, `%${termino}%`]
    );
    return result[0];
}

async function obtenerProductoPorId(id) {
    const result = await connection.query(
        'SELECT * FROM productos WHERE id = ?',
        [id]
    );
    return result[0][0]; // devuelve solo el primer producto
}

// Aquí es donde estaba el problema: antes no ponías las columnas
async function crearProducto(nombre, tipo, precio, cantidad, descripcion) { 
    const result = await connection.query(
        'INSERT INTO productos (nombre, tipo, precio, cantidad, descripcion) VALUES (?, ?, ?, ?, ?)', 
        [nombre, tipo, precio, cantidad, descripcion]
    ); 
    return result; 
} 

async function editarProducto(id, nombre, tipo, precio, cantidad, descripcion) {
    const result = await connection.query(
        'UPDATE productos SET nombre = ?, tipo = ?, precio = ?, cantidad = ?, descripcion = ? WHERE id = ?',
        [nombre, tipo, precio, cantidad, descripcion, id]
    );
    return result;
}

async function eliminarProducto(id) {
    const result = await connection.query(
        'DELETE FROM productos WHERE id = ?',
        [id]
    );
    return result;
}

async function reducirStock(id, cantidadARestar) {
    // Esta consulta es "atómica": MySQL resta y verifica en un solo paso
    const result = await connection.query(
        'UPDATE productos SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?',
        [cantidadARestar, id, cantidadARestar]
    );
    return result[0]; // affectedRows será 1 si hubo stock, 0 si no alcanzó
}

module.exports = { 
    obtenerProductos,
    buscarProductos,
    obtenerProductoPorId,
    crearProducto,
    editarProducto,
    eliminarProducto,
    reducirStock
}; 
