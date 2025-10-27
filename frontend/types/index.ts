export interface User {
  id: number
  email: string
  username: string
  company_name: string | null
  role: 'admin' | 'seller' | 'buyer'
  is_active: boolean
  created_at: string
}

export interface Listing {
  id: number
  title: string
  description: string
  material_name: string
  quantity: number
  quantity_unit: string
  price: number
  listing_type: 'fixed_price' | 'auction'
  status: 'active' | 'sold' | 'inactive'
  location: string
  images: string[]
  availability_from: string
  availability_to: string
  seller_id: number
  created_at: string
  updated_at: string | null
}

export interface Order {
  id: number
  quantity: number
  total_price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  buyer_notes: string | null
  listing_id: number
  buyer_id: number
  created_at: string
  updated_at: string | null
}

export interface Auction {
  id: number
  starting_bid: number
  current_highest_bid: number | null
  end_time: string
  is_active: boolean
  listing_id: number
  winner_id: number | null
  created_at: string
  updated_at: string | null
  bids?: Bid[]
}

export interface Bid {
  id: number
  amount: number
  is_winning: boolean
  auction_id: number
  bidder_id: number
  created_at: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  company_name?: string
  role?: 'admin' | 'seller' | 'buyer'
}

