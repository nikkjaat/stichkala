# Payment System Testing Guide

## Quick Test Checklist

### 1. Frontend Order Flow
- [ ] Visit homepage at `http://localhost:3000`
- [ ] Click on any featured product
- [ ] Click "View Details" to see product modal
- [ ] Click "Customize & Order"
- [ ] Complete Step 1: Customization (if customizable)
  - Enter personalization text
  - Select size and material
  - Add special instructions
  - Set quantity
  - Check/uncheck gift wrap
- [ ] Complete Step 2: Address
  - Fill name, phone, WhatsApp number
  - Fill complete address (street, city, state, pincode)
  - Email is optional but recommended
- [ ] Complete Step 3: Payment
  - Review order summary
  - Verify total amount calculation
  - See UPI QR code and payment details
  - Click "Confirm Order"
- [ ] Order Success Modal
  - Note the order number (e.g., HG000001)
  - Click "Send Payment Confirmation" to open WhatsApp
  - Or click "Continue Shopping" to close

### 2. Backend API Tests

#### Test Order Creation API
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerInfo": {
      "name": "Test Customer",
      "email": "test@example.com",
      "phone": "9876543210",
      "whatsappNumber": "9876543210",
      "address": {
        "street": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      }
    },
    "items": [{
      "productId": "YOUR_PRODUCT_ID",
      "quantity": 1,
      "customization": {
        "text": "Test Order",
        "size": "8 inch",
        "material": "Cotton"
      }
    }],
    "totalAmount": 949,
    "paymentMethod": "upi",
    "paymentStatus": "pending"
  }'
```

#### Test Get Orders API
```bash
curl http://localhost:3000/api/orders
```

#### Test Payment Confirmation API
```bash
curl -X POST http://localhost:3000/api/payment/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "upi_transaction_id": "TEST123456789",
    "payment_screenshot": "https://example.com/screenshot.png"
  }'
```

### 3. Database Verification

#### Check Orders in MongoDB
```bash
# Connect to MongoDB
mongosh "YOUR_MONGODB_URI"

# Use database
use handcrafted-gifts

# View orders
db.orders.find().pretty()

# View specific order by order number
db.orders.findOne({ orderNumber: "HG000001" })

# Check order status
db.orders.find({ paymentStatus: "pending" })
```

### 4. Payment Flow Testing

#### UPI Payment Test
1. Create an order through the website
2. Note the order number and total amount
3. Test UPI payment using:
   - UPI ID: 9760258097@paytm
   - Bank: State Bank of India
   - Account Name: StichKala
4. After payment, click "Send Payment Confirmation"
5. Send transaction ID via WhatsApp: +919760258097
6. Admin confirms payment manually

#### WhatsApp Order Test
1. Click "WhatsApp" button in payment step
2. Verify WhatsApp opens with pre-filled message
3. Message should include:
   - Product name and quantity
   - Customization details
   - Total amount
   - Customer information
   - Complete address

### 5. Order Tracking Test
- [ ] Visit `/track` page
- [ ] Enter your order number (e.g., HG000001)
- [ ] Click "Track Order"
- [ ] Verify order details are displayed
- [ ] Check order status and estimated delivery

### 6. Admin Panel Test
- [ ] Visit `/secure/admin/vishakha`
- [ ] View all orders
- [ ] Update order status
- [ ] Confirm payments manually
- [ ] Add products
- [ ] Update product details

### 7. Mobile Responsive Test
- [ ] Test on mobile device or browser dev tools
- [ ] Check all steps are responsive
- [ ] Verify modals work on mobile
- [ ] Test WhatsApp button functionality
- [ ] Check QR code visibility

### 8. Error Handling Test
- [ ] Try submitting empty form
- [ ] Try creating order without required fields
- [ ] Test invalid phone numbers
- [ ] Test invalid email format
- [ ] Test with network disabled
- [ ] Test payment confirmation with invalid order ID

## Expected Results

### Order Creation Success
```json
{
  "success": true,
  "order": {
    "_id": "...",
    "orderNumber": "HG000001",
    "customerInfo": {...},
    "items": [...],
    "totalAmount": 949,
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "upi",
    "estimatedDelivery": "2025-11-11T...",
    "createdAt": "2025-11-04T...",
    "updatedAt": "2025-11-04T..."
  }
}
```

### Payment Confirmation Success
```json
{
  "success": true,
  "order": {
    "orderNumber": "HG000001",
    "status": "confirmed",
    "paymentStatus": "paid",
    "paymentDetails": {
      "upi_transaction_id": "TEST123456789"
    }
  },
  "message": "Payment confirmed successfully"
}
```

## Common Issues & Solutions

### Issue: Order not creating
**Solution:**
- Check MongoDB connection in `.env`
- Verify product ID exists in database
- Check all required fields are provided
- Look at browser console for errors

### Issue: Payment confirmation failing
**Solution:**
- Verify order ID is correct
- Check order exists in database
- Ensure order status is "pending"
- Check API endpoint is correct

### Issue: WhatsApp not opening
**Solution:**
- Verify WhatsApp number in `.env`
- Check URL encoding is correct
- Test on mobile device
- Ensure WhatsApp is installed

### Issue: Build errors
**Solution:**
- Run `npm run build` to see errors
- Fix any TypeScript errors
- Check all imports are correct
- Verify all files are saved

## Performance Testing

### Load Testing
```bash
# Test order creation with multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d @test-order.json &
done
```

### Database Performance
- Monitor MongoDB query performance
- Check index usage
- Verify order number generation is efficient
- Test with 100+ orders

## Security Testing

### Input Validation
- [ ] Test SQL injection attempts
- [ ] Test XSS in customization text
- [ ] Test invalid email formats
- [ ] Test invalid phone numbers
- [ ] Test long strings in text fields

### Payment Security
- [ ] Verify payment signature validation
- [ ] Test payment amount tampering
- [ ] Check order status transitions
- [ ] Verify payment method validation

## Success Criteria

All tests should pass:
- ✅ Orders create successfully
- ✅ Payment flow works end-to-end
- ✅ Order tracking displays correct data
- ✅ WhatsApp integration works
- ✅ Email notifications sent
- ✅ Admin panel functions properly
- ✅ Mobile responsive design works
- ✅ Build completes without errors
- ✅ No console errors in browser
- ✅ Database updates correctly

## Next Steps After Testing

1. Deploy to production
2. Test with real UPI payments
3. Monitor order flow
4. Collect user feedback
5. Optimize based on data
