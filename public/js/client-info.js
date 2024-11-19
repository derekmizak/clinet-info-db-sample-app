// public/js/client-info.js

fetch('/api/client-info')
  .then(response => response.json())
  .then(data => {
    document.getElementById('ip').textContent = data.ip;
    document.getElementById('browser').textContent = data.userAgent;
    
    // Basic parsing for Browser and OS
    const osMatch = data.userAgent.match(/\(([^)]+)\)/);
    const browserMatch = data.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)\/?\s*(\d+)/i);

    if (osMatch) {
      document.getElementById('os').textContent = osMatch[1];
    }
    if (browserMatch) {
      document.getElementById('browser').textContent = `${browserMatch[1]} ${browserMatch[2]}`;
    }

    document.getElementById('city').textContent = data.locationData.city || 'N/A';
    document.getElementById('region').textContent = data.locationData.region || 'N/A';
    document.getElementById('country').textContent = data.locationData.country || 'N/A';
    document.getElementById('latitude').textContent = data.locationData.latitude || 'N/A';
    document.getElementById('longitude').textContent = data.locationData.longitude || 'N/A';
  })
  .catch(error => console.error('Error fetching client info:', error));
