# Digital Life Lessons Server 🌟

The server-side application powering **Digital Life Lessons**, handling user authentication, lesson management, payments, comments, favorites, and admin dashboards. Built with **Node.js**, **Express**, **MongoDB**, **Firebase Admin**, and **Stripe** for premium subscription handling.

Server repo: [https://github.com/ahnafabid10/digital-life-lessons-server-side/tree/my-new-branch](https://github.com/ahnafabid10/digital-life-lessons-server-side/tree/my-new-branch)

Live Frontend Site: [https://digital-life-lesson11.netlify.app/](https://digital-life-lesson11.netlify.app/)

---

## Table of Contents
- Features
- Technology Stack
- API Endpoints & Functionality
- Installation

---

## Features

- User Authentication: Firebase token verification.
- User roles: `user` and `admin` with protected routes.
- CRUD operations for life lessons.
- Like and favorite lessons.
- Comments and reporting inappropriate lessons.
- Stripe payment integration for Premium subscriptions.
- Admin analytics: top contributors, daily/monthly stats.
- Recommended lessons by category or emotional tone.
- Secure MongoDB integration using environment variables.
- Token-based route protection for authenticated actions.
- Generate tracking IDs for premium payments.

---

## Technology Stack

**Backend:**
- Node.js + Express
- MongoDB + MongoClient
- Firebase Admin SDK (authentication)
- Stripe (payment processing)
- CORS middleware and JSON parsing
- RESTful APIs

**Dev Tools:**
- Dotenv for environment variables
- ESLint + Prettier (optional)
- GitHub version control

---

## API Endpoints & Functionality

### **Users**
- `POST /users` – Create a user
- `PATCH /users/:id` – Update user profile
- `GET /users/:id` – Get user by ID
- `GET /users/:email/role` – Get role of a user
- `PATCH /users/:id/role` – Update role (admin only)

### **Lessons**
- `POST /lessons` – Add new lesson
- `GET /lessons` – List lessons (filters: email, status, privacy)
- `GET /lessons/:id` – Get lesson by ID
- `PUT /lessons/:id` – Update lesson
- `DELETE /lessons/:id` – Delete lesson
- `PATCH /lessons/:id/like` – Like/unlike a lesson
- `PATCH /lessons/:id/favorite` – Favorite/unfavorite a lesson
- `GET /lessons/similar/category` – Recommend by category
- `GET /lessons/similar/tone` – Recommend by emotional tone
- `GET /users/:id/lessons` – Get all lessons by a user
- `GET /aMonth/:userId` – Past 30 days lesson stats

### **Comments**
- `POST /comment` – Add comment
- `GET /comments?lessonId=` – Get comments for lesson

### **Favorites**
- `POST /favourite` – Add to favorites
- `GET /favourite?email=` – Get favorites
- `DELETE /favourite/:id` – Remove favorite

### **Reports**
- `POST /reportLessons` – Report a lesson
- `GET /reportLessons` – List all reports (admin only)
- `GET /reportLessons/summary` – Report summary with counts

### **Payments**
- `POST /create-checkout-session` – Stripe checkout
- `PATCH /payment-success?session_id=` – Verify payment & mark premium
- `GET /payments?email=` – Get payments (user/admin)

### **Analytics**
- `GET /lessons/users-lesson/stats` – Lessons count per user
- `GET /lessons/today-count` – Lessons added today (admin only)
- `GET /lessons/top-contributors` – Top contributors (admin only)

---

## Installation

 ```bash
 # Clone the repository
 git clone https://github.com/ahnafabid10/digital-life-lessons-server-side.git

 # Navigate to the project directory
 cd digital-life-lessons-server-side

 # Install dependencies
 npm install

 # Create a `.env` file in the root directory
 # Add your MongoDB, Stripe, and frontend domain details
 PORT=3000
 DB_USER=<your_mongodb_username>
 DB_PASS=<your_mongodb_password>
 STRIPE_SECRET=<your_stripe_secret_key>
 SITE_DOMAIN=<your_frontend_domain>

 # Add Firebase Admin SDK JSON file
 # Place it in the root directory (e.g., digital-life-lessons-firebase-adminsdk.json)

 # Run the development server
 npm run dev
