# ChatApp

A real-time chat application built with Node.js, Express, MongoDB, and Socket.io.

## Features
- User authentication (JWT)
- Individual and group conversations
- Real-time messaging with Socket.io
- Message editing, deletion, and read receipts
- User online/offline status
- Group management (add/remove members)

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/chat_app
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```

### Running the App
```bash
npm start
```

The server will run at `http://localhost:4000` by default.

## Folder Structure
- `src/` - Main source code
  - `app.js` - Express app entry point
  - `config/` - Database config
  - `controllers/` - Route controllers
  - `middlewares/` - Express middlewares
  - `models/` - Mongoose models
  - `routes/` - API routes
  - `utils/` - Utility functions
  - `socket/` - Socket.io logic

## License
MIT
