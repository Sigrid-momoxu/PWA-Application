const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(bodyParser.json());

const vapidKey = {
    publicKey: 'BObiZd7cOrEAfRSbMSkaz7QqlsNoesEyIsbCjNAAXePaQnBh_B2jd5mWMI52lTJQgs0kJ2yOt2w4C1EA0KPg4_U',
    privateKey: 'R9nQBxT4zBPW4z-6ksG37LNlkb6Sh0A47DkGyW1Xi0k',
};

const endpoint = {"endpoint":"https://fcm.googleapis.com/fcm/send/eqdKfGmkNCU:APA91bFpGnvo_xJVlzHWhn75Y6DBnzo96c5c459Z3fHITWbXEksUtpUX56Uw1sEpTL_GPvLdcQAJyAJmsa5gGwdRppLfsKIgpDowHcLHNRXKEaUrkp_98ECOs2zX4hHFkwdV2vO6KrvF","expirationTime":null,"keys":{"p256dh":"BOF1v_Z1hMBjZXTfYu5vir3gs8sCcZp6TcEiKd_hPH03YVKbHIas1gyLP2bNALQGoNP0yxV6Wy-nA0aEFswxx-k","auth":"Hx2AlS65uGr__Eb04igKbQ"}};

webPush.setVapidDetails('mailto: example@163.com', vapidKey.publicKey, vapidKey.privateKey);


// SQLite database configuration
const db = new sqlite3.Database('notifications.db', sqlite3.OPEN_READWRITE, err => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the notifications database.')
    }
});


// Function to send push notification
function sendPushNotification(endpoint, payload) {
    webPush.sendNotification(endpoint, JSON.stringify(payload))
    .then(() => console.log('Notification sent successfully!'))
    .catch((err) => console.error('Failed to send notification: ', err));
}


// Function to fetch and schedule notification from the database
async function fetchAndScheduleNotifications() {
    const currentTime = Date.now();
    const selectQuery = 'SELECT * FROM messages WHERE time <= ?';

    db.all(selectQuery, [currentTime], (err, notificationsToSend) => {
        if (err) {
            console.error('Error fetching and scheduling notifications: ', err)
        } else {
            notificationsToSend.forEach((notification) => {
                const { endpoint, payload } = notification;
                sendPushNotification(endpoint, JSON.parse(payload));
            });
        }
    });
}

// Background task to fetch and send scheduled notifications
setInterval(fetchAndScheduleNotifications, 60000); // Check every minute for scheduled notifications

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});