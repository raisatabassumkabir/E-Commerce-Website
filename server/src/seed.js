require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Review = require('./models/Review');

// ── Sample Data ────────────────────────────────────────────────────────────────
const ADMIN = {
  name: 'Admin User',
  email: 'admin@threadhaus.com',
  password: 'Admin1234!',
  role: 'admin',
};

const SAMPLE_USER = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Password1234!',
  role: 'user',
};

// Helper: spread inventory evenly across sizes for a given colour
const makeVariant = (color, hex, sizes, totalInventory) => {
  const perSize = Math.round(totalInventory / sizes.length);
  return {
    color,
    hex,
    image: '',
    sizes: sizes.map((size, i) => ({
      size,
      // Give the last size the remainder so totals add up exactly
      inventoryCount: i === sizes.length - 1
        ? totalInventory - perSize * (sizes.length - 1)
        : perSize,
    })),
  };
};

const PRODUCTS = [
  {
    title: 'Oversized Cotton Tee',
    description: 'A relaxed-fit premium cotton tee with a dropped shoulder silhouette. Perfect for everyday wear.',
    price: 49.99,
    comparePrice: 65.00,
    category: 'Men',
    subcategory: 'T-Shirts',
    tags: ['casual', 'cotton', 'oversized', 'basics'],
    isFeatured: true,
    variants: [
      makeVariant('White', '#FFFFFF', ['S', 'M', 'L', 'XL', 'XXL'], 40),
      makeVariant('Black', '#111111', ['S', 'M', 'L', 'XL', 'XXL'], 50),
      makeVariant('Sage',  '#7DAA92', ['S', 'M', 'L', 'XL'],        30),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', publicId: 'seed/tee_1', alt: 'Oversized Cotton Tee' },
    ],
  },
  {
    title: 'High-Waist Flare Jeans',
    description: 'Vintage-inspired high-rise flare jeans made from stretch denim. Flattering for all body types.',
    price: 89.99,
    comparePrice: 120.00,
    category: 'Women',
    subcategory: 'Bottoms',
    tags: ['denim', 'flare', 'vintage', 'high-waist'],
    isFeatured: true,
    variants: [
      makeVariant('Indigo',     '#4B0082', ['XS', 'S', 'M', 'L', 'XL'], 40),
      makeVariant('Light Wash', '#A8C5DA', ['XS', 'S', 'M', 'L', 'XL'], 35),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800', publicId: 'seed/jeans_1', alt: 'High-Waist Flare Jeans' },
    ],
  },
  {
    title: 'Merino Wool Crewneck',
    description: 'Ultra-soft 100% merino wool sweater. Temperature regulating and naturally odor resistant.',
    price: 129.99,
    comparePrice: 160.00,
    category: 'Men',
    subcategory: 'Knitwear',
    tags: ['wool', 'merino', 'winter', 'knitwear'],
    isFeatured: false,
    variants: [
      makeVariant('Camel',    '#C19A6B', ['S', 'M', 'L', 'XL'], 15),
      makeVariant('Navy',     '#001F5B', ['S', 'M', 'L', 'XL'], 15),
      makeVariant('Burgundy', '#800020', ['S', 'M', 'L', 'XL'], 15),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800', publicId: 'seed/sweater_1', alt: 'Merino Wool Crewneck' },
    ],
  },
  {
    title: 'Linen Wrap Dress',
    description: 'Effortlessly elegant linen wrap dress with adjustable tie waist. Breathable and perfect for warm days.',
    price: 79.99,
    comparePrice: 110.00,
    category: 'Women',
    subcategory: 'Dresses',
    tags: ['linen', 'summer', 'wrap', 'elegant'],
    isFeatured: true,
    variants: [
      makeVariant('Terracotta', '#CC4E2A', ['XS', 'S', 'M', 'L', 'XL'], 20),
      makeVariant('Ivory',      '#FFFFF0', ['XS', 'S', 'M', 'L', 'XL'], 20),
      makeVariant('Dusty Rose', '#DCAE96', ['XS', 'S', 'M', 'L', 'XL'], 20),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=800', publicId: 'seed/dress_1', alt: 'Linen Wrap Dress' },
    ],
  },
  {
    title: 'Cargo Utility Pants',
    description: 'Modern-cut cargo pants with multiple functional pockets. Made from durable ripstop fabric.',
    price: 95.00,
    category: 'Men',
    subcategory: 'Bottoms',
    tags: ['cargo', 'utility', 'streetwear', 'pockets'],
    isFeatured: false,
    variants: [
      makeVariant('Olive', '#556B2F', ['S', 'M', 'L', 'XL', 'XXL'], 30),
      makeVariant('Khaki', '#C3B091', ['S', 'M', 'L', 'XL', 'XXL'], 30),
      makeVariant('Black', '#111111', ['S', 'M', 'L', 'XL', 'XXL'], 30),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800', publicId: 'seed/cargo_1', alt: 'Cargo Utility Pants' },
    ],
  },
  {
    title: 'Ribbed Crop Cardigan',
    description: 'A versatile ribbed knit cropped cardigan. Layer it over dresses or pair with high-waist trousers.',
    price: 69.99,
    comparePrice: 89.99,
    category: 'Women',
    subcategory: 'Knitwear',
    tags: ['knit', 'cardigan', 'crop', 'layering'],
    isFeatured: true,
    variants: [
      makeVariant('Cream', '#FFFDD0', ['XS', 'S', 'M', 'L'], 18),
      makeVariant('Mocha', '#6B4226', ['XS', 'S', 'M', 'L'], 18),
      makeVariant('Black', '#111111', ['XS', 'S', 'M', 'L'], 19),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800', publicId: 'seed/cardigan_1', alt: 'Ribbed Crop Cardigan' },
    ],
  },
  {
    title: 'Satin Slip Skirt',
    description: 'Fluid satin midi skirt with a soft elastic waistband. Goes from brunch to evening effortlessly.',
    price: 59.99,
    category: 'Women',
    subcategory: 'Bottoms',
    tags: ['satin', 'skirt', 'midi', 'evening'],
    isFeatured: false,
    variants: [
      makeVariant('Champagne',    '#F7E7CE', ['XS', 'S', 'M', 'L', 'XL'], 13),
      makeVariant('Midnight Blue','#191970', ['XS', 'S', 'M', 'L', 'XL'], 13),
      makeVariant('Blush',        '#FFB6C1', ['XS', 'S', 'M', 'L', 'XL'], 14),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800', publicId: 'seed/skirt_1', alt: 'Satin Slip Skirt' },
    ],
  },
  {
    title: 'Leather Bomber Jacket',
    description: 'Classic leather bomber jacket with ribbed cuffs and collar. A forever wardrobe staple.',
    price: 249.99,
    comparePrice: 320.00,
    category: 'Men',
    subcategory: 'Outerwear',
    tags: ['leather', 'bomber', 'jacket', 'outerwear'],
    isFeatured: true,
    variants: [
      makeVariant('Black', '#111111', ['S', 'M', 'L', 'XL', 'XXL'], 13),
      makeVariant('Tan',   '#D2B48C', ['S', 'M', 'L', 'XL', 'XXL'], 12),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', publicId: 'seed/bomber_1', alt: 'Leather Bomber Jacket' },
    ],
  },
  {
    title: 'Kids Dino Print Hoodie',
    description: 'Super soft fleece hoodie with fun dinosaur print. Features a kangaroo pocket and adjustable drawstring.',
    price: 39.99,
    category: 'Kids',
    subcategory: 'Tops',
    tags: ['kids', 'hoodie', 'dino', 'fleece'],
    isFeatured: false,
    variants: [
      makeVariant('Green', '#4CAF50', ['XS', 'S', 'M', 'L'], 50),
      makeVariant('Blue',  '#2196F3', ['XS', 'S', 'M', 'L'], 50),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800', publicId: 'seed/kids_1', alt: 'Kids Dino Print Hoodie' },
    ],
  },
  {
    title: 'Canvas High-Top Sneakers',
    description: 'Classic canvas high-top sneakers with vulcanized rubber sole. Timeless street style.',
    price: 74.99,
    category: 'Footwear',
    subcategory: 'Sneakers',
    tags: ['sneakers', 'canvas', 'classic', 'streetwear'],
    isFeatured: true,
    variants: [
      makeVariant('White', '#FFFFFF', ['7', '8', '9', '10', '11', '12'], 28),
      makeVariant('Black', '#111111', ['7', '8', '9', '10', '11', '12'], 28),
      makeVariant('Red',   '#E53935', ['7', '8', '9', '10', '11', '12'], 24),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800', publicId: 'seed/sneakers_1', alt: 'Canvas High-Top Sneakers' },
    ],
  },
  {
    title: 'Silk Neck Scarf',
    description: '100% silk neck scarf with hand-rolled edges. Wear it tied at the neck, in the hair, or on a bag.',
    price: 44.99,
    category: 'Accessories',
    subcategory: 'Scarves',
    tags: ['silk', 'scarf', 'accessories', 'luxury'],
    isFeatured: false,
    variants: [
      makeVariant('Floral Multi', '#FF69B4', ['One Size'], 18),
      makeVariant('Navy',         '#001F5B', ['One Size'], 17),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800', publicId: 'seed/scarf_1', alt: 'Silk Neck Scarf' },
    ],
  },
  {
    title: 'Minimalist Bomber Jacket',
    description: 'Lightweight insulated puffer jacket. Packable design with zip pockets.',
    price: 84.99,
    comparePrice: 109.99,
    category: 'Sale',
    subcategory: 'Outerwear',
    tags: ['puffer', 'jacket', 'lightweight', 'sale'],
    isFeatured: false,
    variants: [
      makeVariant('Terracotta', '#C19A6B', ['XS', 'S', 'M', 'L', 'XL', 'XXL'], 50),
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800', publicId: 'seed/vest_1', alt: 'Minimalist Bomber Jacket' },
    ],
  },
];

