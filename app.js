const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv/config');

app.use(cors());
app.options('*', cors());

const api = process.env.API_URL;
const CONNECTION_STRING = process.env.CONNECTION_STRING;

// IMPORTER ROUTERS
const PRODUCTS_ROUTER = require('./routes/productsRouter');
const USER_ROUTER = require('./routes/usersRouter');
const ORDER_ROUTER = require('./routes/ordersRouter');
const CATEGORY_ROUTER = require('./routes/categoryRouter');

// MiddleWare
app.use(bodyParser.json());
app.use(morgan('tiny'));

// ROUTERS
app.use(`${api}/products`, PRODUCTS_ROUTER);
app.use(`${api}/users`, USER_ROUTER);
app.use(`${api}/orders`, ORDER_ROUTER);
app.use(`${api}/categories`, CATEGORY_ROUTER);

mongoose
  .connect(CONNECTION_STRING, {
    dbName: 'e-shop',
  })
  .then(() => {
    console.log('DB Connection is ready ... ');
  })
  .catch((error) => {
    console.log('error: Connection failed', error);
  });

const SERVER_PORT = 5100;
app.listen(SERVER_PORT, () => {
  console.log(`Server started on http://localhost:${SERVER_PORT}`);
});