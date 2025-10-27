# Waste Material Marketplace - Frontend

Modern React frontend for the Waste Material Marketplace built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Landing Page** with hero section and featured listings
- **User Authentication** (Login/Signup)
- **Browse Listings** with advanced search and filtering
- **Listing Details** with purchase/bid options
- **User Dashboard** for sellers and buyers
- **Admin Panel** for platform management
- **Real-time Updates** for auctions
- **Responsive Design** optimized for all devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Hook Form** - Form handling
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Zustand** - State management

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

1. **Navigate to the frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Create environment file** (optional)
```bash
cp .env.example .env
```

Update the API URL if needed:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── listings/           # Browse listings
│   ├── listing/[id]/      # Listing details
│   ├── dashboard/          # User dashboard
│   └── admin/              # Admin panel
├── components/             # React components
│   └── Navigation.tsx      # Main navigation
├── lib/                    # Utilities and API
│   └── api.ts              # API client
├── context/                # React Context
│   └── AuthContext.tsx     # Authentication context
├── types/                  # TypeScript types
│   └── index.ts            # Type definitions
└── public/                 # Static assets
```

## Pages

### Landing Page (`/`)
- Hero section with call-to-action
- How it works section
- Featured listings carousel

### Authentication (`/login`, `/signup`)
- User login and registration
- Form validation
- Error handling

### Browse Listings (`/listings`)
- Search and filter listings
- Material type, location, price filters
- Responsive grid layout

### Listing Detail (`/listing/[id]`)
- Full listing information
- Purchase options for fixed-price listings
- Real-time bidding for auctions
- Image gallery

### Dashboard (`/dashboard`)
- Seller view: listings, sales, orders
- Buyer view: orders, bids, purchases
- Analytics and statistics

### Admin Panel (`/admin`)
- Platform overview and statistics
- User management
- Listing management
- Revenue tracking

## API Integration

The frontend communicates with the FastAPI backend through:

```typescript
// Authentication
authAPI.login(credentials)
authAPI.register(userData)
authAPI.getCurrentUser()

// Listings
listingsAPI.getAll(params)
listingsAPI.getById(id)
listingsAPI.create(listing)

// Orders
ordersAPI.create(order)
ordersAPI.getAll()

// Auctions
auctionsAPI.placeBid(auctionId, amount)
auctionsAPI.getActive()

// Dashboard
dashboardAPI.getSeller()
dashboardAPI.getBuyer()

// Admin
adminAPI.getStats()
adminAPI.getUsers()
```

## Features Breakdown

### Authentication
- JWT token-based authentication
- Protected routes
- Automatic token refresh
- User context throughout app

### Search & Filtering
- Real-time search
- Filter by material type
- Filter by location
- Filter by listing type
- Price range filters

### Real-time Auctions
- Live bid updates (WebSocket ready)
- Current highest bid display
- Auction countdown
- Bid history

### Responsive Design
- Mobile-first approach
- Tablet optimized
- Desktop layouts
- Touch-friendly interactions

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Common Issues

### API Connection Error
- Ensure backend is running on correct port
- Check CORS configuration in backend
- Verify API URL in environment variables

### Authentication Issues
- Clear localStorage and login again
- Check token expiration
- Verify backend JWT secret

### Build Errors
- Delete `.next` folder and rebuild
- Clear node_modules and reinstall
- Check TypeScript errors

## Development Tips

1. **Hot Reload**: Changes reflect immediately during development
2. **Type Safety**: Use TypeScript types from `types/index.ts`
3. **API Client**: All API calls centralized in `lib/api.ts`
4. **Styling**: Use Tailwind utility classes
5. **Components**: Reusable components in `components/`

## Testing the Application

1. **Start Backend**: Make sure FastAPI server is running
2. **Start Frontend**: Run `npm run dev`
3. **Register**: Create a test account
4. **Browse**: Search and filter listings
5. **Dashboard**: Check seller/buyer views
6. **Admin**: Test admin panel (requires admin role)

## Next Steps

- Add image upload functionality
- Implement WebSocket for real-time bidding
- Add advanced analytics charts
- Implement payment integration
- Add email notifications
- Create mobile app

## License

MIT License

