const admin = require("firebase-admin");
const express = require('express'); 
const app = express();
const http = require('http'); 
const server = http.createServer(app);
var cors = require('cors');
const bodyParser = require("body-parser");

var serviceAccount = require("./serviceAccountKey.json");
const {SERVER_URL} = require("./utils/Constants");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/resources',express.static(__dirname + '/myuploads'));

// This registration token comes from the client FCM SDKs.
const registrationToken = 'cPFleNv4TWSbLYjNXcbZ6L:APA91bHiXbklbUyUanTWcXXdKcAf0-FQMKkYJlP4riS3eZanjQuYNpYjBXK0-5saf1Q17dZ4a152yNN749-ePtjB_xV5FLwbXDuQOqbQfl9oQcjLD1-Wg09JCtrdYaHg34jxsJQ8UZXZ';

const message = {
    "token": registrationToken,
    "data": {
        "body": "Body of Your Notification in data",
        "title": "Title of Your Notification in data",
        "audio_url": `${SERVER_URL}/resources/100-KB-MP3.mp3`,
        "key_2": "Value for key_2"
    },
    "notification":{
      "title":"Portugal vs. Denmark",
      "body":"great match!"
     },
     "android": {
       "priority": "high",
      }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send a message to the device corresponding to the provided
// registration token.
admin.messaging().send(message)
  .then((response) => {
    // Response is a message ID string.
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });