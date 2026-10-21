import Restaurant from './Restaurant.js';
import MenuItem from './MenuItem.js';
import User from './User.js';
import Session from './Session.js';
import MenuAvailability from './MenuAvailability.js';
import { recordModels } from './Record.js';
import PaymentAttempt from './PaymentAttempt.js';
import PasswordReset from './PasswordReset.js';
export const databaseModels = [
  User,
  Session,
  MenuAvailability,
  Restaurant,
  MenuItem,
  PaymentAttempt,
  PasswordReset,
  ...recordModels,
];
