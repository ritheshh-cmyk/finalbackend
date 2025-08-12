import express from 'express';
import authRouter from './auth';

const app = express();
app.use(express.json());

// Mount the auth router at /api
app.use('/api', authRouter);

export default app; 