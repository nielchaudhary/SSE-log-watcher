const express = require('express');

const app = express();
const PORT  = 3000;

const {handleSSE} = require('./index')

app.get('/log', handleSSE)


app.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}`);
})

