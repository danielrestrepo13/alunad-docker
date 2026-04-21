const { Router } = require('express');
const router = Router();
const usuariosModel = require('../models/usuariosModel');

router.get('/usuarios', async (req, res) => {
    try {
        const result = await usuariosModel.traerUsuarios();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

router.get('/usuarios/domiciliarios', async (req, res) => {
    try {
        const result = await usuariosModel.traerDomiciliarios();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo domiciliarios' });
    }
});

router.get('/usuarios/:usuario', async (req, res) => {
    try {
        const usuario = req.params.usuario;
        const result = await usuariosModel.traerUsuario(usuario);
        if (result.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuario' });
    }
});

router.get('/usuarios/:usuario/:password', async (req, res) => {
    try {
        const usuario = req.params.usuario;
        const password = req.params.password;
        const result = await usuariosModel.validarUsuario(usuario, password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error validando usuario' });
    }
});

router.post('/usuarios', async (req, res) => {
    try {
        const { nombre, email, usuario, password, telefono = '', direccion = '', rol = 'cliente' } = req.body;
        const result = await usuariosModel.crearUsuario(nombre, email, usuario, password, telefono, direccion, rol);
        res.status(201).json({ mensaje: "Usuario creado", insertId: result[0].insertId });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error creando usuario' });
    }
});

router.put('/usuarios/:usuario', async (req, res) => {
    try {
        const usuario = req.params.usuario;
        const { nombre, email, telefono = '', direccion = '', rol = 'cliente' } = req.body;
        const result = await usuariosModel.actualizarUsuario(usuario, nombre, email, telefono, direccion, rol);
        
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: "Usuario actualizado" });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

router.delete('/usuarios/:usuario', async (req, res) => {
    try {
        const usuario = req.params.usuario;
        const result = await usuariosModel.borrarUsuario(usuario);
        
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: "Usuario eliminado" });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
});



module.exports = router;
