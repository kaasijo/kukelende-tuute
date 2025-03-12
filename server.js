const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE admins (username TEXT, password TEXT)");
    db.run("CREATE TABLE employees (username TEXT, password TEXT)");
    db.run("CREATE TABLE records (userId TEXT, startTime TEXT, endTime TEXT, location TEXT)");

    db.run("INSERT INTO admins (username, password) VALUES ('cas', 'Kaassticks11!')");
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE username = ? AND password = ?", [username, password], (err, admin) => {
        if (admin) {
            req.session.user = admin;
            res.send({ role: 'admin', message: 'Login successful' });
        } else {
            db.get("SELECT * FROM employees WHERE username = ? AND password = ?", [username, password], (err, employee) => {
                if (employee) {
                    req.session.user = employee;
                    res.send({ role: 'employee', message: 'Login successful' });
                } else {
                    res.status(401).send('Invalid credentials');
                }
            });
        }
    });
});

app.post('/addUser', (req, res) => {
    if (!req.session.user || req.session.user.username !== 'cas') {
        return res.status(403).send('Unauthorized');
    }
    const { name } = req.body;
    db.run("INSERT INTO employees (username, password) VALUES (?, ?)", [name, 'password'], (err) => {
        if (err) {
            res.status(500).send('Error adding user');
        } else {
            res.send('User added');
        }
    });
});

app.post('/registerTime', (req, res) => {
    const { userId, startTime, endTime, location } = req.body;
    db.run("INSERT INTO records (userId, startTime, endTime, location) VALUES (?, ?, ?, ?)", [userId, startTime, endTime, location], (err) => {
        if (err) {
            res.status(500).send('Error registering time');
        } else {
            res.send('Time registered');
        }
    });
});

app.get('/getRecords', (req, res) => {
    if (!req.session.user || req.session.user.username !== 'cas') {
        return res.status(403).send('Unauthorized');
    }
    db.all("SELECT * FROM records", (err, rows) => {
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
