import { browseRestaurants, restaurantDetail, partnerOverview, partnerRegister, partnerUpdate, partnerPublish, partnerMenuSave, partnerOrders, partnerOrderStatus, platformRestaurants, platformRestaurantStatus } from '../controllers/marketplace.controller.js';
import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import {
  getMenu,
  createOrder,
  getOrders,
  getOrder,
  createReservation,
  getReservations,
  createMessage,
  getReservation,
} from '../controllers/restaurant.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  register,
  login,
  me,
  logout,
  profile,
  changePassword,
} from '../controllers/auth.controller.js';
import {
  adminOrders,
  adminReservations,
  adminOrderStatus,
  adminReservationStatus,
  adminAvailability,
  cancelOrder,
  cancelReservation,
} from '../controllers/admin.controller.js';

const router = Router();
router.get('/health', getHealth);
router.get('/restaurants',browseRestaurants);
router.get('/restaurants/:id',restaurantDetail);
router.use('/partner',requireAuth);
router.get('/partner',partnerOverview);
router.post('/partner',rateLimit({limit:10}),partnerRegister);
router.patch('/partner',partnerUpdate);
router.post('/partner/publish',partnerPublish);
router.post('/partner/menu',partnerMenuSave);
router.patch('/partner/menu/:id',partnerMenuSave);
router.get('/partner/orders',partnerOrders);
router.patch('/partner/orders/:id',partnerOrderStatus);
router.get('/menu', getMenu);
router.get('/orders', requireAuth, getOrders);
router.get('/orders/:id', requireAuth, getOrder);
router.post('/orders', requireAuth, createOrder);
router.patch('/orders/:id/cancel', requireAuth, cancelOrder);
router.get('/reservations', requireAuth, getReservations);
router.get('/reservations/:id', requireAuth, getReservation);
router.post('/reservations', requireAuth, createReservation);
router.patch('/reservations/:id/cancel', requireAuth, cancelReservation);
router.post('/messages', createMessage);
const authLimit = rateLimit();
router.post('/auth/register', authLimit, register);
router.post('/auth/login', authLimit, login);
router.get('/auth/me', me);
router.post('/auth/logout', logout);
router.patch('/auth/profile', requireAuth, profile);
router.post('/auth/password', requireAuth, authLimit, changePassword);
router.use('/admin', requireAdmin);
router.get('/admin/restaurants', platformRestaurants);
router.patch('/admin/restaurants/:id', platformRestaurantStatus);
router.get('/admin/orders', adminOrders);
router.patch('/admin/orders/:id', adminOrderStatus);
router.get('/admin/reservations', adminReservations);
router.patch('/admin/reservations/:id', adminReservationStatus);
router.patch('/admin/menu/:id', adminAvailability);
export default router;
