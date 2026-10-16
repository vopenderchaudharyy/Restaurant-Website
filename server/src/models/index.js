import User from './User.js';
import Session from './Session.js';
import MenuAvailability from './MenuAvailability.js';
import { recordModels } from './Record.js';
export const databaseModels = [User, Session, MenuAvailability, ...recordModels];
