// Final cleaned and debug-hardened JavaScript file for Route Safety Navigator

let map;
let directionsService;
let directionsRenderer;
let currentLocation;
let safetyPins = [];
let routes = [];
let autocomplete;
let mapClickListener = null;
let isPinDropMode = false;
let mapInitialized = false;

function ensureMapReady(callback) {
    if (!mapInitialized || !directionsService || !directionsRenderer) {
        alert("Map is still loading. Please wait a moment.");
        return;
    }
    callback();
}

window.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.getElementById('get-started');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            document.getElementById('homepage').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
        });
    }

    const backHomeBtn = document.getElementById('back-to-home');
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            document.getElementById('app').classList.add('hidden');
            document.getElementById('homepage').classList.remove('hidden');
            if (directionsRenderer) directionsRenderer.setMap(null);
            const infoPanel = document.getElementById('route-info');
            if (infoPanel) infoPanel.innerHTML = '';
        });
    }
});

window.initMap = function() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                initializeMap(currentLocation);
            },
            () => initializeMap({ lat: 40.7128, lng: -74.0060 })
        );
    } else {
        initializeMap({ lat: 40.7128, lng: -74.0060 });
    }
};

function initializeMap(center) {
    map = new google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 15
    });
    directionsRenderer.setMap(map);
    mapInitialized = true;
    addUserMarker();
    loadSafetyPins();
    setupMapListeners();
}

function setupNavigationListeners() {
    console.log('Setting up navigation listeners...');
    
    // Get Started button
    const getStartedBtn = document.getElementById('get-started');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            showDashboard();
        });
    }

    // Navigation buttons
    const navHomeBtn = document.getElementById('nav-home');
    const navDashboardBtn = document.getElementById('nav-dashboard');
    const backHomeBtn = document.getElementById('back-to-home');

    if (navHomeBtn) {
        navHomeBtn.addEventListener('click', () => {
            showHomepage();
        });
    }

    if (navDashboardBtn) {
        navDashboardBtn.addEventListener('click', () => {
            showDashboard();
        });
    }

    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            showHomepage();
        });
    }
}

function showHomepage() {
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('nav-dashboard').classList.remove('active');
}

function showDashboard() {
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('nav-home').classList.remove('active');
    document.getElementById('nav-dashboard').classList.add('active');

    // Initialize map only if it hasn't been initialized yet
    if (!mapInitialized) {
        initializeMap(window.currentLocation);
        setupMapControls();
    }
}

function setupMapControls() {
    console.log('Setting up map controls...');
    const searchBtn = document.getElementById('search');
    const destinationInput = document.getElementById('destination');
    const addPinBtn = document.getElementById('add-pin');
    const cancelPinBtn = document.getElementById('cancel-pin');

    if (destinationInput) {
        autocomplete = new google.maps.places.Autocomplete(destinationInput);
        destinationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleRouteSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', handleRouteSearch);
    }

    if (addPinBtn) {
        addPinBtn.addEventListener('click', () => {
            if (!isPinDropMode) startPinDropMode();
        });
    }

    if (cancelPinBtn) {
        cancelPinBtn.addEventListener('click', () => {
            if (isPinDropMode) endPinDropMode();
        });
    }
}

function setupMapListeners() {
    const searchBtn = document.getElementById('search');
    const destinationInput = document.getElementById('destination');
    const addPinBtn = document.getElementById('add-pin');
    const cancelPinBtn = document.getElementById('cancel-pin');

    if (destinationInput) {
        autocomplete = new google.maps.places.Autocomplete(destinationInput);
        destinationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleRouteSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', handleRouteSearch);
    }

    if (addPinBtn) {
        addPinBtn.addEventListener('click', () => {
            if (!isPinDropMode) startPinDropMode();
        });
    }

    if (cancelPinBtn) {
        cancelPinBtn.addEventListener('click', () => {
            if (isPinDropMode) endPinDropMode();
        });
    }
}

function handleRouteSearch() {
    const input = document.getElementById('destination');
    if (!input || !input.value.trim()) {
        alert('Please enter a destination.');
        return;
    }

    const searchText = input.value.trim();
    const place = autocomplete?.getPlace();

    if (place?.geometry?.location) {
        calculateRoutes(place.geometry.location);
    } else {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchText }, (results, status) => {
            const location = (status === google.maps.GeocoderStatus.OK && results[0])
                ? results[0].geometry.location
                : searchText;
            calculateRoutes(location);
        });
    }
}

