// import mongoose from 'mongoose';

// export const connectDB = async (): Promise<void> => {
//   try {
//     const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri-pos';
//     const conn = await mongoose.connect(mongoUri);
//     console.log(`[MongoDB] Connected: ${conn.connection.host}`);
//   } catch (error) {
//     console.error('[MongoDB] Connection Error:', error);
//     process.exit(1);
//   }
// };
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || '');
    console.log(`🍃 MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error}`);
    process.exit(1);
  }
};