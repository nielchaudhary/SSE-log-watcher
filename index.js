const fs = require('fs');
const fsPromises = require('fs').promises
const path = './log.txt'
var reqIds = [];
var subscribers = 0;
var pool = {};
var last10Lines = [];
var counter =0;


function save10Lines(line){
    if(last10Lines.length>10){
        last10Lines.shift();
    }

    last10Lines.push(line);
}

//to send the most recent 10 lines of the log file.
function emitLast10Lines(res){
    for(let i=0; i<last10Lines.length; i++){
        emitSSE(res, last10Lines[i]);
    }

}

const asyncWatchEventIterator = fsPromises.watch(path)

// setInterval(()=>{
//     fs.writeFileSync(path, `New Server Log Update Received : ${counter}`)
//     counter++;
// },1000)

async function watcher(){
    try{
        for await(const event of asyncWatchEventIterator){
            let data = await fsPromises.readFile(path)
            data = data.toString();
            save10Lines(data);

            //to send the updated data to the clients.
            for(let i =0; i<reqIds.length;i++){
                emitSSE(pool[reqIds[i]], data)
            }

        }

    }catch(error){
        console.error('Error Reading the file', error)
    }


}

watcher();

const emitSSE = (res,data) => {res.write('Server Said : ' + data + '\n\n')}

const handleSSE = (req,res) =>{

    req.on('close', ()=>{
        console.log('SSE Client Disconnected', req.id)

        //for loop in order to remove the disconnected Client ID from the reqIds array.
        for(let i=0; i<reqIds.length; i++){
            if(reqIds[i]=== req.id){
                reqIds.splice(req.id,1);
                break;
            }
        }
        subscribers--;  //reduce the subscriber count by 1 on disconnection.
        return;

    })

    console.log('New SSE Client Connected')
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection' : 'keep-alive'
    })

    emitLast10Lines(res)    //to emit most recent 10 log updates to the new client connection.
    req.id = Date.now()    //to create a Unique Request ID for every new connection.
    reqIds.push(req.id)     //Pushing the RequestID to the existing reqIds array.
    pool[req.id] = res;    //assigning the unique pool req.id to the response object.
    subscribers++           //to add +1 to the existing number of subsribers to the server.
    console.log('Total Connections:' , subscribers , "ReqIDs:" , reqIds)



}


module.exports = {handleSSE}