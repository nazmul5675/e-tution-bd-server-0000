
---

## ✅ `e-tution-bd-server/README.md`

```md
# E-Tuition BD — Server (Backend)

REST API for the **Tuition Management System**, built with **Express** and **MongoDB**.  
It uses **Firebase Admin** to verify authenticated requests (Bearer token) and **Stripe** for payments.

## 🔗 Live Links
- **Server API:** https://e-tution-bd-server-pearl.vercel.app/
- **Client Live Site:** https://etutuitionbd.web.app

## 🎯 Purpose
Provide secure APIs for:
- user/profile management with roles (Student/Tutor/Admin)
- tuition post moderation workflow (Pending → Approved/Rejected)
- tutor applications + approval through payment
- payment history & analytics reporting
- contact messages module

## ✨ Core Features
- **Firebase Admin token verification** for protected routes
- **Role-based access** (Student/Tutor/Admin)
- CRUD for:
  - Users
  - Tuitions
  - Applications
  - Payments
  - Contacts
- Stripe checkout session creation + payment confirmation
- Admin moderation for tuition posts & user roles

## 🧰 Tech Stack
- Node.js
- Express
- MongoDB (Atlas)
- Firebase Admin SDK (token verification)
- Stripe
- dotenv
- cors

## 📦 Packages Used
- express
- mongodb
- firebase-admin
- stripe
- dotenv
- cors
- nodemon

## ⚙️ Run Locally (Server)

### Prerequisites
- Node.js (LTS recommended)
- MongoDB Atlas database
- Stripe account (secret key)
- Firebase service account (Admin SDK)

### Steps
```bash
git clone <your-server-repo-url>
cd e-tution-bd-server
npm install
npm run start

🔐 Environment Variables (Server)

Create a .env file in the server root:
PORT=3000

DB_USER=your_mongo_user
DB_PASS=your_mongo_pass

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret_if_used

CLIENT_URL=https://etutuitionbd.web.app

# Firebase Admin service account JSON -> base64 encoded string
FIREBASE_SERVICE_ACCOUNT_BASE64=your_base64_encoded_service_account_json


✅ Notes:

Keep .env out of git and never share service account files publicly.

Store Firebase service account safely (recommended: base64 string in env).

🧪 API Overview (Main Routes)

POST /users — create/save user in DB (uses decoded email)

GET /users — list users

GET /users/profile — get current user profile

PATCH /users/profile — update profile

PATCH /users/:id — admin update user/role

DELETE /users/:id — admin delete user

POST /tuitions — student creates tuition post (Pending)

GET /tuitions — list/filter tuitions

GET /tuitions/:id — tuition details

PATCH /tuitions/:id/status — admin approve/reject

PATCH /tuitions/:id — student update tuition

DELETE /tuitions/:id — student delete tuition

POST /applications — tutor applies

GET /applications — list applications

PATCH /applications/:id — update application

PATCH /applications/:id/reject — student rejects

POST /payments/create-checkout-session — create Stripe session

POST /payments/confirm — confirm payment + approve tutor application

GET /payments — payment history

POST /contacts — contact messages

GET /contacts — admin view contacts

PATCH /contacts/:id/status — update contact status

DELETE /contacts/:id — delete contact