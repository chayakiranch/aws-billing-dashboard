require('dotenv').config();
const express = require('express');
const cors = require('cors');
const billingRoutes = require('./routes/billing');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173'  // your React dev server
}));
app.use(express.json());

// Mount billing routes
app.use('/api/billing', billingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});