// Homepage interaction
document.getElementById('get-started').addEventListener('click', () => {
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    // Initialize map after homepage is hidden
    initMap();
});

// Back to home button interaction
document.getElementById('back-to-home').addEventListener('click', () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('homepage').classList.remove('hidden');
    // Clear any existing routes and markers
    if (directionsRenderer) {
        directionsRenderer.setMap(null);
    }
    document.getElementById('route-info').innerHTML = '';
});

let map;
let directionsService;
let directionsRenderer;
let currentLocation;
let safetyPins = [];
let routes = [];
let autocomplete;
let mapClickListener = null;
let isPinDropMode = false;

// Initialize the map
function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true
    });

    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                map = new google.maps.Map(document.getElementById('map'), {
                    center: currentLocation,
                    zoom: 15
                });

                directionsRenderer.setMap(map);
                addUserMarker();
                loadSafetyPins();
                setupEventListeners();
            },
            (error) => {
                console.error('Error getting location:', error);
                // Default to a central location if geolocation fails
                currentLocation = { lat: 40.7128, lng: -74.0060 };
                map = new google.maps.Map(document.getElementById('map'), {
                    center: currentLocation,
                    zoom: 15
                });
                setupEventListeners();
            }
        );
    }
}

function addUserMarker() {
    new google.maps.Marker({
        position: currentLocation,
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

function setupEventListeners() {
    const searchButton = document.getElementById('search');
    const destinationInput = document.getElementById('destination');
    const addPinButton = document.getElementById('add-pin');
    const cancelPinButton = document.getElementById('cancel-pin');
    const mapContainer = document.querySelector('.map-container');

    // Initialize autocomplete for destination input
    autocomplete = new google.maps.places.Autocomplete(destinationInput);

    searchButton.addEventListener('click', () => {
        console.log('Search button clicked');
        handleRouteSearch();
    });

    // Also handle 'Enter' key in the input
    destinationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRouteSearch();
        }
    });

    addPinButton.addEventListener('click', () => {
        if (!isPinDropMode) {
            startPinDropMode();
        }
    });

    cancelPinButton.addEventListener('click', () => {
        if (isPinDropMode) {
            endPinDropMode();
        }
    });
}

function handleRouteSearch() {
    console.log('handleRouteSearch called');
    
    if (!currentLocation) {
        alert('Please wait for your location to be detected.');
        return;
    }

    const destinationInput = document.getElementById('destination');
    const searchText = destinationInput.value.trim();
    
    if (!searchText) {
        alert('Please enter a destination.');
        return;
    }

    console.log('Searching for:', searchText);

    if (!autocomplete) {
        console.error('Autocomplete not initialized');
        // Fallback to direct geocoding
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchText }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                calculateRoutes(results[0].geometry.location);
            } else {
                calculateRoutes(searchText);
            }
        });
        return;
    }

    const place = autocomplete.getPlace();
    console.log('Place:', place);
    
    if (place && place.geometry && place.geometry.location) {
        console.log('Using place geometry');
        calculateRoutes(place.geometry.location);
    } else {
        console.log('Falling back to geocoding');
        // Fallback to geocoding the entered text
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchText }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                calculateRoutes(results[0].geometry.location);
            } else {
                // Try using the text directly with the Directions service
                calculateRoutes(searchText);
            }
        });
    }
}

function startPinDropMode() {
    isPinDropMode = true;
    const mapContainer = document.querySelector('.map-container');
    const addPinButton = document.getElementById('add-pin');
    const cancelPinButton = document.getElementById('cancel-pin');
    const pinType = document.getElementById('pin-type');

    // Update UI
    mapContainer.classList.add('pin-drop-mode');
    addPinButton.textContent = 'Click Map to Place Pin';
    addPinButton.style.opacity = '0.7';
    cancelPinButton.classList.remove('hidden');
    pinType.disabled = true;

    // Add map click listener
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

    // Update UI
    mapContainer.classList.remove('pin-drop-mode');
    addPinButton.textContent = 'Add Safety Pin';
    addPinButton.style.opacity = '1';
    cancelPinButton.classList.add('hidden');
    pinType.disabled = false;

    // Remove map click listener
    if (mapClickListener) {
        google.maps.event.removeListener(mapClickListener);
        mapClickListener = null;
    }
}

