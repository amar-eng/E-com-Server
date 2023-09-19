const { OrderItem } = require('../models/order-item');
const { Order } = require('../models/order');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const orderList = await Order.find()
    .populate('user', 'name email')
    .sort({ dateOrdered: -1 });
  if (!orderList) {
    res.status(500).json({ success: false });
  }

  res.send(orderList);
});

router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate({
      path: 'orderItems',
      populate: { path: 'product', populate: 'category' },
    });

  if (!order) {
    res.status(500).json({ success: false });
  }

  res.send(order);
});

router.post('/', async (req, res) => {
  try {
    const orderItemsIds = Promise.all(
      req.body.orderItems.map(async (orderItem) => {
        let newOrderItem = new OrderItem({
          qty: orderItem.qty,
          product: orderItem.product,
        });

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id;
      })
    );
    const orderItemsIdsResolved = await orderItemsIds;

    const totalPrices = await Promise.all(
      orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate(
          'product',
          'price'
        );

        const totalPrice = orderItem.product.price * orderItem.qty;
        return totalPrice;
      })
    );
    const itemTotalPrice = totalPrices.reduce((a, b) => a + b, 0);
    const totalPrice =
      itemTotalPrice +
      parseFloat(req.body.shippingPrice) +
      parseFloat(req.body.taxPrice);

    let order = new Order({
      orderItems: orderItemsIdsResolved,
      shippingAddress2: req.body.shippingAddress2,
      shippingAddress1: req.body.shippingAddress1,
      city: req.body.city,
      postalCode: req.body.postalCode,
      apartment: req.body.apartment,
      state: req.body.state,
      country: req.body.country,
      isPaid: req.body.isPaid,
      isDelivered: req.body.isDelivered,
      phoneNumber: req.body.phoneNumber,
      totalPrice: totalPrice,
      shippingPrice: parseFloat(req.body.shippingPrice),
      taxPrice: parseFloat(req.body.taxPrice),
      itemsPrice: parseFloat(req.body.itemsPrice),
      paymentMethod: req.body.paymentMethod,
      user: req.body.user,
    });

    order = await order.save();

    if (!order) {
      return res.status(400).send('The order cannot be created!');
    }

    res.send(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.put('/:id', async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
    },
    { new: true }
  );

  if (!order) return res.status(400).send('the order cant be updated!');

  res.send(order);
});

router.delete('/:id', async (req, res) => {
  Order.findByIdAndRemove(req.params.id)
    .then(async (order) => {
      if (order) {
        await order.orderItems.map(async (orderItem) => {
          await OrderItem.findByIdAndRemove(orderItem);
        });
        return res
          .status(200)
          .json({ success: true, message: 'the order is deleted' });
      } else {
        return res
          .status(404)
          .json({ success: false, message: 'order not found' });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.get('/get/totalsales', async (req, res) => {
  const totalSales = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalsales: { $sum: '$totalPrice' },
      },
    },
  ]);

  if (!totalSales) {
    return res.status(400).send('The order sales cannot be generated');
  }

  res.send({ totalsales: totalSales.pop().totalsales });
});

router.get(`/get/count`, async (req, res) => {
  try {
    const orderCount = await Order.countDocuments();

    res.send({
      orderCount: orderCount,
    });
  } catch (error) {
    console.error('Error counting documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get(`/get/userorders/:userid`, async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid })
    .populate({
      path: 'orderItems',
      populate: {
        path: 'product',
        populate: 'category',
      },
    })
    .sort({ dateOrdered: -1 });

  if (!userOrderList) {
    res.status(500).json({ success: false });
  }
  res.send(userOrderList);
});

router.put('/:id/pay', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.payer.email_address,
        currency: 'CAD',
      };

      const updatedOrder = await order.save();
      res.status(200).json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
