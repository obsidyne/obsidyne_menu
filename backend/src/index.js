import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import authRouter from "./routes/auth.js"
import restrauntsRoutes from "./routes/restraunts.js"
import menuRoutes from "./routes/menus.js"
import categoryRoutes from "./routes/categories.js"
import dishesRoutes from "./routes/dishes.js"
import combosRoutes from "./routes/combos.js"
import profileRoutes from "./routes/profile.js"
import publicRoutes from "./routes/public.js"

import { fileURLToPath } from 'url';
import path from 'path';


dotenv.config();



const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/restaurants', restrauntsRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dishes', dishesRoutes);
app.use('/api/combos', combosRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/public', publicRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
