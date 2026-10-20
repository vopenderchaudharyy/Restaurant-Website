export const legacyRestaurant = {
  id: 'menumate-kitchen',
  name: 'MenuMate Kitchen',
  cuisine: 'Global',
  city: 'Bengaluru',
  area: 'MG Road',
  address: '123, MG Road, Bengaluru',
  description:
    'Fresh favourites, wood-fired pizzas and comforting classics. Explore the original MenuMate demo kitchen.',
  image: '/images/design/restaurant.jpg',
  deliveryFee: 50,
  minOrder: 0,
  etaMin: 30,
  etaMax: 40,
  acceptingOrders: true,
  status: 'published',
  demo: true,
};
export const cuisineOptions = [
  'Indian',
  'Italian',
  'Asian',
  'Fast Food',
  'Healthy',
  'Desserts',
  'Cafe',
  'Global',
];
export const foodImages = [
  ['restaurant', 'Dining room'],
  ['pizza', 'Pizza'],
  ['pasta', 'Pasta'],
  ['chicken', 'Grilled main'],
  ['paneer', 'Paneer'],
  ['burger', 'Burger'],
  ['cake', 'Dessert'],
  ['coffee', 'Coffee'],
];

// Fictional, explicitly labelled examples; registered partner data remains in MongoDB.
export const demoRestaurants = [
  legacyRestaurant,
  ...[
    ['demo-spice-courtyard', 'Spice Courtyard', 'Indian', 'Indiranagar', 'paneer', 35, 25, 40],
    ['demo-basil-oven', 'Basil & Oven', 'Italian', 'Koramangala', 'pizza', 40, 25, 40],
    ['demo-wok-garden', 'Wok Garden', 'Asian', 'Whitefield', 'chicken', 45, 30, 45],
    ['demo-bun-street', 'Bun Street', 'Fast Food', 'HSR Layout', 'burger', 25, 20, 30],
    ['demo-green-table', 'Green Table', 'Healthy', 'Jayanagar', 'paneer', 30, 20, 35],
    ['demo-sweet-studio', 'Sweet Studio', 'Desserts', 'JP Nagar', 'cake', 25, 20, 30],
    ['demo-daily-brew', 'Daily Brew', 'Cafe', 'Malleshwaram', 'coffee', 20, 15, 25],
  ].map(([id, name, cuisine, area, image, deliveryFee, etaMin, etaMax]) => ({
    id,
    name,
    cuisine,
    area,
    city: 'Bengaluru',
    address: `${area}, Bengaluru (sample location)`,
    description: `Explore the ${cuisine.toLowerCase()} sample menu at ${name}. This is a fictional demo restaurant with illustrative food photography; no food is dispatched.`,
    image: `/images/design/${image}.jpg`,
    deliveryFee,
    minOrder: 0,
    etaMin,
    etaMax,
    acceptingOrders: true,
    status: 'published',
    demo: true,
  })),
];
