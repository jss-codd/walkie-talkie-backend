const express = require('express'); 
const app = express();
const http = require('http'); 
const server = http.createServer(app);
var cors = require('cors');
const bodyParser = require("body-parser");
const socketIo = require('socket.io');
const authJwt = require("./utils/Token");
const { Devices } = require("./utils/db/model");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const io = socketIo(server);

const port = 5000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let userMap = new Map();
let locations = []

// const sockets = await io.in(routeid).fetchSockets(); => To get socket user in the room

io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on("roomJoin", async (roomId) => {
        io.in(socket.id).socketsJoin(roomId);
    });

    socket.on("sendLocation", async (arg) => {
        const { location, token } = arg;

        const tokenData = authJwt.verifyAccessToken(token);

        if(tokenData.success){
            const userInfo = userMap.get(socket.id);

            if(!userInfo) {
                userMap.set(socket.id, { });
                locations.unshift( { id: tokenData.data.id, socketId: socket.id, ...location });
            } else {
                findIndex = locations.findIndex(d => d.socketId == socket.id)

                if(findIndex) {
                    locations[findIndex] = { id: tokenData.data.id, socketId: socket.id, ...location }
                }
            }

            // socket.broadcast.emit('receiveLocation', locations);
    
            io.emit('receiveLocation', locations);
        }
    });

    socket.on('offer', async (data) => {
        console.log('-----------offer');

        // get details of caller & current location

        const findCaller = locations.filter(d => d.socketId == socket.id)

        if(findCaller && findCaller.length > 0) {
            const calllerId = findCaller[0]['id'];
            
            const location = {lat: findCaller[0]['latitude'] || 0, lng: findCaller[0]['longitude'] || 0};

            const resCaller = await Devices.findOne({ where: { id: calllerId } });
    
            if(resCaller != null) {
                socket.broadcast.emit('offer', data, { name: resCaller.name }, location);
            }
        }
    });
    
    socket.on('answer', (data) => {
        console.log('---------answer')
        socket.broadcast.emit('answer', data);
    });
    
    socket.on('candidate', (data) => {
        console.log('------------candidate')
        socket.broadcast.emit('candidate', data);
    });

    socket.on('leaveCall', (data) => {
        console.log('------------leaveCall')
        socket.broadcast.emit('leaveCall', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);

        socket.broadcast.emit('leaveCall', {});

        const userInfo = userMap.get(socket.id);

        if (userInfo) {
            locations = locations.filter(loc => loc.socketId != socket.id);

            userMap.delete(socket.id);

            io.emit('receiveLocation', locations);
        }
    });
});

app.use('/resources',express.static(__dirname + '/myuploads'));
app.use('/profile-images',express.static(__dirname + '/profile-images'));

require("./routes/user.routes")(app);
require("./routes/admin.routes")(app);
  
server.listen(port, () => { 
    console.log(`Server is listening at the port: ${ port }`); 
});