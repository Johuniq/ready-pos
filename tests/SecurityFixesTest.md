# Security Fixes Testing Guide

This document provides step-by-step testing instructions for verifying all security fixes.

---

## Prerequisites

1. Fresh WordPress installation with WooCommerce
2. Ready POS plugin installed and activated
3. At least 2 test users with POS cashier role
4. At least 2 products with sufficient stock
5. One active outlet and register configured
6. Access to WordPress debug.log file

---

## Test 1: Inventory Race Condition (#7)

### Objective
Verify that concurrent orders do not cause negative stock or overselling.

### Setup
1. Create a product with stock quantity = 10
2. Add product to outlet stock: 10 units
3. Open two browser windows (or use Postman)
4. Login as two different cashiers in each window
5. Open sessions on the same or different registers

### Test Procedure

#### Test 1a: Sequential Orders (Control Test)
1. In Window 1: Create order for 5 units
2. Wait for completion
3. In Window 2: Create order for 5 units
4. Check final stock quantity

**Expected Result:** Stock = 0 (10 - 5 - 5)

#### Test 1b: Concurrent Orders (Race Condition Test)
1. Reset stock to 10 units
2. Prepare both windows with cart containing 6 units each
3. Click checkout in both windows simultaneously (within 1 second)
4. Check final stock quantity

**Expected Result:**
- One order succeeds, stock = 4 (10 - 6)
- Second order should either:
  - Succeed, stock = -2 ❌ **WOULD FAIL WITHOUT FIX**
  - Fail with "insufficient stock" ✅ **CORRECT BEHAVIOR**
  - Succeed, stock = 0 (if using GREATEST) ✅ **CORRECT BEHAVIOR**

#### Test 1c: Inventory Adjustment Race Condition
1. Reset stock to 10 units
2. In Window 1: Navigate to Inventory → Take Stock
3. In Window 2: Navigate to Inventory → Take Stock
4. Both windows: Set stock to different values simultaneously
   - Window 1: Set to 15
   - Window 2: Set to 20
5. Refresh and check final stock

**Expected Result:** 
- Stock = 15 OR 20 (last write wins) ✅
- No database errors or crashes ✅

#### Verification
```sql
-- Check for negative stock (should return 0 rows)
SELECT * FROM wp_readypos_outlet_stock WHERE stock_quantity < 0;

-- Check audit log
grep "ReadyPOS Inventory Adjusted" /path/to/debug.log
```

---

## Test 2: Session Total Locking (#6)

### Objective
Verify that concurrent orders on the same session maintain accurate totals.

### Setup
1. Login as cashier
2. Open a session with opening_cash = 100
3. Open two browser windows with the same session

### Test Procedure

#### Test 2a: Concurrent Orders Same Session
1. Window 1: Create order for $50 (cash payment)
2. Window 2: Create order for $75 (card payment)
3. Submit both orders simultaneously
4. Check session totals

**Expected Result:**
- total_sales = 125.00 (50 + 75) ✅
- total_orders = 2 ✅
- cash_total = 50.00 ✅
- card_total = 75.00 ✅
- No lost updates ✅

#### Test 2b: Concurrent Cash Adjustments
1. Window 1: Pay In $20
2. Window 2: Pay Out $10
3. Submit simultaneously
4. Check cash_total

**Expected Result:**
- cash_total = 110.00 (100 + 20 - 10) ✅
- Both adjustments logged in notes ✅

#### Verification
```sql
-- Check session totals match order totals
SELECT 
    s.id,
    s.total_sales,
    s.total_orders,
    COALESCE(SUM(o.total), 0) as actual_sales,
    COUNT(o.id) as actual_orders
FROM wp_readypos_sessions s
LEFT JOIN wp_readypos_order_meta om ON s.id = om.session_id
LEFT JOIN wp_posts o ON om.wc_order_id = o.ID
WHERE s.status = 'open'
GROUP BY s.id;

-- Should match: s.total_sales = actual_sales AND s.total_orders = actual_orders
```

---

## Test 3: PIN Security (#10)

### Objective
Verify enhanced PIN requirements and rate limiting.

### Setup
1. Create a new cashier user
2. Ensure no PIN is set initially

### Test Procedure

#### Test 3a: Weak PIN Validation
Try setting these PINs (all should be rejected):

