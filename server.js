const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const xlsx = require('xlsx');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const excelFilePath = path.join(__dirname, 'data.xlsx');

function readExcelFile() {
    const workbook = xlsx.readFile(excelFilePath);
    const adminsSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Admins']);
    const employeesSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Medewerkers']);
    const recordsSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Geregistreerde tijden']);
    return { adminsSheet, employeesSheet, recordsSheet };
}

function writeExcelFile(data) {
    const workbook = xlsx.readFile(excelFilePath);
    workbook.Sheets['Admins'] = xlsx.utils.json_to_sheet(data.adminsSheet);
    workbook.Sheets['Medewerkers'] = xlsx.utils.json_to_sheet(data.employeesSheet);
    workbook.Sheets['Geregistreerde tijden'] = xlsx.utils.json_to_sheet(data.recordsSheet);
    xlsx.writeFile(workbook, excelFilePath);
}

app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const { adminsSheet, employeesSheet } = readExcelFile();
    const admin = adminsSheet.find(a => a.Gebruikersnaam === username && a.Wachtwoord === password);
    const employee = employeesSheet.find(e => e.Gebruikersnaam === username && e.Wachtwoord === password);
    if (admin) {
        req.session.user = admin;
        res.send({ role: 'admin', message: 'Login successful' });
    } else if (employee) {
        req.session.user = employee;
        res.send({ role: 'employee', message: 'Login successful' });
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.post('/addUser', (req, res) => {
    if (!req.session.user || req.session.user.Gebruikersnaam !== 'cas') {
        return res.status(403).send('Unauthorized');
    }
    const { name } = req.body;
    const data = readExcelFile();
    data.employeesSheet.push({ Gebruikersnaam: name, Wachtwoord: 'password' });
    writeExcelFile(data);
    res.send('User added');
});

app.post('/registerTime', (req, res) => {
    const { userId, startTime, endTime, location } = req.body;
    const data = readExcelFile();
    data.recordsSheet.push({ Gebruikersnaam: userId, Starttijd: startTime, Eindtijd: endTime, Locatie: location });
    writeExcelFile(data);
    res.send('Time registered');
});

app.get('/getRecords', (req, res) => {
    if (!req.session.user || req.session.user.Gebruikersnaam !== 'cas') {
        return res.status(403).send('Unauthorized');
    }
    const { recordsSheet } = readExcelFile();
    res.json(recordsSheet);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
