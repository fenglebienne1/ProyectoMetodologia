const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Servir archivos estáticos (index.html, styles.css, script.js)

const secretKey = 'your-secret-key';

let users = [];
let cities = [];

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const newUser = {
        id: users.length + 1,
        username,
        password: hashedPassword
    };
    users.push(newUser);

    const token = jwt.sign({ id: newUser.id }, secretKey, { expiresIn: 86400 });
    res.status(200).json({ auth: true, token: token });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = users.find(user => user.username === username);
    if (!user) return res.status(404).json({ error: "User not found." });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ auth: false, token: null });

    const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: 86400 });
    res.status(200).json({ auth: true, token: token });
});

app.post('/cities', (req, res) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });

        const { city, precipitation, windSpeed, cortinaState } = req.body;

        const newCity = {
            id: cities.length + 1,
            userId: decoded.id,
            city,
            precipitation: parseFloat(precipitation),
            windSpeed: parseFloat(windSpeed),
            cortinaState
        };

        cities.push(newCity);
        res.status(200).json({ id: newCity.id });
    });
});

app.get('/cities', (req, res) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });

        const userCities = cities.filter(city => city.userId === decoded.id);
        res.status(200).json(userCities);
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
