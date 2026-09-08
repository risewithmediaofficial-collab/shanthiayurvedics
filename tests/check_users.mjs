import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/shanthi_ayurvedas_crm';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      isActive: Boolean,
      passwordHash: { type: String, select: false }
    }, { collection: 'users' });
    
    let User;
    try { User = mongoose.model('User'); } catch(e) { User = mongoose.model('User', userSchema); }
    
    const users = await User.find({}).limit(10).lean();
    console.log('Total users in DB:', users.length);
    users.forEach(u => console.log(' -', u.name, '|', u.email, '|', u.role, '| active:', u.isActive));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