function calculateRoutes(destination) {
    if (!window.directionsService || !window.directionsRenderer) {
        console.error('Directions service not ready');
        return;
    }

    const request = {
        origin: window.currentLocation,
        destination,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true,
        optimizeWaypoints: true
    };

    window.directionsRenderer.setMap(null);
    window.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false
    });
    window.directionsRenderer.setMap(map);
    routes = [];

    const routeInfo = document.getElementById('route-info');
    routeInfo.innerHTML = '<div class="loading">Calculating routes...</div>';

    window.directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            routes = result.routes;
            displayRoutes();
        } else {
            console.error('Route error:', status);
            routeInfo.innerHTML = '<div class="error-message">Could not find routes. Try again.</div>';
        }
    });
}

function addUserMarker() {
    new google.maps.Marker({
        position: window.currentLocation,
        map: map,
        title: 'Your Location',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285f4',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
        }
    });
}

function displayRoutes() {
    const routeInfo = document.getElementById('route-info');
    routeInfo.innerHTML = '';

    routes.forEach((route, index) => {
        const safetyScore = calculateSafetyScore(route);
        const safetyClass = getSafetyClass(safetyScore);
        const safetyLabel = getSafetyLabel(safetyScore);

        const routeColor = getRouteColor(safetyScore);
        const rendererOptions = {
            map: map,
            directions: { routes: [route], request: { travelMode: google.maps.TravelMode.WALKING } },
            routeIndex: index,
            polylineOptions: {
                strokeColor: routeColor,
                strokeWeight: 5,
                strokeOpacity: 0.7
            }
        };

        const renderer = new google.maps.DirectionsRenderer(rendererOptions);

        const routeCard = document.createElement('div');
        routeCard.className = `route-item ${safetyClass}`;
        routeCard.innerHTML = `
            <h3>Route ${index + 1}</h3>
            <p><strong>Distance:</strong> ${route.legs[0].distance.text}</p>
            <p><strong>Duration:</strong> ${route.legs[0].duration.text}</p>
            <p><strong>Safety Score:</strong> <span class="score">${safetyScore.toFixed(1)}/10</span></p>
            <p><strong>Safety Analysis:</strong></p>
            <ul class="safety-details">${getSafetyDetails(route)}</ul>
            <span class="safety-tag">${safetyLabel}</span>
        `;

        routeCard.addEventListener('click', () => {
            document.querySelectorAll('.route-item').forEach(item => item.classList.remove('active'));
            routeCard.classList.add('active');
            const bounds = new google.maps.LatLngBounds();
            route.overview_path.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
        });

        routeInfo.appendChild(routeCard);
    });
}

