// const mongoose=require('mongoose');
// const mongo_url =process.env.MONGO_CONN;
// mongoose.connect(mongo_url)
// .then(()=>{
//     console.log('MongoDB connected...');

// }).catch((err)=>{
//     console.log('MongoDB Connection Error:',err);
// })
// backend/Models/db.js
const mongoose = require('mongoose');

async function connectDB() {
  try {
    const mongoUrl = process.env.MONGO_CONN;

    if (!mongoUrl) {
      throw new Error('❌ MONGO_CONN is missing in your .env file');
    }

    // ✅ Prevent multiple connections in dev (nodemon / hot reload)
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return mongoose.connection;
    }

    await mongoose.connect(mongoUrl, {
      // these options are safe defaults; mongoose 7+ ignores some but ok
      autoIndex: true,
    });

    console.log('✅ MongoDB connected...');
    return mongoose.connection;
  } catch (err) {
    console.log('❌ MongoDB Connection Error:', err?.message || err);
    throw err;
  }
}

module.exports = connectDB;
