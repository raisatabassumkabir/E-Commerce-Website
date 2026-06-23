# ThreadHaus — Clothing E-Commerce Core Rules

## Project Overview
Production-grade MERN clothing e-commerce. Monorepo with `server/` (Node/Express/MongoDB) and `client/` (React/Vite/Tailwind/Zustand).

## Architecture & Tech Stack
- **Frontend:** React 18 (Vite), Tailwind CSS v3, Zustand (persist), React Router v6, Axios (withCredentials), react-hot-toast, lucide-react
- **Backend:** Node.js 18+, Express 4, MongoDB Atlas (Mongoose 8), Cloudinary (media), Stripe (payments)
- **Auth:** JWT stored in httpOnly, secure, sameSite cookies. Never localStorage.
- **Error handling:** All async controllers MUST use the `asyncHandler` wrapper. Never raw try/catch in controllers.

## Critical Inventory Rules
- **Public Product API (`GET /api/products`, `GET /api/products/:id`) MUST NEVER expose `inventoryCount`.**
  Use `.select('-inventoryCount')` on all public queries. Customer sees ONLY `isAvailable` (boolean).
- **Admin API (`GET /api/admin/products`) includes `inventoryCount`** for stock management.
- Inventory adjustments MUST use atomic Mongoose `$inc` with a conditional filter:
  ```js
  Product.findOneAndUpdate(
    { _id: productId, inventoryCount: { $gte: quantityRequested } },
    { $inc: { inventoryCount: -quantityRequested } },
    { new: true }
  )
  ```
  If result is `null`, stock was insufficient → throw 400 and abort the entire order.
- **Order cancellation / payment failure MUST restore inventory atomically:**
  ```js
  Product.findByIdAndUpdate(id, { $inc: { inventoryCount: +quantity } })
  ```

## Availability Computation
- Computed at runtime: `isAvailable = inventoryCount > 0`
- Exposed as a Mongoose virtual in the schema.
- The toJSON transform adds `isAvailable` and removes `inventoryCount` automatically for public use.

## Coding Standards
- Wrap all async route handlers: `asyncHandler(async (req, res, next) => { ... })`
- Validation: `express-validator` in route files, checked at top of controller with `validationResult`.
- Custom errors: `throw new AppError('message', statusCode)`
- Admin middleware chain: `protect → adminOnly` on every admin route.
- Server-side price validation at checkout: never trust client-submitted prices.

## File Conventions
- Controllers in `server/src/controllers/`
- Routes in `server/src/routes/`
- Models in `server/src/models/`
- Client stores in `client/src/store/`
- Client pages in `client/src/pages/` (user) and `client/src/admin/` (admin)
- Client components in `client/src/components/`

## API Endpoint Map
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/products | Public | List (no inventoryCount) |
| GET | /api/products/:id | Public | Single (no inventoryCount) |
| GET | /api/admin/products | Admin | List WITH inventoryCount |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/:id | Admin | Update product |
| DELETE | /api/products/:id | Admin | Delete product |
| POST | /api/orders | User | Create + atomic inventory decrement |
| PUT | /api/orders/:id/cancel | User/Admin | Cancel + atomic inventory restore |
| PUT | /api/orders/:id/status | Admin | Update delivery status |
| POST | /api/payment/create-checkout-session | User | Stripe session |
| POST | /api/payment/webhook | Stripe | Mark order Paid, decrement inventory |

## Design System
- Color palette: brand (purple #c044f0), dark-900 background
- Component classes: `.btn-primary`, `.btn-secondary`, `.glass`, `.glass-sm`, `.card`, `.input`, `.badge-*`
- All interactive elements must have unique descriptive `id` attributes for testability.
