import { Product } from '../store/cartStore';
import chickenPickle from '../assets/chicken-pickle.jpg';
import muttonPickle from '../assets/mutton-pickle.jpg';
import fishPickle from '../assets/fish-pickle.jpg';
import prawnPickle from '../assets/prawn-pickle.jpg';
import mangoPickle from '../assets/mango-pickle.jpg';
import mixedVegPickle from '../assets/mixed-veg-pickle.jpg';
import pickleJar1 from '../assets/pickle-jar-1.jpg';

export const products: Product[] = [
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
    price: 399,
    image: muttonPickle,
    category: 'non-veg',
    description: 'Rich and flavorful mutton pickle with aromatic spices. Slow-cooked to perfection with traditional methods.',
    ingredients: ['Mutton', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Garlic', 'Ginger', 'Coriander Seeds'],
    weight: '500g'
  },
  {
    id: '3',
    name: 'Coastal Fish Pickle',
    price: 249,
    image: fishPickle,
    category: 'non-veg',
    description: 'Fresh fish pickle with coastal spices. Made with premium fish and traditional coastal recipe.',
    ingredients: ['Fish', 'Coconut Oil', 'Red Chili Powder', 'Turmeric', 'Tamarind', 'Curry Leaves', 'Mustard Seeds'],
    weight: '400g'
  },
  {
    id: '4',
    name: 'Tangy Prawn Pickle',
    price: 349,
    image: prawnPickle,
    category: 'non-veg',
    description: 'Delicious prawn pickle with a perfect balance of tangy and spicy flavors. Made with fresh prawns.',
    ingredients: ['Prawns', 'Sesame Oil', 'Red Chili Powder', 'Turmeric', 'Tamarind', 'Garlic', 'Curry Leaves'],
    weight: '400g'
  },
  {
    id: '5',
    name: 'Classic Mango Pickle',
    price: 199,
    image: mangoPickle,
    category: 'veg',
    description: 'Traditional mango pickle made with raw mangoes and authentic spices. A classic favorite.',
    ingredients: ['Raw Mango', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Fenugreek Seeds', 'Mustard Seeds'],
    weight: '500g'
  },
  {
    id: '6',
    name: 'Mixed Vegetable Pickle',
    price: 179,
    image: mixedVegPickle,
    category: 'veg',
    description: 'Colorful mix of seasonal vegetables pickled with aromatic spices. Perfect blend of flavors.',
    ingredients: ['Mixed Vegetables', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Asafoetida', 'Nigella Seeds'],
    weight: '500g'
  },
  {
    id: '7',
    name: 'Lemon Pickle',
    price: 159,
    image: pickleJar1,
    category: 'veg',
    description: 'Zesty lemon pickle with traditional spices. Tangy and flavorful, perfect with any meal.',
    ingredients: ['Lemons', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Asafoetida', 'Fenugreek Seeds'],
    weight: '400g'
  },
  {
    id: '8',
    name: 'Garlic Pickle',
    price: 169,
    image: pickleJar1,
    category: 'veg',
    description: 'Pungent garlic pickle with robust flavors. Made with fresh garlic cloves and premium spices.',
    ingredients: ['Garlic', 'Mustard Oil', 'Red Chili Powder', 'Turmeric', 'Coriander Seeds', 'Cumin Seeds'],
    weight: '300g'
  }
];