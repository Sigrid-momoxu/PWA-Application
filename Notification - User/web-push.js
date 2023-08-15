const webpush = require('web-push');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');


const app = express();
app.use(express.json());
app.use(bodyParser.json());

// Replace these with the own VAPID keys and endpoint generated ealier

const endpoint = {"endpoint":"https://fcm.googleapis.com/fcm/send/enfa0RNrgQE:APA91bHv32v0zXoyn5YxCIGMx2eZPFCd6iwK9VqwXGHWJh8dQpwyAeIjODuUGn6PkNMTF24hbWQf1mEgXMoNGjCTeQu1vbUKMhsXTepWB8KsfJL_Uq3O9rRE-t639ZamvFVzEjjOpJGB","expirationTime":null,"keys":{"p256dh":"BHQGhD4cG0wYb_ZkikDOjLJWgl9aFB59KnIx8XXjY8zhMQDy2qXogd-y51Nvk3Q7WeCac1hLlXXmpJIxS5KDXIk","auth":"aQ05L1TOfFRQrIG2N7Wmgw"}};

const publicKey = 'BAGVxPs9iVnCX4SYzVWZyr5ryV6Z9ddUX2u7uwyXm8xy4eUshsZv0lAG1a3B_fDRVnAcfaJqszaskYh1s1VUweg';
const privateKey = 'qNn6DoV7eseKhwXiXgng9faDqBLt8gfmMFIfwgOWMnk';

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

    db.get('SELECT notification FROM users WHERE id = ?', [1], (err, row) => {
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
        getScheduleTime(9, 12),
        getScheduleTime(9, 13),
        getScheduleTime(9, 14),
    ];

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

        // Retrieve the user's subscription status from the database
        db.get('SELECT notification FROM users WHERE id = ?', [1], (err, row) => {
            if (err) {
                console.error('Error fetching user notification status:', err);
                return;
            }

            const isSubscribed = Boolean(row.notification);
            if (isSubscribed) {
                if (currentTime > scheduleTime.getTime()) {
                    scheduleTime.setDate(scheduleTime.getDate() + 1);
                }

                scheduledNotifications.push({ endpoint, payload, scheduleTime: scheduleTime.getTime() });
            }
        });
    }
}



function getScheduleTime(hour, minute) {
    const scheduleTime = new Date();
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
