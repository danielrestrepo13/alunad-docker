const { Router } = require('express'); 
const router = Router(); 
const productosModel = require('../models/productosModel'); 

/*router.get('/productos', async (req, res) => {
  try {
    const productos = await productosModel.obtenerProductos();
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error del servidor al obtener los productos" });
  }
});
*/

// GET /productos - Ahora soporta ?tipo= y ?buscar=
router.get('/productos', async (req, res) => {
  try {
    const { tipo, buscar } = req.query; // Extraemos parámetros de la URL
    
    let productos;
    if (buscar) {
        // Si el usuario escribió en la barra de búsqueda
        productos = await productosModel.buscarProductos(buscar);
    } else {
        // Si no hay búsqueda, trae todo o filtra por tipo (fisico/servicio)
        productos = await productosModel.obtenerProductos(tipo);
    }
    
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error del servidor al obtener los productos" });
  }
});

router.get('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await productosModel.obtenerProductoPorId(id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(200).json(producto);
  } catch (error) {
    console.error("Error al obtener producto por ID:", error);
    res.status(500).json({ error: "Error del servidor al obtener producto" });
  }
});

// Crear producto (usa todos los campos)
router.post('/productos', async (req, res) => {
  try {
    const { nombre, tipo, precio, cantidad, descripcion } = req.body;
    await productosModel.crearProducto(nombre, tipo, precio, cantidad, descripcion);
    res.status(201).json({ mensaje: "Producto creado con éxito" });
  } catch (error) {
    console.error("Error al insertar producto:", error);
    res.status(500).json({ error: "Error del servidor al insertar producto" });
  }
});

// Editar producto
router.put('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, precio, cantidad, descripcion } = req.body;
    await productosModel.editarProducto(id, nombre, tipo, precio, cantidad, descripcion);
    res.status(200).json({ mensaje: "Producto actualizado con éxito" });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error del servidor al actualizar producto" });
  }
});

// NUEVA RUTA: PUT /productos/:id/reducir-stock
router.put('/productos/:id/reducir-stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: "Cantidad inválida" });
        }

    const result = await productosModel.reducirStock(id, cantidad);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Stock insuficiente o producto no encontrado" });
    }
    res.status(200).json({ mensaje: "Stock actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar stock" });
  }
});

router.delete('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await productosModel.eliminarProducto(id);
    res.status(200).json({ mensaje: "Producto eliminado con éxito" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: "Error del servidor al eliminar producto" });
  }
});

module.exports = router; 