function calculateSafetyScore(route) {
    let score = 7;
    const path = route.overview_path;
    const routePoints = path.map(p => new google.maps.LatLng(p.lat(), p.lng()));

    safetyPins.forEach(pin => {
        const pinLatLng = new google.maps.LatLng(pin.position.lat, pin.position.lng);
        let isNear = routePoints.some(point => {
            const dist = google.maps.geometry.spherical.computeDistanceBetween(pinLatLng, point);
            return dist <= 50;
        });

        if (isNear) {
            switch (pin.type) {
                case 'unsafe': score -= 1.5; break;
                case 'high-traffic': score -= 0.5; break;
                case 'safe': score += 0.8; break;
            }
        }
    });

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function getRouteColor(score) {
    if (score >= 8) return '#34a853';
    if (score >= 5) return '#fbbc05';
    return '#ea4335';
}

function getSafetyClass(score) {
    if (score >= 8) return 'safe';
    if (score >= 5) return 'moderate';
    return 'unsafe';
}

function getSafetyLabel(score) {
    if (score >= 8) return 'Safe Route';
    if (score >= 5) return 'Moderate Risk';
    return 'High Risk';
}

function getSafetyDetails(route) {
    const path = route.overview_path;
    const routePoints = path.map(p => new google.maps.LatLng(p.lat(), p.lng()));
    const THRESHOLD_METERS = 50;
    const nearbyPins = { unsafe: 0, 'high-traffic': 0, safe: 0 };

    safetyPins.forEach(pin => {
        const pinLatLng = new google.maps.LatLng(pin.position.lat, pin.position.lng);
        for (let point of routePoints) {
            const dist = google.maps.geometry.spherical.computeDistanceBetween(pinLatLng, point);
            if (dist <= THRESHOLD_METERS) {
                nearbyPins[pin.type]++;
                break;
            }
        }
    });

    const details = [];
    if (nearbyPins.unsafe) details.push(`⚠️ Near ${nearbyPins.unsafe} unsafe area${nearbyPins.unsafe > 1 ? 's' : ''}`);
    if (nearbyPins['high-traffic']) details.push(`🚗 Near ${nearbyPins['high-traffic']} high-traffic area${nearbyPins['high-traffic'] > 1 ? 's' : ''}`);
    if (nearbyPins.safe) details.push(`✅ Near ${nearbyPins.safe} safe area${nearbyPins.safe > 1 ? 's' : ''}`);
    if (!details.length) details.push('No safety data available for this route');

    return details.map(d => `<li>${d}</li>`).join('');
}

function addSafetyPin(position, type) {
    const pin = {
        position: { lat: position.lat(), lng: position.lng() },
        type: type
    };
    safetyPins.push(pin);
    saveSafetyPins();

    const marker = new google.maps.Marker({
        position,
        map,
        icon: getPinIcon(type),
        animation: google.maps.Animation.DROP
    });

    marker.addListener('click', () => {
        if (!isPinDropMode && confirm('Remove this safety pin?')) {
            marker.setMap(null);
            safetyPins = safetyPins.filter(p => p.position.lat !== position.lat() || p.position.lng !== position.lng());
            saveSafetyPins();
        }
    });
}

function startPinDropMode() {
    isPinDropMode = true;
    const mapContainer = document.querySelector('.map-container');
    const addPinButton = document.getElementById('add-pin');
    const cancelPinButton = document.getElementById('cancel-pin');
    const pinType = document.getElementById('pin-type');

    mapContainer.classList.add('pin-drop-mode');
    addPinButton.textContent = 'Click Map to Place Pin';
    addPinButton.style.opacity = '0.7';
    cancelPinButton.classList.remove('hidden');
    pinType.disabled = true;

    mapClickListener = map.addListener('click', (event) => {
        addSafetyPin(event.latLng, pinType.value);
        endPinDropMode();
    });
}

function endPinDropMode() {
    isPinDropMode = false;
    const mapContainer = document.querySelector('.map-container');
    const addPinButton = document.getElementById('add-pin');
    const cancelPinButton = document.getElementById('cancel-pin');
    const pinType = document.getElementById('pin-type');

    mapContainer.classList.remove('pin-drop-mode');
    addPinButton.textContent = 'Add Safety Pin';
    addPinButton.style.opacity = '1';
    cancelPinButton.classList.add('hidden');
    pinType.disabled = false;

    if (mapClickListener) {
        google.maps.event.removeListener(mapClickListener);
        mapClickListener = null;
    }
}

function getPinIcon(type) {
    const colors = {
        safe: '#34a853',
        unsafe: '#ea4335',
        'high-traffic': '#fbbc05'
    };
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: colors[type],
        fillOpacity: 0.8,
        strokeWeight: 2,
        strokeColor: '#ffffff'
    };
}

function saveSafetyPins() {
    localStorage.setItem('safetyPins', JSON.stringify(safetyPins));
}

function loadSafetyPins() {
    const savedPins = localStorage.getItem('safetyPins');
    if (savedPins) {
        safetyPins = JSON.parse(savedPins);
        safetyPins.forEach(pin => {
            new google.maps.Marker({
                position: pin.position,
                map: map,
                icon: getPinIcon(pin.type)
            });
        });
    } else {
        createSamplePins();
    }
}

function createSamplePins() {
    const samplePins = [
        { type: 'safe', offset: { lat: 0.002, lng: 0.002 } },
        { type: 'unsafe', offset: { lat: -0.001, lng: 0.001 } },
        { type: 'high-traffic', offset: { lat: 0.001, lng: -0.002 } },
        { type: 'safe', offset: { lat: -0.002, lng: -0.001 } },
        { type: 'unsafe', offset: { lat: 0.0015, lng: 0 } }
    ];

    samplePins.forEach(sample => {
        const pos = {
            lat: window.currentLocation.lat + sample.offset.lat,
            lng: window.currentLocation.lng + sample.offset.lng
        };
        const pin = { position: pos, type: sample.type };
        safetyPins.push(pin);
        new google.maps.Marker({
            position: pos,
            map: map,
            icon: getPinIcon(sample.type)
        });
    });

    saveSafetyPins();
}
