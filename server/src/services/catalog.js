import mongoose from 'mongoose';
import { menu } from '../../../shared/menu.js';
import { legacyRestaurant } from '../../../shared/restaurants.js';
import MenuAvailability from '../models/MenuAvailability.js';
import { readLocal, writeLocal } from './localStore.js';
import { restaurants, menuItems, writeMenuItem } from './marketplace.js';
import { fail } from '../utils/errors.js';

export async function getCatalog() {
  const settings = mongoose.connection.readyState === 1
    ? Object.fromEntries((await MenuAvailability.find().lean()).map(entry=>[entry.id,entry.available]))
    : await readLocal(data=>data.availability);
  const venues=await restaurants();
  const enrich=(dish,restaurant)=>({...dish,restaurantId:restaurant.id,restaurantName:restaurant.name,restaurantAddress:restaurant.address,restaurantImage:restaurant.image,restaurantCity:restaurant.city,deliveryFee:restaurant.deliveryFee,minOrder:restaurant.minOrder,etaMin:restaurant.etaMin,etaMax:restaurant.etaMax,available:dish.available!==false && restaurant.acceptingOrders, demo:!!restaurant.demo});
  const original=menu.map(dish=>enrich({...dish,available:settings[dish.id]!==false},legacyRestaurant));
  const partners=(await menuItems()).flatMap(item=>{ const venue=venues.find(restaurant=>restaurant.id===item.restaurantId); if(!venue) return []; const {_id:MongoId,__v:Version,...dish}=item; return [enrich(dish,venue)]; });
  return [...original,...partners];
}
export async function setAvailability(id, available) {
  if(typeof available!=='boolean') fail('Availability must be true or false.');
  if(!menu.some(dish=>dish.id===id)) {
    const dish=(await menuItems()).find(item=>item.id===id);
    if(!dish) fail('Dish not found.',404);
    await writeMenuItem({...dish,available});
    return {id,available};
  }
  if(mongoose.connection.readyState===1) await MenuAvailability.findOneAndUpdate({id},{$set:{available}},{upsert:true});
  else await writeLocal(data=>{data.availability[id]=available;});
  return {id,available};
}
