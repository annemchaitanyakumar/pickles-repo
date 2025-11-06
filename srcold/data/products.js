import chickenPickle from '../assets/chicken-pickle.jpg';
import muttonPickle from '../assets/mutton-pickle.jpg';
import fishPickle from '../assets/fish-pickle.jpg';
import prawnPickle from '../assets/prawn-pickle.jpg';
import mangoPickle from '../assets/mango-pickle.jpg';
import mixedVegPickle from '../assets/mixed-veg-pickle.jpg';
import pickleJar1 from '../assets/pickle-jar-1.jpg';

/**
 * @typedef {Object} Product
 * @property {string} id - Unique identifier for the product
 * @property {string} name - Name of the product
 * @property {number} price - Price of the product
 * @property {string} image - Image URL of the product
 * @property {'non-veg' | 'veg'} category - Category of the product
 * @property {string} description - Description of the product
 * @property {string[]} ingredients - List of ingredients
 * @property {string} weight - Weight of the product
 */

/** @type {Product[]} */
export const products = [
  {
    id: '1',
    name: 'Traditional Chicken Pickle',
    price: 299,
    image: chickenPickle,
    category: 'non-veg',
    description: 'Authentic Andhra-style chicken pickle made with fresh spices and mustard oil. Perfectly tender chicken pieces marinated in traditional spices.',
    ingredients: ['Chicken', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Garlic', 'Ginger', 'Fenugreek Seeds'],
    weight: '500g'
  },
  {
    id: '2',
    name: 'Spicy Mutton Pickle',
    price: 349,
    image: muttonPickle,
    category: 'non-veg',
    description: 'Rich and flavorful mutton pickle prepared with a blend of aromatic spices. Made from tender mutton pieces slow-cooked to perfection.',
    ingredients: ['Mutton', 'Mustard Oil', 'Red Chili', 'Garlic', 'Ginger', 'Spices', 'Curry Leaves'],
    weight: '500g'
  },
  {
    id: '3',
    name: 'Tangy Fish Pickle',
    price: 279,
    image: fishPickle,
    category: 'non-veg',
    description: 'Delicious fish pickle made with fresh fish and tangy spices. A perfect accompaniment for rice and rotis.',
    ingredients: ['Fish', 'Mustard Oil', 'Vinegar', 'Turmeric', 'Garlic', 'Red Chili', 'Fenugreek'],
    weight: '400g'
  },
  {
    id: '4',
    name: 'Spicy Prawn Pickle',
    price: 329,
    image: prawnPickle,
    category: 'non-veg',
    description: 'Mouth-watering prawn pickle prepared with fresh prawns and authentic spices. A coastal delicacy.',
    ingredients: ['Prawns', 'Mustard Oil', 'Red Chili', 'Garlic', 'Ginger', 'Vinegar', 'Curry Leaves'],
    weight: '400g'
  },
  {
    id: '5',
    name: 'Sweet Mango Pickle',
    price: 199,
    image: mangoPickle,
    category: 'veg',
    description: 'Traditional sweet and spicy mango pickle made with raw mangoes and aromatic spices.',
    ingredients: ['Raw Mango', 'Mustard Oil', 'Jaggery', 'Red Chili', 'Fenugreek', 'Turmeric', 'Salt'],
    weight: '500g'
  },
  {
    id: '6',
    name: 'Mixed Vegetable Pickle',
    price: 249,
    image: mixedVegPickle,
    category: 'veg',
    description: 'A delightful mix of various vegetables pickled with traditional spices and herbs.',
    ingredients: ['Carrot', 'Cauliflower', 'Green Chili', 'Ginger', 'Mustard Oil', 'Vinegar', 'Spices'],
    weight: '500g'
  }
];
