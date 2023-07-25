const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
app.use(bodyParser.json());

const vapidKey = {
    publicKey: 'BObiZd7cOrEAfRSbMSkaz7QqlsNoesEyIsbCjNAAXePaQnBh_B2jd5mWMI52lTJQgs0kJ2yOt2w4C1EA0KPg4_U',
    privateKey: 'R9nQBxT4zBPW4z-6ksG37LNlkb6Sh0A47DkGyW1Xi0k',
};

const endpoint = {"endpoint":"https://fcm.googleapis.com/fcm/send/eqdKfGmkNCU:APA91bFpGnvo_xJVlzHWhn75Y6DBnzo96c5c459Z3fHITWbXEksUtpUX56Uw1sEpTL_GPvLdcQAJyAJmsa5gGwdRppLfsKIgpDowHcLHNRXKEaUrkp_98ECOs2zX4hHFkwdV2vO6KrvF","expirationTime":null,"keys":{"p256dh":"BOF1v_Z1hMBjZXTfYu5vir3gs8sCcZp6TcEiKd_hPH03YVKbHIas1gyLP2bNALQGoNP0yxV6Wy-nA0aEFswxx-k","auth":"Hx2AlS65uGr__Eb04igKbQ"}};

webPush.setVapidDetails('mailto: example@163.com', vapidKey.publicKey, vapidKey.privateKey);


// PostgreSQL database configuration
const pool = new Pool({
    user: 'postgres-user',
    host: 'postgres-host',
    database: 'postgres-database',
    password: 'sigrid',
    port: 5432 // Adjust the port based on the PostgreSQL
})


// API endpoint to schedule a push notification
app.post('/schedule', async (req, res) => {
    const {endpoint, payload, scheduleTime} = req.body;
    const client = await pool.connect();
    try {
        const query = 'INSERT INTO  scheduled_notifications (endpoint, payload, schedule_time) VALUE ($1, $2, $3)';
        await client.query(query, [endpoint, JSON.stringify(payload), scheduleTime]);
        res.status(200).json({ message: 'Notification scheduled successfully!' });
    } catch (err) {
        console.error('Error scheduling notification: ', err);
        res.status(500).json({ error: 'An internal server error occurred.'});
    } finally {
        client.release();
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
    const client = await pool.connect();
    try {
        const currentTime = Date.now();
        const query = 'SELECT * FROM scheduled_notification WHERE schedule_time <= $1';
        const result = await client.query(query, [currentTime]);

        const notificationsToSend = result.rows;
        const deleteQuery = 'DELETE FROM scheduled_notifications WHERE schedule_time <= $1'
        await client.query(deleteQuery, [currentTime]);

        notificationsToSend.forEach((notification) => {
            const { endpoint, payload} = notification;
            sendPushNotification(endpoint, JSON.stringify(payload))
        });
    } catch (err) {
        console.error('Error fetching and scheduling notifications: ', err);
    } finally {
        client.release();
    }
}

// Background task to fetch and send scheduled notifications
setInterval(fetchAndScheduleNotifications, 60000); // Check every minute for scheduled notifications

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});