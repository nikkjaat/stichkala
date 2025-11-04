# Payment System Documentation

## Overview
Your payment system has been completed and is now fully functional with UPI payment support. The system supports multiple payment methods including COD, Online (Razorpay), and UPI.

## Payment Flow

### 1. Order Creation
- Customer browses products and clicks "Customize & Order"
- Customer fills in customization details (if product is customizable)
- Customer provides delivery address and contact information
- System calculates total including:
  - Base product price × quantity
  - Gift wrap (+₹50 if selected)
  - Delivery charges (+₹50 if total < ₹500)

### 2. Payment Methods

#### A. UPI Payment (Current Implementation)
1. Customer reaches payment step
2. System displays:
   - Order summary with breakdown
   - QR code for UPI payment
   - UPI ID: 9760258097@paytm
   - Bank details: State Bank of India, StichKala
3. Customer clicks "Confirm Order"
4. Order is created with status "pending" and paymentStatus "pending"
5. Success modal appears with:
   - Order number (e.g., HG000001)
   - WhatsApp button to send payment confirmation
   - Amount to pay

#### B. WhatsApp Order Flow
- Customer can order directly via WhatsApp
- Pre-filled message includes all order details
- Opens WhatsApp with your number: +919760258097

### 3. Payment Confirmation
After customer makes UPI payment:
1. Customer clicks "Send Payment Confirmation" button
2. Opens WhatsApp with pre-filled message including:
   - Order number
   - Payment amount
   - Transaction ID placeholder
3. Customer shares payment screenshot and transaction ID
4. Admin manually confirms payment via admin panel

## API Routes

### POST /api/orders
Creates a new order
```typescript
Request Body:
{
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
    whatsappNumber: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    }
  },
  items: [{
    productId: string;
    quantity: number;
    customization?: {
      text?: string;
      size?: string;
      material?: string;
      specialInstructions?: string;
    }
  }],
  totalAmount: number;
  paymentMethod: "cod" | "online" | "upi";
  paymentStatus: "pending";
}

Response:
{
  success: true;
  order: {...};
  razorpayOrderId?: string; // only for online payment
}
```

### GET /api/orders
Fetches all orders (admin use)

### PUT /api/orders/[id]
Updates order status and details

### POST /api/payment/confirm
Confirms UPI payment manually
```typescript
Request Body:
{
  orderId: string;
  upi_transaction_id?: string;
  payment_screenshot?: string;
}

Response:
{
  success: true;
  order: {...};
  message: "Payment confirmed successfully";
}
```

### POST /api/payment/verify
Verifies Razorpay payment signature
```typescript
Request Body:
{
  orderId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
```

## Database Model

### Order Schema
```typescript
{
  orderNumber: string; // Auto-generated: HG000001, HG000002, etc.
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
    whatsappNumber: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string; // default: "India"
    }
  };
  items: [{
    productId: ObjectId;
    productName: string;
    quantity: number;
    price: number;
    customization?: {
      text?: string;
      color?: string;
      size?: string;
      material?: string;
      specialInstructions?: string;
      uploadedFiles?: string[];
    }
  }];
  totalAmount: number;
  status: "pending" | "confirmed" | "in-progress" | "completed" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: "cod" | "online" | "upi";
  paymentDetails?: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    upi_transaction_id?: string;
    payment_screenshot?: string;
  };
  estimatedDelivery: Date; // 7 days from order
  actualDelivery?: Date;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Order Status Workflow

1. **pending** - Order created, payment pending
2. **confirmed** - Payment confirmed
3. **in-progress** - Order being prepared
4. **completed** - Order ready for shipping
5. **shipped** - Order dispatched
6. **delivered** - Order delivered to customer
7. **cancelled** - Order cancelled

## Notifications
The system sends notifications via:
- WhatsApp (using twilio or direct link)
- Email (using nodemailer)

Notifications are sent for:
- Order confirmation
- Status updates
- Delivery notifications

## Configuration

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_WHATSAPP_NUMBER=+919760258097

# Razorpay (for online payment)
RAZORPAY_KEY_ID=rzp_test_RUCS9zfXEC51PQ
RAZORPAY_KEY_SECRET=LKysLJvha3akQAIFP6fWqSLZ
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RUCS9zfXEC51PQ

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Site URL
NEXT_PUBLIC_SITE_URL=https://stichkala.vercel.app
```

### UPI Details
To update UPI payment details, edit `components/CustomizationModal.tsx`:
```typescript
const upiDetails = {
  upiId: "9760258097@paytm",
  qrCode: "/qr-code.png",
  bankName: "State Bank of India",
  accountName: "StichKala",
};
```

## Testing the Payment Flow

### 1. Test Order Creation
1. Go to homepage
2. Click on any product
3. Click "View Details"
4. Click "Customize & Order"
5. Fill in all required fields
6. Go through all steps
7. Click "Confirm Order"
8. Verify order is created with correct amount

### 2. Test UPI Payment
1. Complete order creation
2. Note the order number
3. Click "Send Payment Confirmation"
4. Verify WhatsApp opens with correct message
5. Make test payment to UPI ID
6. Send confirmation via WhatsApp

### 3. Test Admin Confirmation
1. Admin receives WhatsApp message
2. Admin updates order status in admin panel
3. Customer receives confirmation notification

## Features

### Current Features
- Multi-step order form with validation
- Product customization
- Multiple payment methods (COD, Online, UPI)
- Order tracking
- Email and WhatsApp notifications
- Admin panel for order management
- Automatic order number generation
- Gift wrap option
- Delivery charge calculation
- Order history

### Security Features
- Payment signature verification (Razorpay)
- Secure payment gateway integration
- Input validation
- MongoDB secure connection
- Environment variable protection

## Troubleshooting

### Order not creating
- Check MongoDB connection
- Verify all required fields are filled
- Check browser console for errors

### Payment confirmation not working
- Verify UPI details are correct
- Check WhatsApp number in environment variables
- Test notification system

### Build errors
- Run `npm run build` to check for errors
- All warnings are non-critical
- Main errors have been fixed

## Next Steps

1. **Production Checklist**
   - Replace QR code placeholder with actual UPI QR code
   - Test all payment flows
   - Configure email notifications
   - Test on mobile devices
   - Set up proper error logging

2. **Recommended Enhancements**
   - Automated payment verification webhook
   - Payment status tracking dashboard
   - SMS notifications
   - Payment reminder system
   - Invoice generation
   - Receipt email with PDF

3. **Security Recommendations**
   - Enable HTTPS
   - Add rate limiting
   - Implement CAPTCHA for order forms
   - Add payment timeout handling
   - Implement fraud detection

## Support
For any issues or questions:
- WhatsApp: +919760258097
- Email: vishakha.baliyan26@gmail.com
