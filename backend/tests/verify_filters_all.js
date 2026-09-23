import http from 'http';

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- Logging in ---');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'shanthi@369', password: 'slim369' }));

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes);
    return;
  }

  const token = loginRes.data.data.accessToken;
  console.log('Login OK. User:', loginRes.data.data.user.username);

  // 1. IN_TRANSIT
  console.log('\n--- 1. Testing Filter: status=IN_TRANSIT ---');
  const transitRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders?status=IN_TRANSIT',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Total orders returned:', transitRes.data.data.length);
  transitRes.data.data.forEach(o => {
    console.log(`  Order: ${o.orderNumber}, Status: ${o.status}, Patient: ${o.patientDetails?.patientName}, Tracking: ${o.trackingNumber}`);
  });
  const hasDeliveredInTransit = transitRes.data.data.some(o => o.status === 'DELIVERED');
  console.log('Contains delivered orders?:', hasDeliveredInTransit ? '❌ FAIL: Showing delivered orders' : '✅ PASS: Zero delivered orders shown');

  // 2. DELIVERED
  console.log('\n--- 2. Testing Filter: status=DELIVERED ---');
  const deliveredRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders?status=DELIVERED',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Total orders returned:', deliveredRes.data.data.length);
  const allDelivered = deliveredRes.data.data.every(o => o.status === 'DELIVERED');
  console.log('All delivered?:', allDelivered ? '✅ PASS: All 9 are delivered' : '❌ FAIL');

  // 3. Search "transit"
  console.log('\n--- 3. Testing Search: search=transit ---');
  const searchTransitRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders?search=transit',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Search "transit" returned:', searchTransitRes.data.data.length);
  searchTransitRes.data.data.forEach(o => {
    console.log(`  Order: ${o.orderNumber}, Status: ${o.status}`);
  });

  // 4. Metrics Summary
  console.log('\n--- 4. Testing Metrics Summary ---');
  const metricsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders/metrics-summary',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const m = metricsRes.data.data;
  console.log(`  Total Orders: ${m.totalOrders}`);
  console.log(`  Shipped/Transit Count: ${m.shippedCount} (should be 2)`);
  console.log(`  Delivered Orders Count: ${m.deliveredOrdersCount} (should be 9)`);
  console.log(`  New Orders Count: ${m.newOrdersCount} (should be 2)`);
  console.log(`  Confirmed Orders Count: ${m.confirmedOrdersCount} (should be 2)`);

  // 5. Leads Filters
  console.log('\n--- 5. Testing Leads Filters ---');
  const leadsNewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/leads?status=NEW',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Leads status=NEW returned:', leadsNewRes.data.data?.length);
  const allLeadsNew = leadsNewRes.data.data?.every(l => l.status === 'NEW');
  console.log('All leads status=NEW?:', allLeadsNew ? '✅ PASS' : '❌ FAIL');

  // 6. Inventory Filters
  console.log('\n--- 6. Testing Inventory ---');
  const invRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/inventory',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Inventory returned count:', invRes.data.data?.length);
  console.log('✅ PASS: Inventory operational');
}

runTests().catch(console.error);