| PIN | Type | Expected Error |
|-----|------|----------------|
| 1234 | Too short | Must be 6-8 digits |
| 123 | Too short | Must be 6-8 digits |
| 123456789 | Too long | Must be 6-8 digits |
| 000000 | Common | PIN is too common |
| 111111 | Common | PIN is too common |
| 123456 | Common | PIN is too common |
| 654321 | Sequential | Cannot contain sequential digits |
| 234567 | Sequential | Cannot contain sequential digits |
| 123123 | Repeating | Contains repeating patterns |
| 121212 | Repeating | Contains repeating patterns |

**Expected Result:** All rejected with appropriate error messages ✅

#### Test 3b: Strong PIN Acceptance
Try setting these PINs (should be accepted):

| PIN | Type | Expected |
|-----|------|----------|
| 847293 | Random | Accepted ✅ |
| 384756 | Random | Accepted ✅ |
| 927461 | Random | Accepted ✅ |

#### Test 3c: Rate Limiting Test
1. Set a valid PIN for test user
2. Attempt login with incorrect PIN

**Attempt 1-4:** 
- Expected: "Incorrect PIN. X attempts remaining before temporary lockout"

**Attempt 5:**
- Expected: "Too many failed attempts. Account temporarily locked for 15 minutes."
- Status code: 429

**After 5 minutes (before 15 min):**
- Try login again
- Expected: "Too many failed attempts. Try again in X minutes."

**After 15 minutes:**
- Try login with correct PIN
- Expected: Login successful, transient cleared ✅

**Failed Attempts 6-9:**
- Repeat incorrect PIN attempts

**Attempt 10:**
- Expected: "Account locked due to too many failed attempts. Please contact an administrator."
- User meta `_readypos_pin_locked` = 'yes'

**After lockout:**
- Try with correct PIN
- Expected: Still locked, requires admin intervention ✅

#### Test 3d: Session Security
1. Login successfully
2. Check browser session cookie
3. Verify nonce is regenerated

**Expected Result:**
- New session ID generated ✅
- Old session invalidated ✅

#### Verification
```php
// Check user meta
$pin_set_at = get_user_meta($user_id, '_readypos_pin_set_at', true);
$pin_set_by = get_user_meta($user_id, '_readypos_pin_set_by', true);
$is_locked = get_user_meta($user_id, '_readypos_pin_locked', true);
$locked_at = get_user_meta($user_id, '_readypos_pin_locked_at', true);

// Check error log
grep "ReadyPOS PIN Failed Login" /path/to/debug.log
```

---

## Test 4: Cash Drawer Authorization (#3)

### Objective
Verify server-side drawer authorization and audit trail.

### Setup
1. Login as cashier
2. Open a session
3. Have drawer hardware connected (or mock)

### Test Procedure

#### Test 4a: Authorization Required
1. Try to open drawer without session ID
   ```javascript
   await drawer.open(2, null);
   ```
   **Expected:** Error "Session ID is required" ✅

2. Try to open drawer with invalid session
   ```javascript
   await drawer.open(2, 999999);
   ```
   **Expected:** 400 error "Session not found or not active" ✅

3. Try to open drawer as user without `use_pos` capability
   - Login as subscriber
   - Try drawer open
   **Expected:** 403 error "Unauthorized" ✅

#### Test 4b: Successful Authorization
1. Login as cashier
2. Open valid session (ID = 123)
3. Open drawer with reason
   ```javascript
   await drawer.open(2, 123, 1, "Till count");
   ```
   **Expected:** 
   - API returns `{success: true, authorized: true}`
   - Drawer hardware opens ✅

#### Test 4c: Audit Trail Verification
1. Open drawer 3 times with different reasons:
   - "Till count"
   - "Customer needs change"
   - "End of shift"

2. Check session notes
   ```php
   $session = POSSession::find(123);
   echo $session->notes;
   ```

**Expected format:**
```
[Drawer Open] Cashier: John Doe (ID: 5), Reason: Till count, IP: 192.168.1.10, Time: 2026-06-02 14:30:00
[Drawer Open] Cashier: John Doe (ID: 5), Reason: Customer needs change, IP: 192.168.1.10, Time: 2026-06-02 15:15:00
[Drawer Open] Cashier: John Doe (ID: 5), Reason: End of shift, IP: 192.168.1.10, Time: 2026-06-02 17:00:00
```

3. Check error log
   ```bash
   grep "ReadyPOS Cash Drawer Opened" /path/to/debug.log
   ```

**Expected:** All 3 opens logged with full details ✅

