import { demoRestaurants, legacyRestaurant } from './restaurants.js';
import { additionalDemoDishes } from './demoMenu.js';

const originalMenu = [
  {
    id: 'margherita',
    name: 'Margherita Pizza',
    category: 'Pizzas',
    price: 299,
    image: '/images/design/pizza.jpg',
    rating: 4.8,
    reviews: 120,
    veg: true,
    tag: 'Crowd favourite',
    description:
      'A little taste of Naples. Our slow-fermented crust, San Marzano tomatoes, fresh mozzarella and fragrant basil, finished in the wood-fired oven.',
  },
  {
    id: 'truffle-pasta',
    name: 'Truffle Pasta',
    category: 'Pasta',
    price: 349,
    image: '/images/design/pasta.jpg',
    rating: 4.7,
    reviews: 98,
    veg: true,
    tag: '',
    description:
      'Silky pasta tossed with a rich parmesan cream, earthy mushrooms and a delicate drizzle of truffle oil. Comfort food, beautifully done.',
  },
  {
    id: 'grilled-chicken',
    name: 'Grilled Chicken',
    category: 'Main Course',
    price: 399,
    image: '/images/design/chicken.jpg',
    rating: 4.8,
    reviews: 76,
    veg: false,
    tag: 'Chef’s special',
    description:
      'Tender chicken marinated with herbs and spices, grilled to perfection and served with seasonal vegetables and our signature sauce.',
  },
  {
    id: 'paneer-tikka',
    name: 'Paneer Tikka',
    category: 'Starters',
    price: 299,
    image: '/images/design/paneer.jpg',
    rating: 4.6,
    reviews: 64,
    veg: true,
    tag: '',
    description:
      'Soft paneer, fragrant spices and a generous helping of comfort. Served with a bright mint chutney and fresh seasonal accompaniments.',
  },
  {
    id: 'classic-burger',
    name: 'Classic Burger',
    category: 'Main Course',
    price: 249,
    image: '/images/design/burger.jpg',
    rating: 4.5,
    reviews: 90,
    veg: false,
    tag: 'Best seller',
    description:
      'A juicy grilled patty, melted cheese, crisp lettuce and our house sauce, tucked inside a toasted brioche bun. Served with golden fries.',
  },
  {
    id: 'chocolate-cake',
    name: 'Chocolate Lava Cake',
    category: 'Desserts',
    price: 199,
    image: '/images/design/cake.jpg',
    rating: 4.9,
    reviews: 110,
    veg: true,
    tag: 'Sweet ending',
    description:
      'Rich chocolate, a soft centre and a moment worth slowing down for. Our signature chocolate cake is baked fresh in small batches.',
  },
  {
    id: 'garden-bowl',
    name: 'Garden Harvest Bowl',
    category: 'Starters',
    price: 229,
    image: '/images/food-1.png',
    rating: 4.7,
    reviews: 45,
    veg: true,
    tag: 'Fresh & seasonal',
    description:
      'A vibrant bowl of seasonal greens, grains and colourful vegetables with our bright house dressing.',
  },
  {
    id: 'iced-coffee',
    name: 'Cold Brew Coffee',
    category: 'Beverages',
    price: 149,
    image: '/images/design/coffee.jpg',
    rating: 4.6,
    reviews: 38,
    veg: true,
    tag: '',
    description:
      'Slow-steeped coffee, poured over ice. Smooth, refreshing and the perfect companion to a leisurely lunch.',
  },
];

export const menu = [...originalMenu, ...additionalDemoDishes].map((dish) => {
  const restaurant =
    demoRestaurants.find((venue) => venue.id === dish.restaurantId) || legacyRestaurant;
  return {
    ...dish,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantCity: restaurant.city,
    restaurantAddress: restaurant.address,
    restaurantImage: restaurant.image,
    deliveryFee: restaurant.deliveryFee,
    minOrder: restaurant.minOrder,
    etaMin: restaurant.etaMin,
    etaMax: restaurant.etaMax,
    demo: true,
  };
});

export const categories = [
  'All Dishes',
  'Starters',
  'Main Course',
  'Pizzas',
  'Pasta',
  'Desserts',
  'Beverages',
];
export const extras = [
  { id: 'sauce', name: 'Extra Sauce', price: 30 },
  { id: 'potatoes', name: 'Mashed Potatoes', price: 50 },
  { id: 'vegetables', name: 'Grilled Vegetables', price: 40 },
];
export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
export const cartDish = (item, catalog = menu) =>
  catalog.find((dish) => dish.id === item.dishId) || item.dish;
export const itemPrice = (item, catalog) =>
  ((catalog
    ? catalog.find((dish) => dish.id === item.dishId)
    : item.dish || menu.find((dish) => dish.id === item.dishId)
  )?.price || 0) +
  (item.size === 'large' ? 100 : 0) +
  extras
    .filter((extra) => item.extras?.includes(extra.id))
    .reduce((sum, extra) => sum + extra.price, 0);
export function totals(items, fulfillment = 'delivery', catalog, deliveryFee) {
  const subtotal = items.reduce((sum, item) => sum + itemPrice(item, catalog) * item.quantity, 0);
  const fee = deliveryFee ?? items[0]?.dish?.deliveryFee ?? 50;
  const delivery = subtotal && fulfillment === 'delivery' ? fee : 0;
  const tax = Math.round((subtotal + delivery) * 0.05);
  return { subtotal, delivery, tax, total: subtotal + delivery + tax };
}
