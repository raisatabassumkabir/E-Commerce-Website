require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');

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

const PRODUCTS = [
  {
    title: 'Oversized Cotton Tee',
    description: 'A relaxed-fit premium cotton tee with a dropped shoulder silhouette. Perfect for everyday wear.',
    price: 49.99,
    comparePrice: 65.00,
    category: 'Men',
    subcategory: 'T-Shirts',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Black', hex: '#000000' }, { name: 'Sage', hex: '#7DAA92' }],
    tags: ['casual', 'cotton', 'oversized', 'basics'],
    inventoryCount: 120,
    isFeatured: true,
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
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Indigo', hex: '#4B0082' }, { name: 'Light Wash', hex: '#A8C5DA' }],
    tags: ['denim', 'flare', 'vintage', 'high-waist'],
    inventoryCount: 75,
    isFeatured: true,
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
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Camel', hex: '#C19A6B' }, { name: 'Navy', hex: '#001F5B' }, { name: 'Burgundy', hex: '#800020' }],
    tags: ['wool', 'merino', 'winter', 'knitwear'],
    inventoryCount: 45,
    isFeatured: false,
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
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Terracotta', hex: '#CC4E2A' }, { name: 'Ivory', hex: '#FFFFF0' }, { name: 'Dusty Rose', hex: '#DCAE96' }],
    tags: ['linen', 'summer', 'wrap', 'elegant'],
    inventoryCount: 60,
    isFeatured: true,
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'Olive', hex: '#556B2F' }, { name: 'Khaki', hex: '#C3B091' }, { name: 'Black', hex: '#000000' }],
    tags: ['cargo', 'utility', 'streetwear', 'pockets'],
    inventoryCount: 90,
    isFeatured: false,
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
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Cream', hex: '#FFFDD0' }, { name: 'Mocha', hex: '#6B4226' }, { name: 'Black', hex: '#000000' }],
    tags: ['knit', 'cardigan', 'crop', 'layering'],
    inventoryCount: 55,
    isFeatured: true,
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
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Champagne', hex: '#F7E7CE' }, { name: 'Midnight Blue', hex: '#191970' }, { name: 'Blush', hex: '#FFB6C1' }],
    tags: ['satin', 'skirt', 'midi', 'evening'],
    inventoryCount: 40,
    isFeatured: false,
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'Black', hex: '#000000' }, { name: 'Tan', hex: '#D2B48C' }],
    tags: ['leather', 'bomber', 'jacket', 'outerwear'],
    inventoryCount: 25,
    isFeatured: true,
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
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Green', hex: '#4CAF50' }, { name: 'Blue', hex: '#2196F3' }],
    tags: ['kids', 'hoodie', 'dino', 'fleece'],
    inventoryCount: 100,
    isFeatured: false,
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
    sizes: ['7', '8', '9', '10', '11', '12'],
    colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Black', hex: '#000000' }, { name: 'Red', hex: '#FF0000' }],
    tags: ['sneakers', 'canvas', 'classic', 'streetwear'],
    inventoryCount: 80,
    isFeatured: true,
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
    sizes: ['One Size'],
    colors: [{ name: 'Floral Multi', hex: '#FF69B4' }, { name: 'Navy', hex: '#001F5B' }],
    tags: ['silk', 'scarf', 'accessories', 'luxury'],
    inventoryCount: 35,
    isFeatured: false,
    images: [
      { url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800', publicId: 'seed/scarf_1', alt: 'Silk Neck Scarf' },
    ],
  },
  {
    title: 'Puffer Vest',
    description: 'Lightweight insulated puffer vest. Packable design with zip pockets.',
    price: 84.99,
    comparePrice: 109.99,
    category: 'Sale',
    subcategory: 'Outerwear',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'Navy', hex: '#001F5B' }, { name: 'Forest Green', hex: '#228B22' }, { name: 'Rust', hex: '#B7410E' }],
    tags: ['puffer', 'vest', 'lightweight', 'sale'],
    inventoryCount: 50,
    isFeatured: false,
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800', publicId: 'seed/vest_1', alt: 'Puffer Vest' },
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
  const user = await User.create(SAMPLE_USER);
  console.log(`✅  Created admin: ${admin.email}`);
  console.log(`✅  Created user: ${user.email}`);

  // Create products
  const products = await Product.insertMany(PRODUCTS);
  console.log(`✅  Created ${products.length} products.`);

  // Create sample reviews
  const reviewData = [
    { user: user._id, product: products[0]._id, rating: 5, comment: 'Amazing quality, love the fit!', title: 'Perfect tee', verified: true },
    { user: user._id, product: products[1]._id, rating: 4, comment: 'Great jeans, runs slightly small.', title: 'Love these jeans', verified: true },
    { user: admin._id, product: products[0]._id, rating: 5, comment: 'Bestseller for a reason. Excellent cotton.', title: 'Staff pick', verified: false },
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
