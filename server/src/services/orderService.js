const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Retrieves orders for the admin dashboard with advanced querying (search, filter, sort, pagination)
 */
const getAdminOrders = async (queryParams) => {
  const { orderStatus, paymentStatus, search, sort = 'newest', page = 1, limit = 20 } = queryParams;
  
  const query = {};
  
  if (orderStatus && orderStatus !== 'All Statuses' && orderStatus !== '') {
    query.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    
    // Find matching users by name or email
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');
    
    const userIds = users.map(u => u._id);
    const searchConditions = [];
    
    // Check if search might be an Order ID
    if (mongoose.Types.ObjectId.isValid(search)) {
      searchConditions.push({ _id: search });
    }
    
    // If matching users were found, add them to conditions
    if (userIds.length > 0) {
      searchConditions.push({ user: { $in: userIds } });
    }
    
    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    } else {
      // Force empty result if search term doesn't match a user or an object ID
      query._id = null;
    }
  }

  // Handle sorting
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    highest_total: { totalPrice: -1 },
    lowest_total: { totalPrice: 1 },
  };
  const sortObject = sortMap[sort] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name email avatarUrl')
      .populate('orderItems.product', 'title images price sizes')
      .sort(sortObject)
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  return {
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit))
  };
};

module.exports = {
  getAdminOrders,
};
