import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Message from './models/Message.js';
import connectDB from './config/db.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Message.deleteMany();
    console.log('Cleared existing Users and Messages...');

    // Hash password for all dummy users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Dummy Users
    const users = await User.create([
      {
        username: 'user1',
        email: 'user1@example.com',
        password: hashedPassword
      },
      {
        username: 'user2',
        email: 'user2@example.com',
        password: hashedPassword
      },
      {
        username: 'alex_dev',
        email: 'alex@example.com',
        password: hashedPassword
      },
      {
        username: 'sarah_code',
        email: 'sarah@example.com',
        password: hashedPassword
      }
    ]);

    console.log(`Created ${users.length} test users.`);

    const [user1, user2] = users;

    // Create Initial Chat History between user1 and user2
    const sampleMessages = await Message.create([
      {
        sender: user1._id,
        receiver: user2._id,
        text: 'Hey User 2! Ready to test the WebRTC audio call?'
      },
      {
        sender: user2._id,
        receiver: user1._id,
        text: 'Hey! Yes, click the green Audio Call button in the top bar.'
      },
      {
        sender: user1._id,
        receiver: user2._id,
        text: 'Sounds good, starting the call now!'
      }
    ]);

    console.log(`Seeded ${sampleMessages.length} initial messages.`);
    console.log('\n--- Seed Credentials ---');
    console.log('All test users share the password: password123');
    console.log('1. user1@example.com');
    console.log('2. user2@example.com');
    console.log('3. alex@example.com');
    console.log('4. sarah@example.com');
    console.log('-------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedData();