const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysql',
    database: process.env.DB_NAME || 'usuarios_abonos'
});

async function traerUsuarios() {
    const result = await connection.query('SELECT * FROM usuarios');
    return result[0];
}

async function traerUsuario(usuario) {
    const result = await connection.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    return result[0];
}

async function validarUsuario(usuario, password) {
    const result = await connection.query(
        'SELECT * FROM usuarios WHERE usuario = ? AND password = ?', 
        [usuario, password]
    );
    return result[0];
}

async function crearUsuario(nombre, email, usuario, password, telefono = '', direccion = '', rol = 'cliente') {
    const result = await connection.query(
        `INSERT INTO usuarios (nombre, email, usuario, password, telefono, direccion, rol) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, email, usuario, password, telefono, direccion, rol]
    );
    return result;
}

async function actualizarUsuario(usuario, nombre, email, telefono, direccion, rol) {
    const result = await connection.query(
        `UPDATE usuarios 
         SET nombre = ?, email = ?, telefono = ?, direccion = ?, rol = ? 
         WHERE usuario = ?`,
        [nombre, email, telefono, direccion, rol, usuario]
    );
    return result;
}

async function borrarUsuario(usuario) {
    const result = await connection.query(
        'DELETE FROM usuarios WHERE usuario = ?',
        [usuario]
    );
    return result;
}

async function traerDomiciliarios() {
    const result = await connection.query(
        "SELECT * FROM usuarios WHERE rol = 'domiciliario'"
    );
    return result[0];
}

module.exports = {
    traerUsuarios, 
    traerUsuario, 
    validarUsuario, 
    crearUsuario,
    actualizarUsuario,
    borrarUsuario,
    traerDomiciliarios
};
