import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import { readLocal, writeLocal } from './localStore.js';
import { legacyRestaurant } from '../../../shared/restaurants.js';
import { fail } from '../utils/errors.js';
const online = () => mongoose.connection.readyState === 1;
export const publicRestaurant = ({ownerId: _ownerId, _id: _mongoId, __v: _version, phone: _phone, ...rest}) => rest;
export async function restaurants({all=false}={}) {
  const stored = online() ? await Restaurant.find(all?{}:{status:'published'}).lean() : await readLocal(data => Object.values(data.restaurants || {}).filter(item=>all || item.status==='published'));
  return [legacyRestaurant,...stored].map(publicRestaurant);
}
export async function restaurantById(id) {
  if(id===legacyRestaurant.id) return legacyRestaurant;
  return online() ? Restaurant.findOne({id}).lean() : readLocal(data=>data.restaurants?.[id] || null);
}
export async function ownedRestaurant(ownerId) {
  return online() ? Restaurant.findOne({ownerId}).lean() : readLocal(data=>Object.values(data.restaurants || {}).find(item=>item.ownerId===ownerId) || null);
}
export async function createRestaurant(data) {
  if(online()) { try { return (await Restaurant.create(data)).toObject(); } catch(error) { if(error.code===11000) fail('Your account already has a restaurant workspace.',409); throw error; } }
  return writeLocal(store=>{ store.restaurants ||= {}; if(Object.values(store.restaurants).some(item=>item.ownerId===data.ownerId)) fail('Your account already has a restaurant workspace.',409); store.restaurants[data.id]=data; return data; });
}
export async function changeRestaurant(id, changes, expectedStatus) {
  if(online()) return Restaurant.findOneAndUpdate({id,...(expectedStatus?{status:expectedStatus}:{})},{$set:changes},{returnDocument:'after'}).lean();
  return writeLocal(data=>{const item=data.restaurants?.[id]; if(!item || (expectedStatus && item.status!==expectedStatus)) return null; Object.assign(item,changes); return item;});
}
export async function menuItems(restaurantId) {
  return online() ? MenuItem.find(restaurantId?{restaurantId}:{}).lean() : readLocal(data=>Object.values(data.menuItems || {}).filter(item=>!restaurantId || item.restaurantId===restaurantId));
}
export async function writeMenuItem(data, create=false) {
  if(online()) return create ? (await MenuItem.create(data)).toObject() : MenuItem.findOneAndUpdate({id:data.id,restaurantId:data.restaurantId},{$set:data},{returnDocument:'after'}).lean();
  return writeLocal(store=>{store.menuItems ||= {}; if(!create && store.menuItems[data.id]?.restaurantId!==data.restaurantId) return null; store.menuItems[data.id]=data; return data;});
}
