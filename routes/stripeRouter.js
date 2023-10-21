const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

const router = express.Router();

const DOMAIN = 'http://localhost:3000';

router.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'T-shirt',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${DOMAIN}/checkout-success`,
    cancel_url: `${DOMAIN}/cart`,
  });

  res.send({
    url: session.url,
  });
});

module.exports = router;
