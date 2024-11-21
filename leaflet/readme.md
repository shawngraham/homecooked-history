# Creating Interactive Historical Maps with Leaflet
## A Workshop Tutorial for Historians

This tutorial will guide you through creating interactive web maps to visualize historical data using free, open-source tools. By the end, you'll be able to create a web-based map that tells your historical narrative.

Give this a whirl; examine the complete map code at [example](https://github.com/shawngraham/homecooked-history/tree/main/leaflet/example) and check out the live version [here](https://shawngraham.github.io/homecooked-history/leaflet/example)

In fact, study this guide, and then go over to the example code and try to adjust it so that:
1. The map is centred on Ottawa
2. A georectified historical map is turned on by default
3. You define a journey between different places in the city (perhaps a historical parade or protest? The movements of a historic individual?)
4. You create new points of interest with associated further information.

...on with the show!

### Prerequisites
- Basic understanding of HTML and JavaScript
- A GitHub account
- Your historical data in CSV format
- A text editor 

### Part 1: Setting Up Your Project

1. Create a new repository on GitHub
   - Go to github.com and click "New Repository"
   - Name it `historical-map-project`
   - Check "Initialize with README"
   - Go to Settings → Pages and enable GitHub Pages from main branch

2. Create your basic HTML structure by 'add new file' and call it `index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Historical Map</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <style>
        #map {
            height: 600px;
            width: 100%;
        }
        .info {
            padding: 6px 8px;
            background: white;
            background: rgba(255,255,255,0.8);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div id="map"></div>

    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- Omnivore for data loading -->
    <script src='https://api.mapbox.com/mapbox.js/plugins/leaflet-omnivore/v0.2.0/leaflet-omnivore.min.js'></script>
    
    <script src="map.js"></script>
</body>
</html>
```

### Part 2: Creating Your First Map

Create a new file called `map.js` with this basic setup:

```javascript
// Initialize the map
const map = L.map('map').setView([40.7128, -74.0060], 4);

// Add the base tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add a Stamen Toner layer for historical feel (optional)
L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
    attribution: 'Map tiles by Stamen Design, CC BY 3.0'
}).addTo(map);
```

### Part 3: Loading Historical Data

Here's how to load different types of historical data, first via csv, then via geojson. Note where you see properties.name, properties.description etc; this is parsing your csv looking for the data in a column called `name` or `description` etc. A useful series of column names might be:

|name|latitude|longitude|year|type|description|link|
|----|----|----|----|----|----|----|

...and use decimal degrees for the coordinates.

```javascript
// For CSV data with latitude and longitude
omnivore.csv('data/historical-sites.csv')
    .on('ready', function(layer) {
        this.eachLayer(function(marker) {
            marker.bindPopup(
                `<h3>${marker.feature.properties.name}</h3>
                 <p>${marker.feature.properties.description}</p>
                 <p>Date: ${marker.feature.properties.date}</p>`
            );
        });
    })
    .addTo(map);

// Alternatively, if you had GeoJSON data
// you could use this    
fetch('data/historical-boundaries.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: "#ff7800",
                    weight: 2,
                    opacity: 0.65
                };
            },
            onEachFeature: function(feature, layer) {
                layer.bindPopup(`
                    <h3>${feature.properties.name}</h3>
                    <p>${feature.properties.description}</p>
                `);
            }
        }).addTo(map);
    });
```

### Part 4: Adding Interactive Features

Let's add a timeline slider for temporal data:

```javascript
// Add a simple timeline control
const timelineControl = L.control({position: 'bottom'});

timelineControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info timeline');
    div.innerHTML = `
        <h4>Timeline</h4>
        <input type="range" min="1800" max="2000" value="1900" id="yearSlider">
        <span id="yearDisplay">1900</span>
    `;
    return div;
};

timelineControl.addTo(map);

// Add timeline functionality
document.getElementById('yearSlider').addEventListener('input', function(e) {
    const year = e.target.value;
    document.getElementById('yearDisplay').textContent = year;
    
    // Filter your data based on the year
    // This example assumes your data has a 'year' property
    layer.eachLayer(function(marker) {
        if (marker.feature.properties.year <= year) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
});
```

### Part 5: Styling Your Map

Add custom styles to make your map more historically appropriate:

```javascript
// Add a custom legend
const legend = L.control({position: 'bottomright'});

legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
        <h4>Legend</h4>
        <i style="background: #ff7800"></i> Historical Site<br>
        <i style="background: #0078ff"></i> Battle Location<br>
        <i style="background: #00ff78"></i> Settlement
    `;
    return div;
};

legend.addTo(map);

// Add custom markers for different types of historical sites
function createCustomIcon(type) {
    return L.divIcon({
        className: `custom-icon ${type}`,
        html: `<span class="icon-${type}"></span>`,
        iconSize: [30, 30]
    });
}
```

### Part 6: Deploying to GitHub Pages

1. Commit your files:
```bash
git add .
git commit -m "Add historical map"
git push origin main
```

...or drag and drop your files into a new repository. Commit your changes. If you've forgotten to turn on gh-pages, go to settings, select pages, select main as the source, and save. You can click on 'actions' to see when your new commit is being served.

Your map will be available at: `https://[your-username].github.io/historical-map-project`

### Common Data Formats for Historical Maps

Here's a sample CSV structure for historical data:

```csv
name,latitude,longitude,year,description
Battle of Gettysburg,39.8094,-77.2375,1863,"Major battle of the American Civil War"
First Settlement,40.7128,-74.0060,1624,"Dutch settlement of New Amsterdam"
```

And a GeoJSON structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Historical District",
        "year": 1850,
        "description": "19th century commercial district"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-74.01, 40.71],
          [-74.02, 40.72],
          [-74.03, 40.71],
          [-74.01, 40.71]
        ]]
      }
    }
  ]
}
```

### Advanced Topics

1. Time-based animations:
```javascript
let currentYear = 1800;
const animationInterval = setInterval(() => {
    currentYear++;
    if (currentYear > 2000) {
        clearInterval(animationInterval);
        return;
    }
    // Update your map layers based on the current year
    updateMapForYear(currentYear);
}, 100);
```

2. Clustering historical markers:
```javascript
// Add MarkerCluster plugin
const markers = L.markerClusterGroup();
omnivore.csv('data/historical-sites.csv')
    .on('ready', function(layer) {
        markers.addLayer(layer);
    });
map.addLayer(markers);
```

### Troubleshooting Tips

1. Data doesn't appear on map:
   - Check your file paths
   - Verify your CSV/GeoJSON format
   - Check browser console for errors
   - Ensure coordinates are in the correct format

2. Map doesn't load:
   - Verify all scripts are loading (check browser console)
   - Check if your map container has a height set
   - Ensure you're using HTTPS for all resources

### Resources for Further Learning

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [GeoJSON Specification](https://geojson.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Historical Map Examples](https://github.com/topics/historical-maps)

Remember to replace placeholder data with your actual historical data and adjust styling and functionality to match your specific needs.