function calculateRoutes(destination) {
    console.log('Calculating routes to:', destination);

    if (!directionsService || !directionsRenderer) {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: false
        });
        directionsRenderer.setMap(map);
    }

    // Clear previous routes from the map
    directionsRenderer.setMap(null);
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false
    });
    directionsRenderer.setMap(map);
    routes = [];

    const request = {
        origin: currentLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true,
        optimizeWaypoints: true
    };

    console.log('Route request:', request);

    // Show loading state
    const routeInfo = document.getElementById('route-info');
    routeInfo.innerHTML = '<div class="loading">Calculating routes...</div>';

    directionsService.route(request, (result, status) => {
        console.log('Directions service response:', status);
        if (status === google.maps.DirectionsStatus.OK) {
            console.log('Routes found:', result.routes.length);
            routes = result.routes;
            displayRoutes();
        } else {
            console.error('Directions request failed:', status);
            routeInfo.innerHTML = `
                <div class="error-message">
                    Could not find routes to this destination. 
                    Please try a different address or ensure the location is accessible by walking.
                </div>
            `;
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

        // Display route on map with unique color
        const routeColor = getRouteColor(safetyScore);
        const rendererOptions = {
            map: map,
            directions: {
                routes: [route],
                request: { travelMode: google.maps.TravelMode.WALKING }
            },
            routeIndex: index,
            polylineOptions: {
                strokeColor: routeColor,
                strokeWeight: 5,
                strokeOpacity: 0.7
            }
        };

        const renderer = new google.maps.DirectionsRenderer(rendererOptions);

        // Create route info card
        const routeCard = document.createElement('div');
        routeCard.className = `route-item ${safetyClass}`;
        routeCard.innerHTML = `
            <h3>Route ${index + 1}</h3>
            <p><strong>Distance:</strong> ${route.legs[0].distance.text}</p>
            <p><strong>Duration:</strong> ${route.legs[0].duration.text}</p>
            <p><strong>Safety Score:</strong> <span class="score">${safetyScore.toFixed(1)}/10</span></p>
            <p><strong>Safety Analysis:</strong></p>
            <ul class="safety-details">
                ${getSafetyDetails(route)}
            </ul>
            <span class="safety-tag">${safetyLabel}</span>
        `;

        // Add click handler to highlight route
        routeCard.addEventListener('click', () => {
            // Remove previous highlights
            document.querySelectorAll('.route-item').forEach(item => {
                item.classList.remove('active');
            });
            // Add highlight to clicked route
            routeCard.classList.add('active');
            // Center the map on this route
            const bounds = new google.maps.LatLngBounds();
            route.overview_path.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
        });

        routeInfo.appendChild(routeCard);
    });
}

function calculateSafetyScore(route) {
    let score = 7; // Start with a neutral score
    const path = route.overview_path;
    
    // Convert path points to LatLng objects
    const routePoints = path.map(point => new google.maps.LatLng(point.lat(), point.lng()));
    
    // Check each safety pin's distance to the route
    safetyPins.forEach(pin => {
        const pinLatLng = new google.maps.LatLng(pin.position.lat, pin.position.lng);
        
        // Check if pin is within 50 meters of any point on the route
        let isNearRoute = false;
        const THRESHOLD_METERS = 50;

        for (let i = 0; i < routePoints.length && !isNearRoute; i++) {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                pinLatLng,
                routePoints[i]
            );
            if (distance <= THRESHOLD_METERS) {
                isNearRoute = true;
            }
        }

        // If pin is near route, adjust score based on pin type
        if (isNearRoute) {
            switch (pin.type) {
                case 'unsafe':
                    score -= 1.5;
                    break;
                case 'high-traffic':
                    score -= 0.5;
                    break;
                case 'safe':
                    score += 0.8;
                    break;
            }
        }
    });

    // Clamp score between 0 and 10
    score = Math.max(0, Math.min(10, score));
    
    // Round to one decimal place
    return Math.round(score * 10) / 10;
}

