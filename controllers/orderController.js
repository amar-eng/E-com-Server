const { asyncHandler } = require('../helpers/jwt');
const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin

const getOrders = asyncHandler(async (req, res) => {
  const orderList = await Order.find()
    .populate('user', 'name email id')
    .sort({ dateOrdered: -1 });
  if (!orderList) {
    res.status(500).json({ success: false });
  }

  res.send(orderList);
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private

const addOrderItems = asyncHandler(async (req, res) => {
  try {
    const orderItemsData = await Promise.all(
      req.body.orderItems.map(async (orderItem) => {
        const product = await Product.findById(orderItem.product);
        if (!product) {
          throw new Error(`Product not found for ID: ${orderItem.product}`);
        }

        if (product.countInStock < orderItem.qty) {
          throw new Error(
            `Not enough stock for product ID: ${orderItem.product}`
          );
        }

        const totalPrice = product.price * orderItem.qty;
        if (isNaN(totalPrice)) {
          throw new Error('Calculated totalPrice is NaN');
        }

        // Decrement product stock count
        product.countInStock -= orderItem.qty;
        await product.save();

        return {
          qty: orderItem.qty,
          product: product,
          price: product.price,
        };
      })
    );

    const itemTotalPrice = orderItemsData.reduce(
      (a, b) => a + b.price * b.qty,
      0
    );

    // Ensure values are numbers and aren't NaN
    const shippingPrice = parseFloat(req.body.shippingPrice);
    const taxPrice = parseFloat(req.body.taxPrice);
    const itemsPrice = parseFloat(req.body.itemsPrice);

    if (isNaN(shippingPrice) || isNaN(taxPrice) || isNaN(itemsPrice)) {
      throw new Error('One or more price values are not valid numbers');
    }

    const totalPrice = itemTotalPrice + shippingPrice + taxPrice;

    let order = new Order({
      orderItems: orderItemsData,
      shippingAddress1: req.body.shippingAddress1,
      shippingAddress2: req.body.shippingAddress2,
      apartment: req.body.apartment,
      city: req.body.city,
      postalCode: req.body.postalCode,
      state: req.body.state,
      country: req.body.country,
      phoneNumber: req.body.phoneNumber,
      totalPrice: totalPrice,
      shippingPrice: shippingPrice,
      taxPrice: taxPrice,
      itemsPrice: itemsPrice,
      paymentMethod: req.body.paymentMethod,
      user: req.body.user,
      isPaid: req.body.isPaid || false,
      isDelivered: req.body.isDelivered || false,
    });

    order = await order.save();

    if (!order) {
      return res.status(400).send('The order cannot be created!');
    }

    res.send(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send(error);
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('orderItems.product');

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc   Get Total sales
// @route   GET /api/orders/getTotalSales
// @access  Admin

const getTotalSales = asyncHandler(async (req, res) => {
  const salesData = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalsales: { $sum: '$totalPrice' },
        totalShipping: { $sum: '$shippingPrice' },
        totalTax: { $sum: '$taxPrice' },
      },
    },
  ]);

  if (!salesData || salesData.length === 0) {
    return res.status(400).send('The order sales cannot be generated');
  }

  const data = salesData.pop();

  // Calculate profit
  const profit = data.totalsales - (data.totalShipping + data.totalTax);

  res.send({
    totalsales: data.totalsales,
    totalShipping: data.totalShipping,
    totalTax: data.totalTax,
    profit: profit,
  });
});

// @desc   Get Total Count
// @route   GET /api/orders/count
// @access  Admin

const getCount = asyncHandler(async (req, res) => {
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

// @desc   GET User Order
// @route   GET /api/orders/userorders/:userId
// @access  Admin

const getUserOrders = asyncHandler(async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userId }) // corrected here
    .populate({
      path: 'orderItems',
      populate: {
        path: 'product',
      },
    })
    .sort({ dateOrdered: -1 });

  if (!userOrderList || userOrderList.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: 'No orders found for this user' });
  }

  res.send(userOrderList);
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private

const updateOrderToPaid = asyncHandler(async (req, res) => {
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

// @desc    Update order to delivered
// @route   GET /api/orders/:id/deliver
// @access  Private/Admin

const updateOrderToDelivered = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      res.status(200).json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error updating order to delivered:', error);
    res.status(500).json({
      message: 'Error updating order to delivered: Internal Server Error',
    });
  }
});

module.exports = {
  getOrders,
  addOrderItems,
  getMyOrders,
  getOrderById,
  getTotalSales,
  getCount,
  getUserOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
};
