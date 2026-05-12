// backend/seeders/createAdmin.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createAdminUser() {
  try {
    console.log('\n=== Restaurant Menu System - Admin User Creation ===\n');

    // Get admin details from user input
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');

    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: email.trim() }
    });

    if (existingAdmin) {
      const overwrite = await question(
        '\n⚠️  User with this email already exists. Overwrite? (yes/no): '
      );
      
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('\n❌ Admin creation cancelled.\n');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      }

      // Delete existing user
      await prisma.user.delete({
        where: { email: email.trim() }
      });
      
      console.log('✓ Existing user removed');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('=================================');
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log('=================================\n');

    rl.close();
    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the seeder
createAdminUser();