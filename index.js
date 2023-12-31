const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://al-misk.vercel.app',
    'https://e-com-server-jt2k.vercel.app',
    'https://e-com-client-eight.vercel.app',
    'https://aeru.vercel.app',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const api = process.env.API_URL;
const CONNECTION_STRING = process.env.CONNECTION_STRING;
const BASE_URL = process.env.BASE_URL;

// IMPORT ROUTERS
const PRODUCTS_ROUTER = require('./routes/productsRouter');
const USER_ROUTER = require('./routes/usersRouter');
const ORDER_ROUTER = require('./routes/ordersRouter');
const CATEGORY_ROUTER = require('./routes/categoryRouter');
const STRIPE_ROUTER = require('./routes/stripeRouter');
const errorHandler = require('./helpers/error-handler');

// MiddleWare
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(errorHandler);
app.use(cookieParser());

// ROUTERS
app.use(`${api}/products`, PRODUCTS_ROUTER);
app.use(`${api}/users`, USER_ROUTER);
app.use(`${api}/orders`, ORDER_ROUTER);
app.use(`${api}/categories`, CATEGORY_ROUTER);
app.use(`${api}/stripe-checkout`, STRIPE_ROUTER);

app.get(`${api}/config/paypal`, (req, res) => {
  res.send({
    clientId: process.env.PAYPAL_CLIENT_ID,
  });
});

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
  console.log(`Server started on ${BASE_URL}:${SERVER_PORT}`);
});
