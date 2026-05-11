let currentUVLimit = 0;
function animateUVBar() {
    let SPEED = 40;
    let bar = document.querySelector(".bar");
    let text = document.getElementById("value1");
    
    if (!bar || !text) {
        console.error('UV elements not found');
        return;
    }
    
   let targetPercent = Math.min(Math.round((currentUVLimit / 12) * 100), 100);
    
    console.log(`Animating UV bar to ${targetPercent}% (UV Index: ${currentUVLimit})`);
    
    // Clear any existing animation timeouts
    if (window.uvTimeouts) {
        window.uvTimeouts.forEach(clearTimeout);
    }
    window.uvTimeouts = [];
    
    // Animate the bar
    for (let i = 0; i <= targetPercent; i++) {
        let timeout = setTimeout(function() {
            text.innerHTML = i + "%";
            bar.style.width = i + "%";
            
            // Change bar color based on UV level
            let uvValue = (i / 100) * 12;
            if (uvValue <= 2) {
                bar.style.backgroundColor = "#558B2F";  // Green - Low
                text.style.color = "#558B2F";
            } else if (uvValue <= 5) {
                bar.style.backgroundColor = "#F9A825";  // Yellow - Moderate
                text.style.color = "#F9A825";
            } else if (uvValue <= 7) {
                bar.style.backgroundColor = "#EF6C00";  // Orange - High
                text.style.color = "#EF6C00";
            } else if (uvValue <= 10) {
                bar.style.backgroundColor = "#B71C1C";  // Red - Very High
                text.style.color = "#B71C1C";
            } else {
                bar.style.backgroundColor = "#6A1B9A";  // Purple - Extreme
                text.style.color = "#6A1B9A";
            }
        }, SPEED * i);
        window.uvTimeouts.push(timeout);
    }
    
    // Update the description text
    updateUVDescription(currentUVLimit);
}

function updateUVDescription(uvIndex) {
    let descriptionElement = document.querySelector(".uvindex h4");
    if (!descriptionElement) return;
    
    let riskLevel = "";
    let advice = "";
    
    if (uvIndex <= 2) {
        riskLevel = "Low";
        advice = "Safe to stay outside";
    } else if (uvIndex <= 5) {
        riskLevel = "Moderate";
        advice = "Wear sunscreen if outside for long";
    } else if (uvIndex <= 7) {
        riskLevel = "High";
        advice = "Protection required (hat, sunscreen, shade)";
    } else if (uvIndex <= 10) {
        riskLevel = "Very High";
        advice = "Extra protection needed. Avoid midday sun";
    } else {
        riskLevel = "Extreme";
        advice = "Avoid staying outside. Seek shade immediately";
    }
    
    descriptionElement.innerHTML = `UV ${uvIndex} - ${riskLevel} risk.<br/>${advice}`;
}

async function fetchRealUVData(lat, lon) {
    console.log(`🌞 Fetching UV for: ${lat}, ${lon}`);
    
    // Show loading state
    let text = document.getElementById("value1");
    if (text) text.innerHTML = "...";
    
    try {
        // Using free Open-Meteo API (no API key needed)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.current && data.current.uv_index !== undefined) {
            currentUVLimit = data.current.uv_index;
            console.log(`✅ Real UV Index: ${currentUVLimit}`);
            animateUVBar();
            return;
        }
    } catch (error) {
        console.error('API Error:', error);
    }
    
    // Fallback: Estimate UV from latitude
    let estimatedUV = Math.max(2, Math.min(12, 12 - Math.abs(lat) / 10));
    currentUVLimit = parseFloat(estimatedUV.toFixed(1));
    console.log(`⚠️ Using estimated UV: ${currentUVLimit}`);
    animateUVBar();
}

// Snowflake animation
const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uFlakeSize;
uniform float uMinFlakeSize;
uniform float uPixelResolution;
uniform float uSpeed;
uniform float uDepthFade;
uniform float uFarPlane;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uGamma;
uniform float uDensity;
uniform float uVariant;
uniform float uDirection;

#define PI 3.14159265
#define PI_OVER_6 0.5235988
#define PI_OVER_3 1.0471976
#define INV_SQRT3 0.57735027
#define M1 1597334677U
#define M2 3812015801U
#define M3 3299493293U
#define F0 2.3283064e-10

#define hash(n) (n * (n ^ (n >> 15)))
#define coord3(p) (uvec3(p).x * M1 ^ uvec3(p).y * M2 ^ uvec3(p).z * M3)

const vec3 camK = vec3(0.57735027, 0.57735027, 0.57735027);
const vec3 camI = vec3(0.70710678, 0.0, -0.70710678);
const vec3 camJ = vec3(-0.40824829, 0.81649658, -0.40824829);

const vec2 b1d = vec2(0.574, 0.819);