#### Test 4d: Action Hook Extension
1. Add a custom plugin to listen for drawer opens:
   ```php
   add_action('readypos_drawer_opened', function($session_id, $cashier_id, $reason, $register_id) {
       // Send notification to manager
       wp_mail('manager@store.com', 'Drawer Opened', "Session: $session_id, Reason: $reason");
   }, 10, 4);
   ```

2. Open drawer
3. Check that hook fired and email sent

**Expected:** Custom actions triggered ✅

---

## Test 5: Database Performance

### Objective
Verify indexes improve query performance under load.

### Setup
1. Create 1000 test sessions (900 closed, 100 open)
2. Create 500 products with outlet stock records
3. Enable query logging

### Test Procedure

#### Test 5a: Session Query Performance
```sql
EXPLAIN SELECT * FROM wp_readypos_sessions WHERE status = 'open';
```

**Expected:** 
- `type: ref` (uses index) ✅
- `key: status` ✅
- Not `type: ALL` (full table scan) ❌

#### Test 5b: Stock Update Performance
```sql
EXPLAIN UPDATE wp_readypos_outlet_stock 
SET stock_quantity = stock_quantity - 1 
WHERE outlet_id = 1 AND product_id = 100;
```

**Expected:**
- `key: outlet_product_unique` ✅
- Single row affected ✅
- No table lock (InnoDB row-level lock) ✅

#### Test 5c: Load Testing
Use Apache Bench or similar:
```bash
# 100 concurrent order requests
ab -n 100 -c 10 -p order.json -T application/json \
   -H "X-WP-Nonce: YOUR_NONCE" \
   http://yoursite.com/wp-json/readypos/v1/orders/create
```

**Expected:**
- No deadlocks ✅
- All requests complete successfully ✅
- Stock quantities accurate ✅
- Session totals accurate ✅

---

## Test 6: Migration Testing

### Objective
Verify migrations add indexes correctly.

### Test Procedure

#### Test 6a: Fresh Installation
1. Install plugin on fresh site
2. Activate plugin (runs migrations)
3. Check table structure:
   ```sql
   SHOW INDEX FROM wp_readypos_sessions;
   SHOW INDEX FROM wp_readypos_outlet_stock;
   ```

**Expected:**
- `status` index on sessions ✅
- `register_id` index on sessions ✅
- `outlet_product_unique` unique constraint on outlet_stock ✅

#### Test 6b: Upgrade from Old Version
1. Install old version without fixes
2. Create test data
3. Upgrade to new version
4. Check indexes added
5. Verify existing data not lost

**Expected:**
- All indexes present ✅
- No duplicate outlet_stock records ✅
- All data intact ✅

---

## Automated Test Suite

For comprehensive testing, consider using PHPUnit:

```php
<?php
class SecurityFixesTest extends WP_UnitTestCase {
    
    public function test_inventory_race_condition() {
        // Simulate concurrent updates
        // Assert no negative stock
    }
    
    public function test_session_totals() {
        // Simulate concurrent orders
        // Assert totals accurate
    }
    
    public function test_weak_pins_rejected() {
        // Try weak PINs
        // Assert all rejected
    }
    
    public function test_rate_limiting() {
        // Simulate failed attempts
        // Assert lockout after 5 and 10
    }
    
    public function test_drawer_authorization() {
        // Try unauthorized access
        // Assert 403 error
    }
}
```

---

## Checklist

Before deploying to production:

- [ ] All Test 1 scenarios pass (inventory)
- [ ] All Test 2 scenarios pass (sessions)
- [ ] All Test 3 scenarios pass (PIN security)
- [ ] All Test 4 scenarios pass (drawer auth)
- [ ] Database indexes verified
- [ ] Migrations tested on staging
- [ ] Backup created
- [ ] Error logging configured
- [ ] Monitoring alerts set up
- [ ] Documentation updated
- [ ] Team trained on new security features

---

## Rollback Plan

If issues occur in production:

1. **Immediate:** Deactivate plugin
2. **Database:** Restore from backup if data corruption
3. **Revert:** Install previous version from backup
4. **Investigate:** Review error logs
5. **Fix:** Apply targeted fix
6. **Test:** Full regression testing
7. **Deploy:** Careful staged rollout

---

## Support

If tests fail:
1. Check PHP error log: `tail -f /path/to/error_log`
2. Check WordPress debug log: `tail -f wp-content/debug.log`
3. Enable WP_DEBUG in wp-config.php
4. Check database error log
5. Contact support with detailed error messages

---

**Last Updated:** June 2, 2026
**Version:** 1.0.1