// ── Seed function ──────────────────────────────────────────────────────────────
const seedDatabase = async () => {
  await connectDB();

  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data.');

  // Create users
  const admin = await User.create(ADMIN);
  const user  = await User.create(SAMPLE_USER);
  console.log(`✅  Created admin: ${admin.email}`);
  console.log(`✅  Created user:  ${user.email}`);

  // Create products
  const products = await Product.insertMany(PRODUCTS);
  console.log(`✅  Created ${products.length} products.`);

  // Create sample reviews
  const reviewData = [
    { user: user._id,  product: products[0]._id, rating: 5, comment: 'Amazing quality, love the fit!',           title: 'Perfect tee',  verified: true },
    { user: user._id,  product: products[1]._id, rating: 4, comment: 'Great jeans, runs slightly small.',         title: 'Love these jeans', verified: true },
    { user: admin._id, product: products[0]._id, rating: 5, comment: 'Bestseller for a reason. Excellent cotton.', title: 'Staff pick',   verified: false },
  ];
  await Review.insertMany(reviewData);
  console.log(`✅  Created ${reviewData.length} sample reviews.`);

  console.log('\n🎉  Seed complete!\n');
  console.log('─'.repeat(50));
  console.log('Admin credentials:');
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}`);
  console.log('\nTest user credentials:');
  console.log(`  Email:    ${SAMPLE_USER.email}`);
  console.log(`  Password: ${SAMPLE_USER.password}`);
  console.log('─'.repeat(50));

  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
