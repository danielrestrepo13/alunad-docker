const express = require('express');
const ordenesController = require('./controllers/ordenesController');
const morgan = require('morgan'); 
const app = express();
const cors = require('cors'); 

app.use(morgan('dev'));
app.use(cors());
//app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(ordenesController);

app.listen(3002, () => {
  console.log('Microservicio de Ordenes ejecutandose en el puerto 3002');
});
