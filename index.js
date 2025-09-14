import dotenv from 'dotenv'
const express = require('express');
const roomsRouter = require('./controllers/rooms');
const transferRouter = require('./controllers/transfer.js');
const summaryRouter = require('./controllers/summaries');

dotenv.config()

const app = express();
app.use(express.json());

app.use('/api/rooms', roomsRouter);
app.use('/api/transfer', transferRouter);
app.use('/api/summaries', summaryRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
