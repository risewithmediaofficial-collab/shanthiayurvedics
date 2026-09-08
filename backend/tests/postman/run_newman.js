import newman from 'newman';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const collectionPath = path.join(__dirname, 'shanthi_ayurvedas_api_collection.json');

console.log('🚀 Launching Postman API Test Suite with Newman Runner...');
console.log(`📁 Collection: ${collectionPath}`);

newman.run(
  {
    collection: collectionPath,
    environment: {
      id: 'shanthi-local-env',
      name: 'Shanthi Local Env',
      values: [
        { key: 'baseUrl', value: 'http://127.0.0.1:5000', enabled: true },
        { key: 'authToken', value: '', enabled: true }
      ]
    },
    reporters: ['cli'],
    bail: false
  },

  function (err, summary) {
    if (err) {
      console.error('❌ Newman run failed:', err);
      process.exit(1);
    }

    const { run } = summary;
    console.log('\n=========================================');
    console.log('📊 POSTMAN TEST EXECUTION SUMMARY:');
    console.log(`✅ Total Requests Executed: ${run.executions.length}`);
    console.log(`🧪 Total Tests/Assertions: ${run.stats.assertions.total}`);
    console.log(`🎉 Passed Assertions: ${run.stats.assertions.total - run.stats.assertions.failed}`);
    console.log(`❌ Failed Assertions: ${run.stats.assertions.failed}`);
    console.log('=========================================\n');

    if (run.failures.length > 0) {
      console.error(`❌ ${run.failures.length} failure(s) occurred during test run.`);
      process.exit(1);
    } else {
      console.log('🌟 All Postman API endpoints passed successfully!');
      process.exit(0);
    }
  }
);
