const admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

// This registration token comes from the client FCM SDKs.
const registrationToken = 'clGnR14_SEGTVeuNQstY_h:APA91bGJWsY0CLGO2IbbfXGlS66UrRwDwMUwOfGJp4cvlJSO4wO9KidRyW0FmUaUsMMAx_I2kGQTA_LaJWi50uiWu-khGhhClru9UnV5QwNE_Paos4QgVngAXPxlLHlc-Pl9hNlOaAyy';

const message = {
    "token": registrationToken,
    "data": {
        "body": "Body of Your Notification in data",
        "title": "Title of Your Notification in data",
        "audio_url": "https://onlinetestcase.com/wp-content/uploads/2023/06/100-KB-MP3.mp3",
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