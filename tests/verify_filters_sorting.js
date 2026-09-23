// Automated Verification of Filters and Sorting Functionality

const BASE_URL = 'http://localhost:5000/api';

async function verifyFiltersAndSorting() {
  console.log('🧪 Starting Verification of Filters and Sorting API & Logic...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details}`);
    }
  }

  // 1. Authenticate to obtain token
  console.log('--- Step 1: Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shanthi@369', password: 'slim369' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.data?.accessToken, 'Boss Authentication & Token Generation');
  const token = loginData.data?.accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 2. Orders Sorting & Filtering
  console.log('\n--- Step 2: Orders Sorting & Filtering ---');
  
  // Sort by grandTotal asc
  const ordersAscRes = await fetch(`${BASE_URL}/orders?sortBy=grandTotal&sortOrder=asc&limit=10`, { headers });
  const ordersAscData = await ordersAscRes.json();
  const ordersAsc = ordersAscData.data || [];
  let isAscSorted = true;
  for (let i = 0; i < ordersAsc.length - 1; i++) {
    if ((ordersAsc[i].grandTotal || 0) > (ordersAsc[i + 1].grandTotal || 0)) {
      isAscSorted = false;
      break;
    }
  }
  assert(isAscSorted && ordersAsc.length > 0, 'Orders sorted by grandTotal ascending', `Count: ${ordersAsc.length}`);

  // Sort by grandTotal desc
  const ordersDescRes = await fetch(`${BASE_URL}/orders?sortBy=grandTotal&sortOrder=desc&limit=10`, { headers });
  const ordersDescData = await ordersDescRes.json();
  const ordersDesc = ordersDescData.data || [];
  let isDescSorted = true;
  for (let i = 0; i < ordersDesc.length - 1; i++) {
    if ((ordersDesc[i].grandTotal || 0) < (ordersDesc[i + 1].grandTotal || 0)) {
      isDescSorted = false;
      break;
    }
  }
  assert(isDescSorted && ordersDesc.length > 0, 'Orders sorted by grandTotal descending', `Count: ${ordersDesc.length}`);

  // Filter by single status
  const ordersStatusRes = await fetch(`${BASE_URL}/orders?status=NEW&limit=10`, { headers });
  const ordersStatusData = await ordersStatusRes.json();
  const ordersStatus = ordersStatusData.data || [];
  const allNew = ordersStatus.length === 0 || ordersStatus.every(o => o.status === 'NEW');
  assert(allNew, 'Orders filtered by status=NEW');

  // Filter by multi status comma-separated
  const ordersMultiStatusRes = await fetch(`${BASE_URL}/orders?status=CONFIRMED,PACKED&limit=10`, { headers });
  const ordersMultiStatusData = await ordersMultiStatusRes.json();
  const ordersMultiStatus = ordersMultiStatusData.data || [];
  const allMulti = ordersMultiStatus.length === 0 || ordersMultiStatus.every(o => o.status === 'CONFIRMED' || o.status === 'PACKED');
  assert(allMulti, 'Orders filtered by multi-status (CONFIRMED,PACKED)');

  // 3. Leads Sorting & Filtering
  console.log('\n--- Step 3: Leads Sorting & Filtering ---');

  // Sort by createdAt desc
  const leadsDateRes = await fetch(`${BASE_URL}/leads?sortBy=createdAt&sortOrder=desc&limit=10`, { headers });
  const leadsDateData = await leadsDateRes.json();
  const leadsDate = leadsDateData.data || [];
  let isLeadsDateSorted = true;
  for (let i = 0; i < leadsDate.length - 1; i++) {
    if (new Date(leadsDate[i].createdAt).getTime() < new Date(leadsDate[i + 1].createdAt).getTime()) {
      isLeadsDateSorted = false;
      break;
    }
  }
  assert(isLeadsDateSorted, 'Leads sorted by createdAt descending');

  // Sort by name asc
  const leadsNameRes = await fetch(`${BASE_URL}/leads?sortBy=name&sortOrder=asc&limit=10`, { headers });
  const leadsNameData = await leadsNameRes.json();
  const leadsName = leadsNameData.data || [];
  let isLeadsNameSorted = true;
  for (let i = 0; i < leadsName.length - 1; i++) {
    if ((leadsName[i].name || '').toLowerCase() > (leadsName[i + 1].name || '').toLowerCase()) {
      isLeadsNameSorted = false;
      break;
    }
  }
  assert(isLeadsNameSorted, 'Leads sorted by name ascending');

  // 4. Products Sorting & Filtering
  console.log('\n--- Step 4: Products Sorting & Filtering ---');

  // Sort by price asc
  const prodsPriceAscRes = await fetch(`${BASE_URL}/products?sortBy=price&sortOrder=asc&limit=10`, { headers });
  const prodsPriceAscData = await prodsPriceAscRes.json();
  const prodsPriceAsc = prodsPriceAscData.data || [];
  let isProdsPriceAsc = true;
  for (let i = 0; i < prodsPriceAsc.length - 1; i++) {
    if ((prodsPriceAsc[i].price || 0) > (prodsPriceAsc[i + 1].price || 0)) {
      isProdsPriceAsc = false;
      break;
    }
  }
  assert(isProdsPriceAsc && prodsPriceAsc.length > 0, 'Products sorted by price ascending');

  // Sort by price desc
  const prodsPriceDescRes = await fetch(`${BASE_URL}/products?sortBy=price&sortOrder=desc&limit=10`, { headers });
  const prodsPriceDescData = await prodsPriceDescRes.json();
  const prodsPriceDesc = prodsPriceDescData.data || [];
  let isProdsPriceDesc = true;
  for (let i = 0; i < prodsPriceDesc.length - 1; i++) {
    if ((prodsPriceDesc[i].price || 0) < (prodsPriceDesc[i + 1].price || 0)) {
      isProdsPriceDesc = false;
      break;
    }
  }
  assert(isProdsPriceDesc && prodsPriceDesc.length > 0, 'Products sorted by price descending');

  console.log(`\n==============================================`);
  console.log(`🎉 Filter & Sorting Test Summary: ${passed}/${total} passed`);
  console.log(`==============================================`);

  process.exit(passed === total ? 0 : 1);
}

verifyFiltersAndSorting().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
