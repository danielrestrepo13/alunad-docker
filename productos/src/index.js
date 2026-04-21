const express = require('express'); 
const productosController = require('./controllers/productosController'); 
const morgan = require('morgan'); 
const cors = require('cors'); 
const app = express(); 

app.use(morgan('dev')); 
app.use(cors());
app.use(express.json()); 

app.use(productosController); 

app.listen(3000, () => { 
  console.log('Microservicio Productos ejecutandose en el puerto 3000'); 
}); 