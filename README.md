# Salami App - Registration System

A simple web application for user registration with payment method selection (bKash/Nagad).

## Project Structure

```
Salami App/
├── frontend/
│   ├── index.html      # Registration form
│   ├── style.css       # Styling
│   └── script.js       # Form handling & API calls
└── backend/
    ├── server.js       # Express server
    ├── package.json    # Dependencies
    └── data/
        └── registrations.json  # User data storage
```

## Features

✅ Clean, responsive registration form  
✅ Name input field  
✅ Payment method selection (bKash/Nagad)  
✅ Payment number input (11 digits)  
✅ Backend API to store registrations  
✅ Data persistence in JSON file  
✅ Input validation  
✅ Error handling

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd "/Users/ahnaftahmid/Docc/Coding/Salami App/backend"
npm install
```

### 2. Start the Backend Server

```bash
npm start
```

You should see:
```
🚀 Salami App Backend Server running on http://localhost:5000
```

### 3. Open the Frontend

Open [frontend/index.html](frontend/index.html) in your browser:
- **Option 1:** Double-click the file
- **Option 2:** Right-click → Open with → Your browser
- **Option 3:** Use a local server (recommended)

### 4. Test the App

1. Fill in the registration form:
   - **Name:** Any name
   - **Payment Method:** Select bKash or Nagad
   - **Payment Number:** 11-digit number (e.g., 01711111111)
2. Click **Register**
3. You should see a success message

## API Endpoints

### Register User
```
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "paymentMethod": "bKash",
  "paymentNumber": "01711111111",
  "registeredAt": "2026-03-20T10:30:00Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Registration successful",
  "registration": {
    "id": "1234567890",
    "name": "John Doe",
    "paymentMethod": "bKash",
    "paymentNumber": "01711111111",
    "registeredAt": "2026-03-20T10:30:00Z"
  }
}
```

### Get All Registrations (Admin)
```
GET /api/registrations
```

Returns all registered users.

### Get Single Registration
```
GET /api/registrations/:id
```

Get a specific registration by ID.

## Data Storage

All registrations are stored in `backend/data/registrations.json`:

```json
{
  "registrations": [
    {
      "id": "1234567890",
      "name": "John Doe",
      "paymentMethod": "bKash",
      "paymentNumber": "01711111111",
      "registeredAt": "2026-03-20T10:30:00Z"
    }
  ]
}
```

## Frontend Form Validation

- ✅ All fields are required
- ✅ Payment number must be exactly 11 digits
- ✅ Payment method must be bKash or Nagad

## Backend Validation

- ✅ Validates all required fields
- ✅ Checks payment number format (11 digits)
- ✅ Prevents duplicate registrations (same payment number + method)
- ✅ Validates payment method values

## Troubleshooting

### Backend won't start?
```bash
# Make sure you're in the backend directory
cd "/Users/ahnaftahmid/Docc/Coding/Salami App/backend"

# Check if port 5000 is in use
lsof -i :5000

# If in use, kill the process or use a different port
```

### "Cannot POST /api/register"?
- Make sure backend server is running on `http://localhost:5000`
- Check browser console (F12) for CORS or network errors

### Form data not saving?
- Check backend server console for error messages
- Verify `data/registrations.json` file exists
- Check file permissions in the data directory

## Future Enhancements

- Database integration (MongoDB, PostgreSQL)
- User authentication & login
- Email verification
- Payment gateway integration (actual bKash/Nagad API)
- Admin dashboard
- Export registrations as CSV/Excel
- SMS notifications
- User profile management

## Requirements Met

✅ HTML/CSS/JavaScript frontend  
✅ Registration form with Name field  
✅ Payment method selection (bKash/Nagad)  
✅ Payment number input field  
✅ Backend server to store data  
✅ Web app (fully functional)

Enjoy your Salami App! 🎉
