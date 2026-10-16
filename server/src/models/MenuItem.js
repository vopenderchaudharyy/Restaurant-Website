import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  id:{type:String,required:true,unique:true}, restaurantId:{type:String,required:true,index:true},
  name:String, description:String, category:String, price:Number, image:String,
  veg:Boolean, available:{type:Boolean,default:true},
}, {timestamps:true});
export default mongoose.model('MenuItem',schema,'menu_items');
