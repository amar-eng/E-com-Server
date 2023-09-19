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

// IMPORT ROUTERS
const PRODUCTS_ROUTER = require('./routes/productsRouter');
const USER_ROUTER = require('./routes/usersRouter');
const ORDER_ROUTER = require('./routes/ordersRouter');
const CATEGORY_ROUTER = require('./routes/categoryRouter');
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

// MiddleWare
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(authJwt());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));
app.use(errorHandler); // Use errorHandler middleware

// ROUTERS
app.use(`${api}/products`, PRODUCTS_ROUTER);
app.use(`${api}/users`, USER_ROUTER);
app.use(`${api}/orders`, ORDER_ROUTER);
app.use(`${api}/categories`, CATEGORY_ROUTER);

app.get(`${api}/config/paypal`, (req, res) =>
  res.send({
    clientId: process.env.PAYPAL_CLIENT_ID,
  })
);

mongoose
  .connect(CONNECTION_STRING, {
    dbName: 'aroma',
  })
  .then(() => {
    console.log('DB Connection is ready ... ');
  })
  .catch((error) => {
    console.log('error: Connection failed', error);
  });

const SERVER_PORT = 5001;
app.listen(SERVER_PORT, () => {
  console.log(`Server started on http://localhost:${SERVER_PORT}`);
});
