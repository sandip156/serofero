// backend/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./Models/db');

// helper: supports CommonJS router or transpiled default export
function pickRouter(mod, name) {
  const r = mod && (mod.default || mod);
  if (typeof r !== 'function') {
    console.log(`❌ ${name} is NOT a router function. Value:`, r);
    throw new Error(
      `${name} export is not an Express router. ` +
        `Fix: in ${name} file, end with "module.exports = router;"`
    );
  }
  return r;
}

const AuthRouter = pickRouter(require('./Routes/AuthRouter'), 'AuthRouter');
const TrekRouter = pickRouter(require('./Routes/TrekRouter'), 'TrekRouter');
const BookingRouter = pickRouter(require('./Routes/BookingRouter'), 'BookingRouter');
const InteractionRouter = pickRouter(require('./Routes/InteractionRouter'), 'InteractionRouter');
const RecommendationRouter = pickRouter(require('./Routes/RecommendationRouter'), 'RecommendationRouter');
const ReviewRouter = pickRouter(require('./Routes/ReviewRouter'), 'ReviewRouter');

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Logger
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// ✅ Health check
app.get('/ping', (req, res) => {
  res.send('PONG');
});

// ✅ Static uploads folder (SERVES backend/uploads/* as /uploads/*)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ API Routes
app.use('/auth', AuthRouter);
app.use('/treks', TrekRouter);
app.use('/bookings', BookingRouter);
app.use('/interactions', InteractionRouter);
app.use('/recommendations', RecommendationRouter);
app.use('/reviews', ReviewRouter);

// ✅ 404 last
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ✅ Connect DB first, then listen
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server because DB connection failed:', err?.message || err);
    process.exit(1);
  });




// // backend/index.js
// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const connectDB = require('./Models/db'); // ✅ now exports a function

// // helper: supports both CommonJS (module.exports=router)
// // and ESM transpiled default export (exports.default = router)
// function pickRouter(mod, name) {
//   const r = mod && (mod.default || mod);
//   if (typeof r !== 'function') {
//     console.log(`❌ ${name} is NOT a router function. Value:`, r);
//     throw new Error(
//       `${name} export is not an Express router. ` +
//         `Fix: in ${name} file, end with "module.exports = router;"`
//     );
//   }
//   return r;
// }

// const AuthRouter = pickRouter(require('./Routes/AuthRouter'), 'AuthRouter');
// const TrekRouter = pickRouter(require('./Routes/TrekRouter'), 'TrekRouter');
// const BookingRouter = pickRouter(require('./Routes/BookingRouter'), 'BookingRouter');
// const InteractionRouter = pickRouter(require('./Routes/InteractionRouter'), 'InteractionRouter');
// const RecommendationRouter = pickRouter(require('./Routes/RecommendationRouter'), 'RecommendationRouter');
// const ReviewRouter = pickRouter(require('./Routes/ReviewRouter'), 'ReviewRouter');

// const app = express();
// const PORT = process.env.PORT || 8080;




// // Middlewares
// app.use(
//   cors({
//     origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
//     credentials: true,
//   })
// );

// app.use(express.json());
// // ✅ helpful for normal form submits; multer will still handle multipart
// app.use(express.urlencoded({ extended: true }));

// // Logger
// app.use((req, res, next) => {
//   console.log(req.method, req.url);
//   next();
// });

// // Health check
// app.get('/ping', (req, res) => {
//   res.send('PONG');
// });

// // Static uploads


// // Routes
// app.use('/auth', AuthRouter);
// app.use('/treks', TrekRouter);
// app.use('/bookings', BookingRouter);
// app.use('/interactions', InteractionRouter);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/recommendations', RecommendationRouter);
// app.use('/reviews', ReviewRouter);

// // 404 last
// app.use((req, res) => {
//   res.status(404).json({ success: false, message: 'Route not found' });
// });

// // ✅ Connect DB first, then listen
// connectDB()
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`🚀 Backend server running on http://localhost:${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error('❌ Failed to start server because DB connection failed:', err?.message || err);
//     process.exit(1);
//   });
