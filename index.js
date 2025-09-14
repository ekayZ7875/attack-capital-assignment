import dotenv from 'dotenv'
const express = require('express');
const roomsRouter = require('./routes/rooms');
const transferRouter = require('./routes/transfers');
const summaryRouter = require('./routes/summaries');

dotenv.config()

const app = express();
app.use(express.json());

app.use('/api/rooms', roomsRouter);
app.use('/api/transfers', transferRouter);
app.use('/api/summaries', summaryRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
