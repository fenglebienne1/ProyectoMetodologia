const weatherApiKey = 'a2jahshc3fxhaehm1t8s5z9pmnqtskb5lp1u6uc4'; // Clave de API de Meteosource
const geocodeApiKey = '279406820f6c4321bca50475443149a7'; // Tu clave de API de OpenCage Data
let token = null;

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
        token = data.token;
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
        loadCities();
        setInterval(loadCities, 10 * 60 * 1000); // Actualizar cada 10 minutos
    } else {
        alert(data.error || 'Login failed');
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
        token = data.token;
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
        loadCities();
        setInterval(loadCities, 10 * 60 * 1000); // Actualizar cada 10 minutos
    } else {
        alert(data.error || 'Registration failed');
    }
}

async function getCoordinates(city) {
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${city}&key=${geocodeApiKey}`);
    if (!response.ok) {
        throw new Error(`Geocoding API error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return { lat, lon: lng };
    } else {
        throw new Error('City not found');
    }
}

async function getWeatherData(lat, lon) {
    const latFormatted = lat < 0 ? `${Math.abs(lat).toFixed(2)}S` : `${Math.abs(lat).toFixed(2)}N`;
    const lonFormatted = lon < 0 ? `${Math.abs(lon).toFixed(2)}W` : `${Math.abs(lon).toFixed(2)}E`;

    const url = `https://www.meteosource.com/api/v1/free/point?lat=${latFormatted}&lon=${lonFormatted}&sections=current%2Chourly&language=en&units=auto&key=${weatherApiKey}`;
    console.log(`Fetching weather data from: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Weather API error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Weather data:', data); // Imprimir los datos completos para inspección
    return data;
}

function evaluateWeatherData(data) {
    const precipitation = data.current?.precipitation?.total?.toFixed(2) ?? "No registrado";
    const windSpeed = data.current?.wind?.speed?.toFixed(2) ?? "No registrado"; // Velocidad del viento en m/s

    // Convertir la velocidad del viento de m/s a km/h si está disponible
    const windSpeedKmh = windSpeed !== "No registrado" ? (windSpeed * 3.6).toFixed(2) : "No registrado";

    const cortinaActivada = (precipitation !== "No registrado" && parseFloat(precipitation) > 50) || (windSpeedKmh !== "No registrado" && parseFloat(windSpeedKmh) > 130);

    return {
        precipitation,
        windSpeedKmh,
        cortinaActivada
    };
}

function updateDeviceStatus(city, data) {
    const statusElement = document.getElementById('current-status');
    const cityElement = document.getElementById('current-city');
    const precipitationElement = document.getElementById('current-precipitation');
    const windSpeedElement = document.getElementById('current-wind-speed');

    cityElement.textContent = city;
    statusElement.textContent = data.cortinaActivada ? 'Activado' : 'Desactivado';
    precipitationElement.textContent = `${data.precipitation} mm/h`;
    windSpeedElement.textContent = `${data.windSpeedKmh} km/h`;
}

async function addCity() {
    const city = document.getElementById('city-input').value;
    if (city) {
        try {
            const { lat, lon } = await getCoordinates(city);
            const weatherData = await getWeatherData(lat, lon);
            const evaluatedData = evaluateWeatherData(weatherData);

            const response = await fetch('http://localhost:3000/cities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    city,
                    precipitation: evaluatedData.precipitation,
                    windSpeed: evaluatedData.windSpeedKmh,
                    cortinaState: evaluatedData.cortinaActivada ? 'activada' : 'desactivada'
                })
            });

            if (response.ok) {
                loadCities();
                updateDeviceStatus(city, evaluatedData);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add city');
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
            alert('Error fetching weather data. Please try again later.');
        }
    } else {
        alert('Por favor, ingresa el nombre de una ciudad');
    }
}

async function updateCityWeather(city) {
    try {
        const { lat, lon } = await getCoordinates(city.city);
        const weatherData = await getWeatherData(lat, lon);
        const evaluatedData = evaluateWeatherData(weatherData);

        city.precipitation = evaluatedData.precipitation;
        city.windSpeed = evaluatedData.windSpeedKmh;
        city.cortinaState = evaluatedData.cortinaActivada ? 'activada' : 'desactivada';

        return city;
    } catch (error) {
        console.error('Error updating weather data for city:', error);
        return null;
    }
}

async function loadCities() {
    const response = await fetch('http://localhost:3000/cities', {
        method: 'GET',
        headers: {
            'Authorization': token
        }
    });

    const cities = await response.json();
    const cityContainer = document.getElementById('cities-container');
    cityContainer.innerHTML = '';

    for (const city of cities) {
        const updatedCity = await updateCityWeather(city);
        if (updatedCity) {
            const cortinaActivada = (updatedCity.precipitation > 50) || (updatedCity.windSpeed > 130);
            const cityElement = document.createElement('div');
            cityElement.className = 'city';
            cityElement.innerHTML = `
                <h3>${updatedCity.city}</h3>
                <p>Precipitation: ${updatedCity.precipitation} mm/h</p>
                <p>Wind Speed: ${parseFloat(updatedCity.windSpeed).toFixed(2)} km/h</p>
                <p>Estado de cortina: ${cortinaActivada ? 'activada' : 'desactivada'}</p>
            `;
            cityElement.onclick = () => updateDeviceStatus(updatedCity.city, {
                cortinaActivada,
                precipitation: updatedCity.precipitation,
                windSpeedKmh: updatedCity.windSpeed
            });
            cityContainer.appendChild(cityElement);
        }
    }
}
