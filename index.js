const express = require('express'); 
const app = express();
const http = require('http'); 
const server = http.createServer(app);
var cors = require('cors');
const bodyParser = require("body-parser");
const socketIo = require('socket.io');

const authJwt = require("./utils/Token");
const { Devices } = require("./utils/db/model");
const { SERVER_URL } = require("./utils/Constants");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const io = socketIo(server, {
  pingTimeout: 60000
});

const port = 5000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let userMap = new Map();
let locations = [];
const roomName = 'room';

let roomData = [];
let roomUsers = new Map();


// const sockets = await io.in(routeid).fetchSockets(); => To get socket user in the room

io.on('connection', async (socket) => {
    console.log('A user connected', socket.id);

    // using
    socket.on("roomJoin", async (roomId) => {
        console.log(roomId, '------roomJoin');

        const findIndex = roomData.findIndex(d => d.roomId === roomId);

        if(findIndex === -1) {
          roomData.unshift( { roomId: roomId, callStatus: false } );
        }

        const userInfo = roomUsers.get(socket.id);

        if(!userInfo) {
            roomUsers.set(socket.id, { roomId });
        }

        socket.join(roomId);
    });

    // using
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

                if(findIndex > -1) {
                    locations[findIndex] = { id: tokenData.data.id, socketId: socket.id, ...location }
                }
            }

            // socket.broadcast.emit('receiveLocation', locations);
    
            io.emit('receiveLocation', locations);
        }
    });

    // using
    socket.on('disconnect', async () => {
        console.log('User disconnected', socket.id);

        const userInfo = userMap.get(socket.id);

        if (userInfo) {
            locations = locations.filter(loc => loc.socketId != socket.id);

            userMap.delete(socket.id);

            io.emit('receiveLocation', locations);
        }

        // call in free state
        const roomUserInfo = roomUsers.get(socket.id);

        console.log(roomUserInfo, '------roomUserInfo')
        console.log(roomData, '------roomData')

        if (roomUserInfo) {
          const findIndex = roomData.findIndex(d => d.roomId === roomUserInfo.roomId);
          if(findIndex > -1) {
            roomData[findIndex]['callStatus'] = false;
          }
          
          roomUsers.delete(socket.id);

          const usersInRoom = await io.in(roomUserInfo.roomId).fetchSockets();
          console.log(usersInRoom.length, '----------usersInRoom.length');

          if(usersInRoom.length === 0) {
            roomData = [];
          }

          socket.to(roomUserInfo.roomId).emit("endOfCall", {
            callerId: socket.id,
          });
        }
    });

    //---------------------------------------

      // using
      socket.on('leave', async (room) => {
        console.log(room, socket.id, '------leave');

        socket.leave(room);

        const roomUserInfo = roomUsers.get(socket.id);

        if (roomUserInfo) {
          roomUsers.delete(socket.id);
        }
        
        const usersInRoom = await io.in(room).fetchSockets();
          console.log(usersInRoom.length);

          if(usersInRoom.length === 0) {
            roomData = [];
          }
      });
      
      //---------------------------------------

      // using
      socket.on('checkCall', async (roomId, callback) => {
        console.log(roomId, '-----------checkCall');

        console.log(roomData, '----------roomData');

        // check in room what is the call status

        const callStatus = roomData.find(d => d.roomId === roomId)?.callStatus ?? true;

        if(callStatus){
          callback(1); // on busy call
        } else {
          //check if there are any users in room for receving call
          const usersInRoom = await io.in(roomId).fetchSockets();
          console.log(usersInRoom.length, '--------usersInRoom.length');

          if(usersInRoom.length > 1) {
            callback(2); // continue call
          } else {
            callback(3); // No user in room
          }
        }
      })

      // using
      socket.on('joinRoom', async (payload, callback) => {
        let roomId = payload.roomId;

        console.log(roomId,  '-----------joinRoom outer')
        
        if (payload.userType === "caller") {
            console.log('-----------joinRoom inside');

            // socket.join(roomId);

            console.log(locations, '------locations');

            const findCaller = locations.filter(d => d.socketId == socket.id);

            console.log(findCaller, '------findCaller');

            if(findCaller && findCaller.length > 0) {
              const calllerId = findCaller[0]['id'];

              const location = {lat: findCaller[0]['latitude'] || 0, lng: findCaller[0]['longitude'] || 0};

              const resCaller = await Devices.findOne({ where: { id: calllerId } });

              const profile_img = resCaller.profile_img ? `${ SERVER_URL }/${ resCaller.profile_img }` : null;

              if(resCaller != null) {
                console.log('-----------joinRoom return');
                socket.to(roomId).emit('calling', resCaller.name, location, profile_img, calllerId, roomId); //To all connected clients except the sender

                // call in busy state
                const findIndex = roomData.findIndex(d => d.roomId === roomId);
                console.log(findIndex, '--------findIndex')
                if(findIndex > -1) {
                  roomData[findIndex]['callStatus'] = true;

                  console.log(roomData, '--------roomData')
                }
              }
            }
        } else if (payload.userType === "receiver") {
            // socket.join(roomId);
            socket.to(roomId).emit("requestToJoin", {
            callerId: socket.id,
            }); // in room except sender
        }
      });

      // using
      socket.on('teacherLive', async (payload) => {
        console.log('-----------teacherLive')
        let rtcMessage = payload.rtcMessage;
        let roomId = payload.roomId;

        socket.to(roomId).emit('receiveTeacherCall', { rtcMessage: rtcMessage, callerId: socket.id});
      });

      socket.on('ICEcandidate', async (payload) => {
        console.log('-----------ICEcandidate')
        let calleeId = payload.calleeId;
        let rtcMessage = payload.rtcMessage;

        socket.to(calleeId).emit("ICEcandidate", {
            sender: socket.id,
            rtcMessage: rtcMessage,
        });
      });

      // using
      socket.on('endCall', async (payload) => {
        console.log('-----------endCall')
        let roomId = payload.roomId;
        socket.to(roomId).emit("endOfCall", {
          callerId: socket.id,
        });

        // call in free state
        const findIndex = roomData.findIndex(d => d.roomId === roomId);
        if(findIndex > -1) {
          roomData[findIndex]['callStatus'] = false;
        }
      });

      // using
      socket.on('answerCall', async (payload) => {
        console.log('-----------answerCall')
        let callerId = payload.callerId;
        let rtcMessage = payload.rtcMessage;
        
        socket.to(callerId).emit("callAnswered", {
            callee: socket.id,
            rtcMessage: rtcMessage,
        });
      });

      // using
      socket.on('sendActionIconLocation', async (payload) => {
        const { roomId, lat, lng, type } = payload;

        socket.to(roomId).emit('receiveActionIconLocation', { lat, lng, type, createdAt: new Date() } );
      });

      // using
      socket.on('messageToServer', async (payload, callback) => {
        console.log(payload, '-----------messageToServer');

        callback('Response from server');
      });
});

app.use('/resources',express.static(__dirname + '/myuploads'));
app.use('/profile-images',express.static(__dirname + '/profile-images'));

require("./routes/user.routes")(app);
require("./routes/admin.routes")(app);
  
server.listen(port, () => { 
    console.log(`Server is listening at the port: ${ port }`); 
});