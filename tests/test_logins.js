// Script to test multi-brand distributor & manager logins
const testAccounts = [
  { id: 'shanthi@369', pwd: 'slim369', label: 'Boss / Shanthi Brand' },
  { id: 'slim369', pwd: 'slim369', label: 'Slim 369 Brand Distributor' },
  { id: 'shanthi ayurvedas office', pwd: 'slim369', label: 'Manager Akash' }
];

async function runTests() {
  console.log('--- Testing Brand & Role Logins on http://localhost:5000/api/auth/login ---');
  let passed = 0;

  for (const acc of testAccounts) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.id, password: acc.pwd })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log(`✅ [PASS] ${acc.label}:`);
        console.log(`   User: ${data.data.user.name}`);
        console.log(`   Username: ${data.data.user.username}`);
        console.log(`   Brand: ${data.data.user.brand}`);
        console.log(`   Role: ${data.data.user.role}`);
        console.log(`   Token generated: ${data.data.accessToken ? 'YES' : 'NO'}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${acc.label}:`, data);
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${acc.label}:`, err.message);
    }
  }

  console.log(`\nResults: ${passed}/${testAccounts.length} accounts passed authentication.`);
  process.exit(passed === testAccounts.length ? 0 : 1);
}

runTests();