function getRouteColor(safetyScore) {
    if (safetyScore >= 8) return '#34a853';  // Safe - Green
    if (safetyScore >= 5) return '#fbbc05';  // Moderate - Yellow
    return '#ea4335';  // Unsafe - Red
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
    const routePoints = path.map(point => new google.maps.LatLng(point.lat(), point.lng()));
    
    const THRESHOLD_METERS = 50;
    const nearbyPins = {
        unsafe: 0,
        'high-traffic': 0,
        safe: 0
    };

    // Count nearby pins
    safetyPins.forEach(pin => {
        const pinLatLng = new google.maps.LatLng(pin.position.lat, pin.position.lng);
        
        // Check if pin is near any point on the route
        for (let i = 0; i < routePoints.length; i++) {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                pinLatLng,
                routePoints[i]
            );
            if (distance <= THRESHOLD_METERS) {
                nearbyPins[pin.type]++;
                break; // Stop checking once we know it's near
            }
        }
    });

    const details = [];
    
    if (nearbyPins.unsafe > 0) {
        details.push(`⚠️ Near ${nearbyPins.unsafe} unsafe area${nearbyPins.unsafe > 1 ? 's' : ''} (-${(nearbyPins.unsafe * 1.5).toFixed(1)} points)`);
    }
    if (nearbyPins['high-traffic'] > 0) {
        details.push(`🚗 Near ${nearbyPins['high-traffic']} high-traffic area${nearbyPins['high-traffic'] > 1 ? 's' : ''} (-${(nearbyPins['high-traffic'] * 0.5).toFixed(1)} points)`);
    }
    if (nearbyPins.safe > 0) {
        details.push(`✅ Near ${nearbyPins.safe} safe area${nearbyPins.safe > 1 ? 's' : ''} (+${(nearbyPins.safe * 0.8).toFixed(1)} points)`);
    }
    
    if (details.length === 0) {
        details.push('No safety data available for this route');
    }

    return details.map(detail => `<li>${detail}</li>`).join('');
}

function addSafetyPin(position, type) {
    const pin = {
        position: {
            lat: position.lat(),
            lng: position.lng()
        },
        type: type
    };

    safetyPins.push(pin);
    saveSafetyPins();

    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: getPinIcon(type),
        animation: google.maps.Animation.DROP
    });

    // Add click listener to remove pin
    marker.addListener('click', () => {
        if (!isPinDropMode) {  // Only allow pin removal when not in pin-drop mode
            const confirmDelete = confirm('Remove this safety pin?');
            if (confirmDelete) {
                marker.setMap(null);
                safetyPins = safetyPins.filter(p => 
                    p.position.lat !== position.lat() || p.position.lng !== position.lng()
                );
                saveSafetyPins();
            }
        }
    });
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
        // Add sample safety pins around the user's location
        createSamplePins();
    }
}

function createSamplePins() {
    // Create an array of sample pins around the user's location
    const samplePins = [
        {
            type: 'safe',
            offset: { lat: 0.002, lng: 0.002 },  // Northeast
            description: 'Well-lit area with security cameras'
        },
        {
            type: 'unsafe',
            offset: { lat: -0.001, lng: 0.001 },  // Southeast
            description: 'Poor lighting and reported incidents'
        },
        {
            type: 'high-traffic',
            offset: { lat: 0.001, lng: -0.002 },  // Southwest
            description: 'Heavy vehicle traffic during peak hours'
        },
        {
            type: 'safe',
            offset: { lat: -0.002, lng: -0.001 },  // Northwest
            description: 'Active neighborhood watch area'
        },
        {
            type: 'unsafe',
            offset: { lat: 0.0015, lng: 0 },      // North
            description: 'Construction site with limited visibility'
        }
    ];

    // Add each sample pin
    samplePins.forEach(samplePin => {
        const position = {
            lat: currentLocation.lat + samplePin.offset.lat,
            lng: currentLocation.lng + samplePin.offset.lng
        };

        const pin = {
            position: position,
            type: samplePin.type,
            description: samplePin.description
        };

        safetyPins.push(pin);

        new google.maps.Marker({
            position: position,
            map: map,
            icon: getPinIcon(samplePin.type),
            title: samplePin.description
        });
    });

    // Save sample pins to localStorage
    saveSafetyPins();
}

// Initialize the map when the page loads
window.initMap = initMap; 