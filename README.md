# E-Commerce Website

A modern, fully-featured e-commerce platform built with the MERN stack (MongoDB, Express.js, React, Node.js).

## 🚀 Features

- **User Authentication:** Secure signup, login, password reset via email.
- **Product Catalog:** Browse, search, and view detailed product information.
- **Shopping Cart & Checkout:** Seamless cart management and secure checkout process.
- **Payment Processing:** Integrated with Stripe for secure credit card transactions.
- **Order Management:** View order history and track order status.
- **Admin Dashboard:** Comprehensive admin panel to manage products, view orders, and manage store settings.
- **Real-time Updates:** Socket.IO integration for real-time notifications.
- **Image Uploads:** Cloudinary integration for robust media storage.
- **Responsive Design:** Beautiful, mobile-friendly UI built with Tailwind CSS.

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Routing:** React Router v7
- **API Client:** Axios
- **Icons:** Lucide React
- **Payments:** Stripe Elements (`@stripe/react-stripe-js`)

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & BcryptJS
- **Payments:** Stripe API
- **File Storage:** Cloudinary & Multer
- **Emails:** Gmail REST API (Fetch)
- **Real-time:** Socket.IO

## 📁 Project Structure

The repository is organized into two main directories:
- `/client`: Contains the frontend React application.
- `/server`: Contains the backend Express application and API.

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or MongoDB Atlas)
- Stripe Account (for payments)
- Cloudinary Account (for image uploads)
- Gmail Account (for transactional emails via OAuth2)

### 1. Clone the repository
```bash
git clone https://github.com/raisatabassumkabir/E-Commerce-Website.git
cd E-Commerce-Website
```

### 2. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory and configure the necessary environment variables (refer to `.env.example` if available):
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_USER`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

Start the development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
npm install
```
Create a `.env` file in the `client` directory and configure the environment variables:
- `VITE_API_URL` (Point to your backend server)
- `VITE_STRIPE_PUBLIC_KEY`

Start the frontend development server:
```bash
npm run dev
```

## 📜 License
This project is open-source and available under the MIT License.
