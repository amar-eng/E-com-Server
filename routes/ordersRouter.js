const express = require('express');
const {
  getOrders,
  addOrderItems,
  getMyOrders,
  getOrderById,
  getTotalSales,
  getCount,
  getUserOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
} = require('../controllers/orderController');
const { protect, admin } = require('../helpers/jwt');
const router = express.Router();

router.route('/').get(protect, admin, getOrders).post(protect, addOrderItems);
router.route('/my-orders').get(protect, getMyOrders);
router.route('/getTotalSales').get(protect, admin, getTotalSales);
router.route('/count').get(protect, admin, getCount);
router.route('/userOrders/:userId').get(protect, admin, getUserOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);

module.exports = router;
