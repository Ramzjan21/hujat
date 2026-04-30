const User = require('../models/User');

// Seed default admin user if none exists
module.exports = async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) return;

    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const name = 'Administrator';

    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin user created: ${email} / ${password}`);
    console.log('IMPORTANT: Change admin credentials in production!');
  } catch (err) {
    console.error('Admin seed error:', err);
  }
};
