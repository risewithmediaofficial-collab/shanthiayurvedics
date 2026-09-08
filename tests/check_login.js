const http = require('http');

const payload = JSON.stringify({ email: 'shanthi@369', password: 'slim369' });

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    const parsed = JSON.parse(data);
    if (parsed.success) {
      console.log('\n✅ Login SUCCESS');
      console.log('User:', parsed.data?.user?.name, '|', parsed.data?.user?.email, '| Role:', parsed.data?.user?.role);
    } else {
      console.log('\n❌ Login FAILED:', parsed.message);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(payload);
req.end();
