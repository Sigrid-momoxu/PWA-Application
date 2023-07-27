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
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TIME NOT NULL,
    message TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  // insert default messages
  db.run(`INSERT INTO messages(time, message) VALUES('09:00:00', 'Good Morning!')`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
  db.run(`INSERT INTO messages(time, message) VALUES('12:00:00', 'Have a break!')`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
  db.run(`INSERT INTO messages(time, message) VALUES('18:00:00', 'Review your work!')`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
});

// export the database for use in other modules
module.exports = db;
