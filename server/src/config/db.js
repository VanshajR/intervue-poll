import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { dbName: 'intervue_poll' });
  } catch (err) {
    console.error('MongoDB connection error', err);
    throw err;
  }
}