vec3 hash3(uint n) {
  uvec3 hashed = hash(n) * uvec3(1U, 511U, 262143U);
  return vec3(hashed) * F0;
}

float snowflakeDist(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a = abs(mod(a + PI_OVER_6, PI_OVER_3) - PI_OVER_6);
  vec2 q = r * vec2(cos(a), sin(a));
  float dMain = max(abs(q.y), max(-q.x, q.x - 1.0));
  float b1t = clamp(dot(q - vec2(0.4, 0.0), b1d), 0.0, 0.4);
  float dB1 = length(q - vec2(0.4, 0.0) - b1t * b1d);
  float b2t = clamp(dot(q - vec2(0.7, 0.0), b1d), 0.0, 0.25);
  float dB2 = length(q - vec2(0.7, 0.0) - b2t * b1d);
  return min(dMain, min(dB1, dB2)) * 10.0;
}

void main() {
  float invPixelRes = 1.0 / uPixelResolution;
  float pixelSize = max(1.0, floor(0.5 + uResolution.x * invPixelRes));
  float invPixelSize = 1.0 / pixelSize;
  
  vec2 fragCoord = floor(gl_FragCoord.xy * invPixelSize);
  vec2 res = uResolution * invPixelSize;
  float invResX = 1.0 / res.x;

  vec3 ray = normalize(vec3((fragCoord - res * 0.5) * invResX, 1.0));
  ray = ray.x * camI + ray.y * camJ + ray.z * camK;

  float timeSpeed = uTime * uSpeed;
  float windX = cos(uDirection) * 0.4;
  float windY = sin(uDirection) * 0.4;
  vec3 camPos = (windX * camI + windY * camJ + 0.1 * camK) * timeSpeed;
  vec3 pos = camPos;

  vec3 absRay = max(abs(ray), vec3(0.001));
  vec3 strides = 1.0 / absRay;
  vec3 raySign = step(ray, vec3(0.0));
  vec3 phase = fract(pos) * strides;
  phase = mix(strides - phase, phase, raySign);

  float rayDotCamK = dot(ray, camK);
  float invRayDotCamK = 1.0 / rayDotCamK;
  float invDepthFade = 1.0 / uDepthFade;
  float halfInvResX = 0.5 * invResX;
  vec3 timeAnim = timeSpeed * 0.1 * vec3(7.0, 8.0, 5.0);

  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    if (t >= uFarPlane) break;
    
    vec3 fpos = floor(pos);
    uint cellCoord = coord3(fpos);
    float cellHash = hash3(cellCoord).x;

    if (cellHash < uDensity) {
      vec3 h = hash3(cellCoord);
      
      vec3 sinArg1 = fpos.yzx * 0.073;
      vec3 sinArg2 = fpos.zxy * 0.27;
      vec3 flakePos = 0.5 - 0.5 * cos(4.0 * sin(sinArg1) + 4.0 * sin(sinArg2) + 2.0 * h + timeAnim);
      flakePos = flakePos * 0.8 + 0.1 + fpos;

      float toIntersection = dot(flakePos - pos, camK) * invRayDotCamK;
      
      if (toIntersection > 0.0) {
        vec3 testPos = pos + ray * toIntersection - flakePos;
        float testX = dot(testPos, camI);
        float testY = dot(testPos, camJ);
        vec2 testUV = abs(vec2(testX, testY));
        
        float depth = dot(flakePos - camPos, camK);
        float flakeSize = max(uFlakeSize, uMinFlakeSize * depth * halfInvResX);
        
        float dist;
        if (uVariant < 0.5) {
          dist = max(testUV.x, testUV.y);
        } else if (uVariant < 1.5) {
          dist = length(testUV);
        } else {
          float invFlakeSize = 1.0 / flakeSize;
          dist = snowflakeDist(vec2(testX, testY) * invFlakeSize) * flakeSize;
        }

        if (dist < flakeSize) {
          float flakeSizeRatio = uFlakeSize / flakeSize;
          float intensity = exp2(-(t + toIntersection) * invDepthFade) *
                           min(1.0, flakeSizeRatio * flakeSizeRatio) * uBrightness;
          gl_FragColor = vec4(uColor * pow(vec3(intensity), vec3(uGamma)), 1.0);
          return;
        }
      }
    }

    float nextStep = min(min(phase.x, phase.y), phase.z);
    vec3 sel = step(phase, vec3(nextStep));
    phase = phase - nextStep + strides * sel;
    t += nextStep;
    pos = mix(pos + ray * nextStep, floor(pos + ray * nextStep + 0.5), sel);
  }

  gl_FragColor = vec4(0.0);
}
`;

class PixelSnow {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      color: '#ffffff',
      flakeSize: 0.01,
      minFlakeSize: 1.25,
      pixelResolution: 200,
      speed: 1.25,
      depthFade: 8,
      farPlane: 20,
      brightness: 1,
      gamma: 0.4545,
      density: 0.3,
      variant: 'square',
      direction: 125,
      ...options
    };

    this.isVisible = true;
    this.animationId = null;
    this.resizeTimeout = null;
    this.startTime = performance.now();

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(
            this.container.offsetWidth,
            this.container.offsetHeight
          )
        },
        uFlakeSize: { value: this.options.flakeSize },
        uMinFlakeSize: { value: this.options.minFlakeSize },
        uPixelResolution: { value: this.options.pixelResolution },
        uSpeed: { value: this.options.speed },
        uDepthFade: { value: this.options.depthFade },
        uFarPlane: { value: this.options.farPlane },
        uColor: { value: this.hexToVector3(this.options.color) },
        uBrightness: { value: this.options.brightness },
        uGamma: { value: this.options.gamma },
        uDensity: { value: this.options.density },
        uVariant: { value: this.getVariantValue(this.options.variant) },
        uDirection: { value: (this.options.direction * Math.PI) / 180 }
      },
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.scene.add(new THREE.Mesh(geometry, this.material));

    window.addEventListener('resize', () => this.handleResize());

    const observer = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(this.container);

    this.animate();
  }

  hexToVector3(hex) {
    const threeColor = new THREE.Color(hex);
    return new THREE.Vector3(threeColor.r, threeColor.g, threeColor.b);
  }

  getVariantValue(variant) {
    return variant === 'round' ? 1.0 : variant === 'snowflake' ? 2.0 : 0.0;
  }

  handleResize() {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      const w = this.container.offsetWidth;
      const h = this.container.offsetHeight;
      this.renderer.setSize(w, h);
      this.material.uniforms.uResolution.value.set(w, h);
    }, 100);
  }

  updateUniforms(options) {
    if (options.color !== undefined) {
      this.material.uniforms.uColor.value.copy(this.hexToVector3(options.color));
    }
    if (options.flakeSize !== undefined) {
      this.material.uniforms.uFlakeSize.value = options.flakeSize;
    }
    if (options.minFlakeSize !== undefined) {
      this.material.uniforms.uMinFlakeSize.value = options.minFlakeSize;
    }
    if (options.pixelResolution !== undefined) {
      this.material.uniforms.uPixelResolution.value = options.pixelResolution;
    }
    if (options.speed !== undefined) {
      this.material.uniforms.uSpeed.value = options.speed;
    }
    if (options.depthFade !== undefined) {
      this.material.uniforms.uDepthFade.value = options.depthFade;
    }
    if (options.farPlane !== undefined) {
      this.material.uniforms.uFarPlane.value = options.farPlane;
    }
    if (options.brightness !== undefined) {
      this.material.uniforms.uBrightness.value = options.brightness;
    }
    if (options.gamma !== undefined) {
      this.material.uniforms.uGamma.value = options.gamma;
    }
    if (options.density !== undefined) {
      this.material.uniforms.uDensity.value = options.density;
    }
    if (options.variant !== undefined) {
      this.material.uniforms.uVariant.value = this.getVariantValue(options.variant);
    }
    if (options.direction !== undefined) {
      this.material.uniforms.uDirection.value = (options.direction * Math.PI) / 180;
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.isVisible) {
      this.material.uniforms.uTime.value = (performance.now() - this.startTime) * 0.001;
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Initialize
const pixelSnow = new PixelSnow('snowContainer', {
  color: '#ffffff',
  flakeSize: 0.01,
  minFlakeSize: 1.25,
  pixelResolution: 200,
  speed: 1.25,
  density: 0.3,
  direction: 125,
  brightness: 1,
  depthFade: 8,
  farPlane: 20,
  gamma: 0.4545,
  variant: 'square'
});

    // ============================================
    // WEATHER API INTEGRATION FOR SKYVE
    // ============================================
    
    // Your working API key
    const API_KEY = 'e0b171600264d91aae9609f5158be974';
    const BASE_URL = 'https://api.openweathermap.org/data/2.5';
    
    // DOM Elements - Matching YOUR HTML IDs and Classes
    const searchInput = document.querySelector('.input');  // Your search input
    const searchBtn = document.querySelector('.icon');     // Your search button (magnifying glass)
    
    // Function to fetch weather data
    async function fetchWeather(city) {
     



        if (!city || city.trim() === '') {
            console.log('Please enter a city name');
            return;
        }
        
        console.log(`Fetching weather for: ${city}`);
        
        try {
            const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    alert('City not found! Please check the spelling.');
                } else {
                    alert('Error fetching weather data. Please try again.');
                }
                return;
            }
            

            const data = await response.json();
            displayWeatherOnPage(data);
            updateMap(city);

             //uv block
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    await fetchRealUVData(lat, lon);
            
        } catch (error) {
            console.error('API Error:', error);
            alert('Failed to connect to weather service.');
        }
    }
    
    // Function to update YOUR specific HTML elements
    function displayWeatherOnPage(data) {
        console.log('Weather data received:', data);
        
        // 1. Update main temperature (the big one in .card .main)
        const mainTempElement = document.querySelector('.card .main');
        if (mainTempElement) {
            mainTempElement.textContent = `${Math.round(data.main.temp)} °C`;
        }
        
        // 2. Update 
        const locationElement = document.querySelector('.card .mainsub');
        if (locationElement) {
            locationElement.textContent = `${data.name}, ${data.sys.country}`;
        }
        
        // 3. Update Humidity in .humiditytext
        const humidityElement = document.querySelector('.humiditytext');
        if (humidityElement) {
            humidityElement.innerHTML = `Humidity<br />${data.main.humidity}%`;
        }
        
        // 4. Update Wind Speed in .airtext
        const windElement = document.querySelector('.airtext');
        if (windElement) {
            windElement.innerHTML = `Wind<br />${Math.round(data.wind.speed)} km/h`;
        }
        
        // 5. Update "Real Feel" temperature
        const realFeelElement = document.querySelector('.realfeeltext');
        if (realFeelElement) {
            realFeelElement.innerHTML = `Real Feel<br />${Math.round(data.main.feels_like)} °C`;
        }
        
        // 6. Update Pressure
        const pressureElement = document.querySelector('.pressuretext');
        if (pressureElement) {
            pressureElement.innerHTML = `Pressure<br />${data.main.pressure} hPa`;
        }
        
      
        // 9. Update Sunrise/Sunset times
        const sunriseTime = new Date(data.sys.sunrise * 1000);
        const sunsetTime = new Date(data.sys.sunset * 1000);
        
        const sunriseElement = document.querySelector('.sunrise h4');
        const sunsetElement = document.querySelector('.sunset h4');
        
        if (sunriseElement) {
            sunriseElement.textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (sunsetElement) {
            sunsetElement.textContent = sunsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // 10. Update the info cards at the bottom
        const humidityCard = document.querySelector('.card-1 .content h2');
        if (humidityCard) {
            humidityCard.textContent = `${data.main.humidity}%`;
        }
        
        const pressureCard = document.querySelector('.card-4 .content h2');
        if (pressureCard) {
            pressureCard.textContent = data.main.pressure;
        }
        // Update Precipitation/Rain card
const precipitationCard = document.querySelector('.card-3 .content h2');
if (precipitationCard) {
    // Get rain probability from forecast API
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(forecast => {
            if (forecast.list && forecast.list[0]) {
                const rainChance = Math.round((forecast.list[0].pop || 0) * 100);
                precipitationCard.textContent = `${rainChance}%`;
                
                // Optional: Color code based on chance
                if (rainChance >= 60) {
                    precipitationCard.style.color = "#4FC3F7";
                } else if (rainChance >= 30) {
                    precipitationCard.style.color = "#FFD54F";
                } else {
                    precipitationCard.style.color = "";
                }
                
                console.log(` Rain chance for next 3 hours: ${rainChance}%`);
            }
        })
        .catch(err => console.error('Rain forecast error:', err));
}

        
        
        console.log('Weather display updated successfully!');
    }
    
    // Function to update Terraink map
    const MAP_URL = 'https://vividly-living-celibacy.ngrok-free.dev';
    function updateMap(city) {
    const mapFrame = document.getElementById('weatherMap');
    if (mapFrame) {
        // Get current src
        const currentSrc = mapFrame.src;
        const newSrc = `${MAP_URL}/?city=${encodeURIComponent(city)}&t=${Date.now()}`;
        
        // Force complete reload
        mapFrame.src = newSrc;
        
        console.log(`🗺️ Map updated to: ${city}`);
        
        // Optional: Show loading indicator
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.opacity = '0.5';
            mapFrame.onload = () => {
                mapContainer.style.opacity = '1';
            };
        }
    }
}

    
    // Search function - called when user clicks search
    function performSearch() {
        const city = searchInput ? searchInput.value : '';
        if (city) {
            fetchWeather(city);
        } else {
            alert('Please enter a city name');
        }
    }
    
    // Event Listeners for your search elements
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Load default city when page loads
    window.addEventListener('load', () => {
    console.log('Skyve Weather App Ready!');
    
    // Check if there's a city in the URL (from map iframe)
    const urlParams = new URLSearchParams(window.location.search);
    const cityFromUrl = urlParams.get('city');
    
    if (cityFromUrl) {
        // Use city from URL
        const city = decodeURIComponent(cityFromUrl);
        if (searchInput) searchInput.value = city;
        fetchWeather(city);
    } else if (searchInput && !searchInput.value) {
        // Only set default if nothing else exists
        searchInput.value = 'London';
        fetchWeather('London');
    }
});







