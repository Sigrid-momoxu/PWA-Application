const sqlite3 = require('sqlite3').verbose();

// create and/or open the database
let db = new sqlite3.Database('./notifications.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the notifications database.');
});

// serialize database operations
db.serialize(() => {
  // create the messages table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    notification BOOLEAN
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  // insert default messages
  db.run(`INSERT INTO users(username, password, notification) VALUES('tester1', '123456', false)`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
});

// export the database for use in other modules
module.exports = db;
