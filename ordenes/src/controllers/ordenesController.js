const express = require('express');
const router = express.Router();
const axios = require('axios');
const ordenesModel = require('../models/ordenesModel');
const PRODUCTOS_URL = process.env.PRODUCTOS_URL || 'http://localhost:3000';
const USUARIOS_URL = process.env.USUARIOS_URL || 'http://localhost:3001';

router.get('/domiciliarios-disponibles', async (req, res) => {
    try {
        console.log("Consultando domiciliarios disponibles...");
        const response = await axios.get(`${USUARIOS_URL}/usuarios/domiciliarios`);
        
        const lista = response.data.map(u => ({
            nombre: u.nombre,
            telefono: u.telefono,
            usuario: u.usuario 
        }));

        console.log("Domiciliarios encontrados:", lista);
        res.json(lista);
    } catch (error) {
        console.error('Error conectando con microservicio de usuarios:', error.message);
        res.status(500).json({ error: 'No se pudo obtener la lista de domiciliarios' });
    }
});

// GET /ordenes - Listar todas
router.get('/ordenes', async (req, res) => {
    try {
        var result = await ordenesModel.traerOrdenes();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
});

// GET /ordenes/:id
router.get('/ordenes/:id', async (req, res) => {
    try {
        const id = req.params.id;
        var result = await ordenesModel.traerOrden(id);
        if (result.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener orden' });
    }
});



// POST /ordenes - Crear 
router.post('/ordenes', async (req, res) => {
    try {
        console.log("HEADERS:", req.headers);
        console.log("BODY RAW:", req.body);

        const { usuario, items, direccionEntrega, metodoPago = 'efectivo' } = req.body;
        
        if (!items || !Array.isArray(items)) {
            console.error("ITEMS INVALIDOS:", items);
            return res.status(400).json({ error: 'Items inválidos' });
        }
        
        // Obtener nombre y precio de cada producto
        let totalCuenta = 0;
        const itemsCompletos = [];
        
        for (const item of items) {
            try {
                const response = await axios.get(`${PRODUCTOS_URL}/productos/${item.id}`);
                const producto = response.data;
                
                console.log(`Producto ${item.id}:`, producto); // Debug
                
                const precioUnitario = parseFloat(producto.precio);
                const nombreProducto = producto.nombre;
                const cantidad = item.cantidad;
                
                totalCuenta += precioUnitario * cantidad;
                
                // Guardar con toda la información necesaria
                itemsCompletos.push({
                    id: item.id,
                    nombre: nombreProducto,
                    precio: precioUnitario,
                    cantidad: cantidad
                });
                
            } catch (error) {
                console.error(`Error obteniendo producto ${item.id}:`, error.message);
                return res.status(400).json({ error: `Producto con ID ${item.id} no encontrado` });
            }
        }
        
        console.log("Items completos a guardar:", itemsCompletos); // Debug
        
        if (totalCuenta <= 0) {
            return res.status(400).json({ error: 'Total de orden inválido' });
        }

        // 2. Verificar disponibilidad
        const disponibilidad = await verificarDisponibilidad(items);
        if (!disponibilidad) {
            return res.status(400).json({ error: 'No hay disponibilidad de productos' });
        }

        // 3. Obtener datos del usuario
        const responseUsuario = await axios.get(`${USUARIOS_URL}/usuarios/${usuario}`);
        const { nombre: nombreCliente, email: emailCliente, telefono: telefonoCliente } = responseUsuario.data;

        // 4. Crear orden con items completos
        const orden = {
            nombreCliente,
            emailCliente,
            telefonoCliente,
            direccionEntrega,
            totalCuenta,
            metodoPago,
            items: itemsCompletos  // Usar items con nombre y precio
        };
        
        console.log("Orden a guardar:", JSON.stringify(orden, null, 2)); // Debug
        
        const ordenRes = await ordenesModel.crearOrden(orden);

        // 5. Actualizar inventario
        try {
            await actualizarcantidad(items);
        } catch(error) {
            console.error('Fallo de stock:', error.message);
            return res.status(400).json({ 
                error: 'No pudimos procesar el pedido porque se agotó el stock' 
            });
        }
        
        res.json({ 
            mensaje: "Orden creada correctamente", 
            ordenId: ordenRes[0].insertId 
        });
    } catch (error) {
        console.error('Error creando orden:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /ordenes/:id - Actualizar datos completos
router.put('/ordenes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombreCliente, telefonoCliente, direccionEntrega, metodoPago } = req.body;
        await ordenesModel.actualizarOrden(id, nombreCliente, telefonoCliente, direccionEntrega, metodoPago);
        res.json({ mensaje: `Orden ${id} actualizada` });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando orden' });
    }
});

// PUT /ordenes/:id/estado
router.put('/ordenes/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const estadosValidos = ['pendiente', 'pagado', 'en_camino', 'entregado'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        await ordenesModel.actualizarEstado(id, estado);
        res.json({ mensaje: `Orden ${id} actualizada a estado: ${estado}` });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando estado' });
    }
});

// PUT /ordenes/:id/asignar-domiciliario
router.put('/ordenes/:id/asignar-domiciliario', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuarioDomiciliario } = req.body; // Solo recibimos el nombre de usuario

        // 1. Pedimos los datos del domiciliario al micro de usuarios
        const response = await axios.get(`${USUARIOS_URL}/usuarios/${usuarioDomiciliario}`);
        
        if (!response.data || !response.data.nombre) {
            return res.status(404).json({ error: 'El domiciliario no existe en el sistema' });
        }
        
        const { nombre, telefono } = response.data;

        // 2. Guardamos en la base de datos de órdenes
        await ordenesModel.asignarDomiciliario(id, nombre, telefono);
        
        // 3. Opcional: Cambiar el estado a 'en_camino' automáticamente
        await ordenesModel.actualizarEstado(id, 'en_camino');

        res.json({ 
            mensaje: `Orden ${id} asignada a ${nombre}`,
            datos: { nombre, telefono, estado: 'en_camino' }
        });
    } catch (error) {

        console.error("Error en asignar-domiciliario:", error.message);

        res.status(500).json({ error: 'Error al conectar con el servicio de usuarios o domiciliario no encontrado'});
    }
});

// DELETE /ordenes/:id
router.delete('/ordenes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await ordenesModel.eliminarOrden(id);
        res.json({ mensaje: `Orden ${id} eliminada` });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando orden' });
    }
});

// FUNCIONES AUXILIARES
async function calcularTotal(items) {
    let ordenTotal = 0;
    for (const producto of items) {
        const response = await axios.get(`${PRODUCTOS_URL}/productos/${producto.id}`);
        ordenTotal += response.data.precio * producto.cantidad;
    }
    return ordenTotal;
}

async function verificarDisponibilidad(items) {
    let disponibilidad = true;
    for (const producto of items) {
        const response = await axios.get(`${PRODUCTOS_URL}/productos/${producto.id}`);
        if (response.data.cantidad < producto.cantidad) {
            disponibilidad = false;
            break;
        }
    }
    return disponibilidad;
}

async function actualizarcantidad(items) {
    for (const producto of items) {
        await axios.put(`${PRODUCTOS_URL}/productos/${producto.id}/reducir-stock`, {
            cantidad: producto.cantidad
        });
    }
}

module.exports = router;
