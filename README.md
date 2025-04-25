# EchoRoute

A modern route safety navigation application that helps users find the safest walking routes to their destination. Built with JavaScript, Google Maps API, and a beautiful dashboard interface.

## Features

- Interactive map with real-time route planning
- Safety score calculation based on nearby safety pins
- Modern dashboard layout with key statistics
- Crowdsourced safety data points
- Beautiful, responsive UI with modern design elements
- Mobile and tablet-friendly interface

## Tech Stack

- JavaScript
- Google Maps JavaScript API
- Google Maps Geometry Library
- HTML5 & CSS3
- Inter Font Family

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/imjamesruiz/EchoRoute.git
cd EchoRoute
```

2. Start a local server:
```bash
python -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Environment Variables

The following environment variables are required:

- Google Maps API key (replace in index.html):
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMap"></script>
```

## Features in Detail

### Safety Scoring System
- Base score of 7.0
- Adjustments based on nearby safety pins:
  - -1.5 for unsafe areas
  - -0.5 for high-traffic areas
  - +0.8 for safe areas
- Score clamped between 0 and 10
- Rounded to one decimal place

### Dashboard Layout
- Left sidebar with navigation
- Top bar with key statistics
- Central map view
- Right panel with route analysis
- Responsive design for all devices

### Safety Pins
- Add custom safety pins to the map
- Three types: Safe, Unsafe, High Traffic
- Persistent storage using localStorage
- Visual indicators on the map

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
