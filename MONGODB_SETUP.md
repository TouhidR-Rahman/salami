# Salami App - MongoDB Setup Guide

## What Changed?

✅ Migrated from **JSON file storage** to **MongoDB database**  
✅ Added Mongoose for database schema & validation  
✅ Added new API endpoints: DELETE & UPDATE registrations  
✅ Better data validation & error handling  

---

## Installation & Setup

### Option 1: MongoDB Community (Local)

#### 1. Install MongoDB Community Edition

**For macOS (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**For other platforms:** Visit [MongoDB Community Download](https://www.mongodb.com/try/download/community)

#### 2. Start MongoDB Service

```bash
# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh

# Exit the MongoDB shell
exit
```

#### 3. Update Backend Configuration

The `.env` file is already set up for local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/salami-app
```

#### 4. Start the Backend Server

```bash
cd "/Users/ahnaftahmid/Docc/Coding/Salami App/backend"
npm start
```

---

### Option 2: MongoDB Atlas (Cloud - Recommended)

**Advantages:**
- No local installation needed
- Cloud-hosted & automatic backups
- Free tier available (512 MB)
- Accessible from anywhere

#### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a new cluster (select free tier)

#### 2. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Drivers"
3. Copy your connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/salami-app?retryWrites=true&w=majority
   ```

#### 3. Update `.env` File

Edit `/Users/ahnaftahmid/Docc/Coding/Salami App/backend/.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/salami-app?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

#### 4. Start the Backend Server

```bash
cd "/Users/ahnaftahmid/Docc/Coding/Salami App/backend"
npm start
```

---

## API Endpoints

### 1. Register User (Create)
```
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "paymentMethod": "bKash",
  "paymentNumber": "01711111111"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "registration": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "paymentMethod": "bKash",
    "paymentNumber": "01711111111",
    "registeredAt": "2026-03-20T10:30:00Z",
    "createdAt": "2026-03-20T10:30:00.000Z",
    "updatedAt": "2026-03-20T10:30:00.000Z"
  }
}
```

### 2. Get All Registrations (Read)
```
GET /api/registrations
```

Returns all registrations sorted by newest first.

### 3. Get Single Registration (Read)
```
GET /api/registrations/:id
```

Example: `GET /api/registrations/507f1f77bcf86cd799439011`

### 4. Update Registration (Update)
```
PUT /api/registrations/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "paymentMethod": "Nagad",
  "paymentNumber": "01911111111"
}
```

### 5. Delete Registration (Delete)
```
DELETE /api/registrations/:id
```

Returns the deleted registration.

---

## Database Schema

```javascript
{
  _id: ObjectId,           // Auto-generated ID
  name: String,            // Full name (2-100 chars)
  paymentMethod: String,   // "bKash" or "Nagad"
  paymentNumber: String,   // 11 digits (unique per method)
  registeredAt: Date,      // Auto-set to current time
  createdAt: Date,         // Auto timestamp
  updatedAt: Date          // Auto timestamp
}
```

**Indexes:**
- `paymentNumber` (unique per payment method)
- Compound index on `paymentNumber` + `paymentMethod`

---

## Testing with API Client

### Using cURL:

```bash
# Register
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "paymentMethod": "bKash",
    "paymentNumber": "01711111111"
  }'

# Get all registrations
curl http://localhost:3000/api/registrations

# Get specific registration
curl http://localhost:3000/api/registrations/507f1f77bcf86cd799439011

# Update registration
curl -X PUT http://localhost:3000/api/registrations/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "paymentMethod": "Nagad",
    "paymentNumber": "01922222222"
  }'

# Delete registration
curl -X DELETE http://localhost:3000/api/registrations/507f1f77bcf86cd799439011
```

### Using Postman:

1. Download [Postman](https://www.postman.com)
2. Create requests for each endpoint above
3. Test your API

---

## Troubleshooting

### "MongoDB connection failed"

**If using local MongoDB:**
```bash
# Check if MongoDB is running
brew services list

# Start MongoDB
brew services start mongodb-community

# Restart MongoDB
brew services restart mongodb-community
```

**If using MongoDB Atlas:**
- Check your connection string in `.env`
- Verify network access is allowed in Atlas
- Ensure IP address is whitelisted

### "Address already in use :::3000"

```bash
# Kill the process using port 3000
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### "Payment number already exists"

This error means a registration with that payment number + method already exists.
Use the UPDATE endpoint to modify it, or use a different number.

---

## File Structure

```
backend/
├── server.js               # Main application
├── package.json            # Dependencies
├── .env                    # Environment variables
├── .env.example            # Example config
├── config/
│   └── database.js         # MongoDB connection config
├── models/
│   └── Registration.js     # Database schema
└── data/
    └── registrations.json  # Old JSON file (backup)
```

---

## Next Steps

1. Install MongoDB locally OR set up MongoDB Atlas
2. Update `.env` with correct connection string
3. Start the backend: `npm start`
4. Test the API
5. Open frontend and test registration form

Your Salami App is now database-powered! 🎉
