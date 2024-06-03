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

        const { city, precipitation, windSpeed, cortinaState, manualControl } = req.body;

        if (!city || !precipitation || !windSpeed || !cortinaState) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newCity = {
            id: cities.length + 1,
            userId: decoded.id,
            city,
            precipitation: parseFloat(precipitation),
            windSpeed: parseFloat(windSpeed),
            cortinaState,
            manualControl: manualControl || false
        };

        cities.push(newCity);
        res.status(200).json({ id: newCity.id });
    });
});

app.put('/cities/:city', (req, res) => {
    const token = req.headers['authorization'];
    console.log('Received PUT request for city:', req.params.city);

    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });

        const cityName = decodeURIComponent(req.params.city);
        console.log('Updating city:', cityName); // Log to check if the route is being reached
        const { cortinaState, manualControl } = req.body;

        const city = cities.find(city => city.city === cityName && city.userId === decoded.id);
        if (!city) {
            console.log('City not found:', cityName);
            return res.status(404).json({ error: "City not found." });
        }

        city.cortinaState = cortinaState;
        city.manualControl = manualControl;

        console.log('Updated city state:', city); // Log the updated city state

        res.status(200).json({ message: 'City updated successfully.' });
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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
