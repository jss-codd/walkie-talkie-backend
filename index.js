const express = require('express'); 
const app = express(); 
// const { Server } = require('socket.io');
const http = require('http'); 
const server = http.createServer(app);
var cors = require('cors');
const { getDeviceTokens } = require('./utils/Device');
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");

const { Devices, Locations } = require("./utils/db/model");
const {SERVER_URL} = require("./utils/Constants");

const admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = 5000;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const fileStatic = 'https://onlinetestcase.com/wp-content/uploads/2023/06/100-KB-MP3.mp3';

app.get('/', (req, res) => { 
    res.send('ok'); 
});

app.use('/resources',express.static(__dirname + '/myuploads'));

// SET STORAGE
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
  let dir = `myuploads/`; // specify the path you want to store file
  //check if file path exists or create the directory
  fs.access(dir, function(error) {
    if (error) {
      console.log("Directory does not exist.");
      return fs.mkdir('myuploads', error => cb(error, dir));
    } else {
      console.log("Directory exists.");
      return cb(null, dir);
    }
  });
  },
    filename: function(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // added Date.now() so that name will be unique
  }
});
  
const uploadFiles = multer({ storage: storage });

app.post("/upload", uploadFiles.single("file"), async (req, res, next) => {
  try{
    const file = req.file;
    if (!file) {
      const error = new Error("Please upload a file");
      error.statusCode = 400;
      return next(error);
    }

    const bodyParse = JSON.parse(JSON.stringify(req.body));
    const token = bodyParse?.token || "";
  
    //send to devices in push notification
    //first get all device tokens
    const tokens = await getDeviceTokens();
    
    // const tokensArray = tokens.filter((d) => d.token != token).map(d => d.token);
    const tokensArray = tokens.map(d => d.token);

    console.log(tokensArray, 'tokensArray')

    const batchSize = 500;
    const batches = [];
    for (let i = 0; i < tokensArray.length; i += batchSize) {
      batches.push(tokensArray.slice(i, i + batchSize));
    }

    // Map batches to promises for concurrent processing
    const notifications = batches.map((batch) => {
      const message = {
        data: {
          // audio_url: `${SERVER_URL}/resources/${file.filename}`
          audio_url: `${fileStatic}`
        },
        tokens: [...batch],
        notification: {
          "title":"Recording App",
          "body":"New incoming recording"
         },
         "android": {
           "priority": "high",
          }
      };

      return admin.messaging().sendMulticast(message);
    });

    // Wait for all notifications to be sent
    const responses = await Promise.all(notifications);
  
    res.json({
      success: true,
      statusCode: 200,
      fileName: file.filename 
    });
  } catch(error){
    res.statusCode(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/device-token", async (req, res) => {
  try{
    const token = req.body.token || "";

    if(token) {
      const tokenRes = await Devices.findOne({ where: { token: token } });
      
    if (tokenRes === null) {
        const device = await Devices.create( { token } );
      }
    }

    return res.json({ success: true, token });
  } catch(err){
    return res.statusCode(500).json({ success: false, error: err.message });
  }
});

app.post("/save-location", async (req, res) => {
  try{
    const token = req.body.token || "";
    const latitude = req.body.latitude || "";
    const longitude = req.body.longitude || "";

    if(token && latitude && longitude) {
      const device = await Locations.create( { "token": token, "lat": latitude, "lng": longitude } );
    }

    return res.json({ success: true });
  } catch(err){
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/audio-play-status", async (req, res) => {
  try{
    const token = req.body.token || "";
    const status = req.body.status;

    if(token) {
      const res = await Devices.update(
        { play_audio: status },
        {
          where: {
            token: token,
          },
        },
      );
    }

    return res.json({ success: true, status });
  } catch(err){
    return res.statusCode(500).json({ success: false, error: err.message });
  }
});

app.put("/notification-status", async (req, res) => {
  try{
    const token = req.body.token || "";
    const status = req.body.status;

    if(token) {
      const res = await Devices.update(
        { status: status },
        {
          where: {
            token: token,
          },
        },
      );
    }

    return res.json({ success: true, status });
  } catch(err){
    return res.statusCode(500).json({ success: false, error: err.message });
  }
});

app.post("/fetch-settings", async (req, res) => {
  try{
    const token = req.body.token || "";
    let status = true;
    let play_audio = true;

    if(token) {
      const tokenRes = await Devices.findOne({ where: { token: token } }, { raw: true });
      if(tokenRes)
        status = tokenRes.status;
        play_audio = tokenRes.play_audio;
    }

    return res.json({ success: true, status: status, play_audio });
  } catch(err){
    return res.statusCode(500).json({ success: false, error: err.message });
  }
});
  
server.listen(port, () => { 
    console.log(`Server is listening at the port: ${port}`); 
});