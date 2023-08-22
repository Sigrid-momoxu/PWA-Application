const webpush = require('web-push');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');


const app = express();
app.use(express.json());
app.use(bodyParser.json());

// Replace these with the own VAPID keys and endpoint generated ealier

const endpoint ={"endpoint":"https://fcm.googleapis.com/fcm/send/cxnfg_uEIqM:APA91bHB-WGTbJ2Njy5Nu3QB-6A030QPdjKNs3tFUGV04nC72-LQt80CNaXxMHh5HZBwUugboVRcK8sRM-DA-6n-F5B4N58ygbRgpjgo56Qw0pj3Lc8W43xun0LQ8cITFuEZsCEJy36b","expirationTime":null,"keys":{"p256dh":"BOnZGKe9uHY7Arn_NoPG9SAZNUsH03kJW5nMDL6NRoteRjZmtR0fn51Yyp6CE74Sj3slT5hUuuwT6ggayupYUdM","auth":"DTWVNCXdoehh50lHC-U21g"}};

const publicKey = 'BDQt79CbZA0a412GgTaduApebus7qRRpbfpkMHQMNubGZERfvyK61R0421oOELSsCbvyPw9nwObKrjaVYmoi1yI';
const privateKey = 'jPtSA6TZOibrGjxaPMksb0ZWYLhTyoRuiUCImqflJTA';

webpush.setVapidDetails(
    'mailto: example@163.com',
    publicKey,
    privateKey
);

// In-memory database (you should use a real database)
let scheduledNotifications = [];

// API endpoint to schedule a push notification
app.post('/schedule', (req, res) => {
    const { userId, payload, scheduleTime } = req.body;
    
    // Retrieve the user's subscription status from the database
    db.get('SELECT notification FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const isSubscribed = Boolean(row.notification);
        if (isSubscribed) {
            scheduledNotifications.push({ userId, payload, scheduleTime });
            res.status(200).json({ message: 'Notification scheduled successfully!' });
        } else {
            res.status(200).json({ message: 'Notification not scheduled. User is not subscribed.' });
        }
    });
});

function sendPushNotification(endpoint, payload) {
    webpush.sendNotification(endpoint, JSON.stringify(payload))
    .then(() => console.log('Notification sent successfully!'))
    .catch((err) => console.error('Failed to send notification:', err));
}

function scheduleNotification() {
    const currentTime = Date.now();
    const scheduleTimes = [
        getScheduleTime(9, 43, 0),
        getScheduleTime(9, 44, 0),
        getScheduleTime(9, 45, 0),
    ];

    // 0 for the current time
    // -5 for Eastern time
    // 5 for Indian time

    const messages = [
        { title: "Good morning!", body: "The DSP for today has been ready! Let's today's study!", icon:"./AskAnjlee.png" },
        { title: "Have a Break?", body: "It's noon now. Do you want to begin today's DSP?", icon:"./AskAnjlee.png" },
        { title: "Good evening!", body: "Have you already finished you homework? Let's start the revision!", icon:"./AskAnjlee.png" },
    ];

    for (let i = 0; i < scheduleTimes.length; i++) {
        const scheduleTime = scheduleTimes[i];
        const payload = { 
            title: messages[i].title, 
            body: messages[i].body,
            icon: messages[i].icon
        };

        if (currentTime > scheduleTime.getTime()) {
            scheduleTime.setDate(scheduleTime.getDate() + 1);
        }

        scheduledNotifications.push({ endpoint, payload, scheduleTime: scheduleTime.getTime() });
    }
}


function getScheduleTime(hour, minute, timeZoneOffset) {
    const now = new Date();
    const utcTimestamp = now.getTime() + now.getTimezoneOffset() * 60000;
    const localTimestamp = utcTimestamp + timeZoneOffset * 3600000;
    
    const scheduleTime = new Date(localTimestamp);
    scheduleTime.setHours(hour, minute, 0, 0);
    return scheduleTime;
}


scheduleNotification();

// Background task to check and send scheduled notifications
setInterval(() => {
    const currentTime = Date.now();
    const notificationToSend = scheduledNotifications.filter((notification) => notification.scheduleTime <= currentTime);
    scheduledNotifications = scheduledNotifications.filter((notification) => notification.scheduleTime > currentTime);

    notificationToSend.forEach((notification) => {
        sendPushNotification(notification.endpoint, notification.payload);
    });
}, 60000); // Check every minute for scheduled notifications


// API endpoint to cancel a push notification subscription
app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    scheduledNotifications = scheduledNotifications.filter(notification => notification.endpoint !== endpoint);
    res.status(200).json({ message: 'Subscription canceled successfully!' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})

// API to get user subscription status
app.get('/user/:id/subscription', (req, res) => {
    const userId = req.params.id;
    db.get('SELECT isSubscribed FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ isSubscribed: Boolean(row.isSubscribed) });
    });
  });
  
  // API to update user subscription status
  app.post('/user/:id/subscription', (req, res) => {
    const userId = req.params.id;
    const isSubscribed = req.body.isSubscribed ? 1 : 0;
  
    db.run('INSERT OR REPLACE INTO users (id, isSubscribed) VALUES (?, ?)', [userId, isSubscribed], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    });
  });