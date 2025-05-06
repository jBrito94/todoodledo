document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const todoInput = document.getElementById("todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const todoList = document.getElementById("todo-list");
  const clockElement = document.getElementById("clock");

  // Variables for drag and drop
  let draggedItem = null;
  let draggedItemId = null;

  // Track completed section collapse state
  let isCompletedSectionCollapsed = true;

  // Create weather display element
  const weatherDisplay = document.createElement("div");
  weatherDisplay.id = "weather-display";
  weatherDisplay.className = "weather-display";
  document.querySelector(".app-header").appendChild(weatherDisplay);

  // Weather API
  function getWeather() {
    // Check if we have cached weather data first
    const cachedWeather = localStorage.getItem("weather_cache");
    const cacheTime = localStorage.getItem("weather_cache_time");

    // Use cached data if it's less than 60 minutes old and not explicitly refreshing
    if (
      cachedWeather &&
      cacheTime &&
      Date.now() - parseInt(cacheTime) < 60 * 60 * 1000
    ) {
      try {
        const weatherData = JSON.parse(cachedWeather);
        displayWeatherData(weatherData);
        return;
      } catch (e) {
        console.error("Error parsing cached weather:", e);
        // Continue with fresh fetch if cache parsing fails
      }
    }

    // Show loading state
    weatherDisplay.innerHTML = `<div class="weather-loading"><sl-icon name="arrow-repeat"></sl-icon> Loading weather...</div>`;
    const loadingIcon = weatherDisplay.querySelector("sl-icon");
    if (loadingIcon) {
      loadingIcon.style.animation = "spin 2s linear infinite";
    }

    // First get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          fetchWeatherData(lat, lon);
        },
        (error) => {
          console.error("Error getting location:", error);

          // Different message based on error code
          if (error.code === 1) {
            // PERMISSION_DENIED
            weatherDisplay.innerHTML = `
              <div class="weather-error">
                <sl-icon name="geo-alt-fill"></sl-icon>
                <span>Location access denied</span>
                <div style="margin-top: 5px; display: flex; gap: 8px;">
                  <button id="retry-weather" style="
                    background: transparent;
                    border: 1px solid var(--accent-blue);
                    color: var(--accent-blue);
                    cursor: pointer;
                    border-radius: 4px;
                    padding: 3px 6px;
                    font-size: 0.75rem;
                  ">Try Again</button>
                  <button id="use-ip-location" style="
                    background: var(--accent-blue);
                    border: none;
                    color: white;
                    cursor: pointer;
                    border-radius: 4px;
                    padding: 3px 6px;
                    font-size: 0.75rem;
                  ">Use IP Location</button>
                </div>
              </div>
            `;

            // Add retry button functionality
            const retryBtn = document.getElementById("retry-weather");
            if (retryBtn) {
              retryBtn.addEventListener("click", () => {
                getWeather();
              });
            }

            // Add IP location fallback button
            const useIpBtn = document.getElementById("use-ip-location");
            if (useIpBtn) {
              useIpBtn.addEventListener("click", () => {
                fallbackWeatherFetch();
              });
            }
          } else if (error.code === 2) {
            // POSITION_UNAVAILABLE
            weatherDisplay.innerHTML = `
              <div class="weather-error">
                <sl-icon name="geo-alt"></sl-icon>
                <span>Location unavailable</span>
                <button id="use-ip-location" style="
                  background: transparent;
                  border: none;
                  color: var(--accent-blue);
                  cursor: pointer;
                  margin-left: 8px;
                  font-size: 0.8rem;
                ">Use IP Location</button>
              </div>
            `;

            // Add IP location fallback button
            const useIpBtn = document.getElementById("use-ip-location");
            if (useIpBtn) {
              useIpBtn.addEventListener("click", () => {
                fallbackWeatherFetch();
              });
            }
          } else {
            // For timeout or other errors, try fallback automatically
            fallbackWeatherFetch();
          }
        },
        {
          enableHighAccuracy: false, // Don't need high accuracy for weather
          timeout: 10000, // 10 second timeout
          maximumAge: 600000, // Accept a position up to 10 minutes old
        }
      );
    } else {
      // Browser doesn't support geolocation
      weatherDisplay.innerHTML = `
        <div class="weather-error">
          <sl-icon name="geo-alt"></sl-icon>
          <span>Geolocation not supported</span>
          <button id="use-ip-location" style="
            background: transparent;
            border: none;
            color: var(--accent-blue);
            cursor: pointer;
            margin-left: 8px;
            font-size: 0.8rem;
          ">Use IP Location</button>
        </div>
      `;

      // Add IP location fallback button
      const useIpBtn = document.getElementById("use-ip-location");
      if (useIpBtn) {
        useIpBtn.addEventListener("click", () => {
          fallbackWeatherFetch();
        });
      }
    }
  }

  // Fetch weather data using a service that doesn't require API key
  function fetchWeatherData(lat, lon) {
    // Check if we have cached weather data first
    const cachedWeather = localStorage.getItem("weather_cache");
    const cacheTime = localStorage.getItem("weather_cache_time");

    // Use cached data if it's less than 60 minutes old
    if (
      cachedWeather &&
      cacheTime &&
      Date.now() - parseInt(cacheTime) < 60 * 60 * 1000
    ) {
      try {
        const weatherData = JSON.parse(cachedWeather);
        displayWeatherData(weatherData);
        return;
      } catch (e) {
        console.error("Error parsing cached weather:", e);
        // Continue with fresh fetch if cache parsing fails
      }
    }

    // Using wttr.in service which doesn't require an API key
    const url = `https://wttr.in/${lat},${lon}?format=j1`;

    weatherDisplay.innerHTML = `<div class="weather-loading"><sl-icon name="arrow-repeat"></sl-icon> Loading weather...</div>`;

    // Add animation to the loading icon
    const loadingIcon = weatherDisplay.querySelector("sl-icon");
    if (loadingIcon) {
      loadingIcon.style.animation = "spin 2s linear infinite";
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Weather API responded with status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        // Cache the successful weather data
        localStorage.setItem("weather_cache", JSON.stringify(data));
        localStorage.setItem("weather_cache_time", Date.now().toString());

        // Display the weather data using the helper function
        displayWeatherData(data);
      })
      .catch((error) => {
        console.error("Error fetching weather:", error);

        // Try fallback location approach
        fallbackWeatherFetch();
      });
  }

  // Fallback weather fetch using IP geolocation
  function fallbackWeatherFetch() {
    // Check if we have cached weather data first
    const cachedWeather = localStorage.getItem("weather_cache");
    const cacheTime = localStorage.getItem("weather_cache_time");

    // Use cached data if it's less than 60 minutes old
    if (
      cachedWeather &&
      cacheTime &&
      Date.now() - parseInt(cacheTime) < 60 * 60 * 1000
    ) {
      try {
        const weatherData = JSON.parse(cachedWeather);
        displayWeatherData(weatherData);
        return;
      } catch (e) {
        console.error("Error parsing cached weather:", e);
        // Continue with fresh fetch if cache parsing fails
      }
    }

    // Try to get a city name from IP using no-API service
    fetch("https://ip-api.com/json/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`IP API responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.city) {
          // Use city name with wttr.in
          return fetch(`https://wttr.in/${data.city}?format=j1`);
        } else {
          throw new Error("Could not determine location");
        }
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Weather API responded with status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        // Cache the weather data
        localStorage.setItem("weather_cache", JSON.stringify(data));
        localStorage.setItem("weather_cache_time", Date.now().toString());

        // Display the weather data
        displayWeatherData(data);
      })
      .catch((error) => {
        console.error("Fallback weather fetch failed:", error);
        weatherDisplay.innerHTML = `
          <div class="weather-error">
            <sl-icon name="cloud-slash"></sl-icon>
            <span>Weather unavailable</span>
            <button id="retry-weather" style="
              background: transparent;
              border: none;
              color: var(--accent-blue);
              cursor: pointer;
              margin-left: 8px;
              font-size: 0.8rem;
            ">Retry</button>
          </div>
        `;

        // Add retry button functionality
        const retryBtn = document.getElementById("retry-weather");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            // Clear cache on retry
            localStorage.removeItem("weather_cache");
            localStorage.removeItem("weather_cache_time");
            getWeather();
          });
        }
      });
  }

  // Helper function to display weather data
  function displayWeatherData(data) {
    try {
      // wttr.in has a different data structure
      const currentCondition = data.current_condition[0];
      const temp = currentCondition.temp_C;
      const description = currentCondition.weatherDesc[0].value;
      const icon = getWeatherIconFromWttr(currentCondition.weatherCode);
      // Get the nearest area name
      const city = data.nearest_area[0].areaName[0].value;

      weatherDisplay.innerHTML = `
        <div class="weather-icon">
          <sl-icon name="${icon}"></sl-icon>
        </div>
        <div class="weather-temp">
          <sl-icon name="thermometer-half" style="font-size: 0.9rem;"></sl-icon>
          ${temp}°C
        </div>
        <div class="weather-description">
          <sl-icon name="cloud" style="font-size: 0.9rem;"></sl-icon>
          ${description}
        </div>
        <div class="weather-location">
          <sl-icon name="geo-alt" style="font-size: 0.9rem;"></sl-icon>
          ${city}
        </div>
      `;

      // Add weather to document body as a CSS variable for potential theme adaptation
      const isWarm = parseInt(temp) > 20;
      const isCold = parseInt(temp) < 10;
      document.body.style.setProperty("--weather-temp", temp);
      if (isWarm) document.body.classList.add("warm-weather");
      if (isCold) document.body.classList.add("cold-weather");
    } catch (error) {
      console.error("Error parsing weather data:", error);
      weatherDisplay.innerHTML = `
        <div class="weather-error">
          <sl-icon name="exclamation-triangle"></sl-icon>
          <span>Invalid weather data</span>
          <button id="retry-weather" style="
            background: transparent;
            border: none;
            color: var(--accent-blue);
            cursor: pointer;
            margin-left: 8px;
            font-size: 0.8rem;
          ">Retry</button>
        </div>
      `;

      // Add retry button functionality
      const retryBtn = document.getElementById("retry-weather");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          // Clear cache on retry
          localStorage.removeItem("weather_cache");
          localStorage.removeItem("weather_cache_time");
          getWeather();
        });
      }
    }
  }

  // Map wttr.in weather codes to Shoelace icons
  function getWeatherIconFromWttr(code) {
    // Weather codes based on wttr.in documentation
    const codeMap = {
      // Clear/Sunny
      113: "sun",
      // Partly cloudy
      116: "cloud-sun",
      // Cloudy
      119: "cloud",
      122: "clouds",
      // Fog/Mist
      143: "cloud-haze",
      248: "cloud-haze",
      260: "cloud-fog",
      // Rainy
      176: "cloud-drizzle",
      263: "cloud-drizzle",
      266: "cloud-drizzle",
      281: "cloud-rain",
      284: "cloud-rain",
      293: "cloud-rain",
      296: "cloud-rain",
      299: "cloud-rain",
      302: "cloud-rain",
      305: "cloud-rain",
      308: "cloud-rain",
      311: "cloud-rain",
      314: "cloud-rain",
      // Snowy
      179: "snow",
      227: "snow",
      230: "snow",
      323: "snow",
      326: "snow",
      329: "snow",
      332: "snow",
      335: "snow",
      338: "snow",
      350: "snow",
      362: "snow",
      365: "snow",
      368: "snow",
      371: "snow",
      374: "snow",
      377: "snow",
      // Thunderstorm
      200: "cloud-lightning",
      386: "cloud-lightning",
      389: "cloud-lightning",
      392: "cloud-lightning",
      395: "cloud-lightning",
    };

    return codeMap[code] || "cloud"; // Default to cloud if code not found
  }

  // Map OpenWeatherMap icons to Shoelace icons (keeping for reference)
  function getWeatherIcon(iconCode) {
    const iconMap = {
      "01d": "sun",
      "01n": "moon",
      "02d": "cloud-sun",
      "02n": "cloud-moon",
      "03d": "cloud",
      "03n": "cloud",
      "04d": "clouds",
      "04n": "clouds",
      "09d": "cloud-drizzle",
      "09n": "cloud-drizzle",
      "10d": "cloud-rain",
      "10n": "cloud-rain",
      "11d": "cloud-lightning",
      "11n": "cloud-lightning",
      "13d": "snow",
      "13n": "snow",
      "50d": "cloud-haze",
      "50n": "cloud-haze",
    };

    return iconMap[iconCode] || "cloud";
  }

  // Clock functionality with improved formatting
  function updateClock() {
    const now = new Date();
    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // Use 24-hour format
    };

    const dateStr = now.toLocaleDateString("en-US", dateOptions);
    const timeStr = now.toLocaleTimeString("en-US", timeOptions);

    clockElement.innerHTML = `
      <span class="date">${dateStr}</span>
      <span class="time">${timeStr}</span>
    `;
  }

  // Initialize and update clock every second
  updateClock();
  setInterval(updateClock, 1000);

  // Fetch weather on load and update every 30 minutes
  getWeather();
  setInterval(getWeather, 30 * 60 * 1000);

  // State
  let todos = [];
  let currentEditTodoId = null;
  let activeFilter = "all"; // Default filter: all, work, personal, shopping, health, etc.

  // Predefined categories with colors and icons
  const categories = [
    {
      id: "work",
      name: "Work",
      icon: "briefcase",
      color: "var(--accent-blue)",
    },
    {
      id: "personal",
      name: "Personal",
      icon: "person",
      color: "var(--primary-color)",
    },
    {
      id: "shopping",
      name: "Shopping",
      icon: "cart",
      color: "var(--accent-green)",
    },
    {
      id: "health",
      name: "Health",
      icon: "heart-pulse",
      color: "var(--accent-red)",
    },
    {
      id: "education",
      name: "Education",
      icon: "book",
      color: "var(--accent-yellow)",
    },
  ];

  // Create category filter element
  function createCategoryFilters() {
    const filterContainer = document.createElement("div");
    filterContainer.className = "category-filter-container";
    filterContainer.innerHTML = `
      <div class="category-filter-heading">
        <sl-icon name="funnel"></sl-icon>
        <span>Filter Tasks</span>
      </div>
      <div class="category-filter-items"></div>
    `;

    const filterItems = filterContainer.querySelector(".category-filter-items");

    // Add "All" filter first
    const allFilter = document.createElement("div");
    allFilter.className = "category-filter-item active";
    allFilter.dataset.category = "all";
    allFilter.innerHTML = `
      <sl-icon name="list-ul"></sl-icon>
      <span>All Tasks</span>
    `;
    allFilter.addEventListener("click", () => {
      setActiveFilter("all");
    });
    filterItems.appendChild(allFilter);

    // Add each predefined category as a filter
    categories.forEach((category) => {
      const filterItem = document.createElement("div");
      filterItem.className = "category-filter-item";
      filterItem.dataset.category = category.id;
      filterItem.innerHTML = `
        <sl-icon name="${category.icon}" style="color: ${category.color}"></sl-icon>
        <span>${category.name}</span>
      `;
      filterItem.addEventListener("click", () => {
        setActiveFilter(category.id);
      });
      filterItems.appendChild(filterItem);
    });

    // Insert filter container before todo list
    const todoListContainer = document.querySelector(".todo-list-container");
    todoListContainer.parentNode.insertBefore(
      filterContainer,
      todoListContainer
    );
  }

  // Set active filter and update todos display
  function setActiveFilter(category) {
    activeFilter = category;

    // Update UI for filter buttons
    document.querySelectorAll(".category-filter-item").forEach((item) => {
      if (item.dataset.category === category) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Re-render todos with filter applied
    renderTodos();
  }

  // Load todos from localStorage
  const loadTodos = () => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      todos = JSON.parse(storedTodos);
      renderTodos();
    }
  };

  // Save todos to localStorage
  const saveTodos = () => {
    localStorage.setItem("todos", JSON.stringify(todos));
  };

  // Generate unique ID for todos
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  // Create notification dialog instead of toast
  const showNotification = (variant, message, icon, duration = 3000) => {
    // Remove any existing notifications
    document.querySelectorAll(".notification-dialog").forEach((dialog) => {
      dialog.style.opacity = "0";
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      }, 300);
    });

    // Create notification dialog
    const dialog = document.createElement("div");
    dialog.className = "notification-dialog";
    dialog.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--bg-surface);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10000000;
      min-width: 300px;
      max-width: 90%;
      width: auto;
      border-left: 4px solid ${
        variant === "success"
          ? "var(--accent-green)"
          : variant === "warning"
          ? "var(--accent-yellow)"
          : variant === "danger"
          ? "var(--accent-red)"
          : "var(--primary-color)"
      };
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    `;

    const iconEl = document.createElement("div");
    iconEl.style.cssText = `
      font-size: 1.5rem;
      color: ${
        variant === "success"
          ? "var(--accent-green)"
          : variant === "warning"
          ? "var(--accent-yellow)"
          : variant === "danger"
          ? "var(--accent-red)"
          : "var(--primary-color)"
      };
      flex-shrink: 0;
    `;
    iconEl.innerHTML = `<sl-icon name="${icon}"></sl-icon>`;

    const messageEl = document.createElement("div");
    messageEl.style.cssText = `
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-color);
      flex-grow: 1;
    `;
    messageEl.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      margin-left: 16px;
      padding: 4px;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
      flex-shrink: 0;
    `;
    closeBtn.innerHTML = '<sl-icon name="x"></sl-icon>';
    closeBtn.addEventListener("click", () => {
      dialog.style.opacity = "0";
      dialog.style.transform = "translateX(-50%) translateY(-20px)";
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      }, 300);
    });

    closeBtn.onmouseover = () => {
      closeBtn.style.color = "var(--text-color)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.color = "var(--text-tertiary)";
    };

    contentWrapper.appendChild(iconEl);
    contentWrapper.appendChild(messageEl);

    dialog.appendChild(contentWrapper);
    dialog.appendChild(closeBtn);

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
      dialog.style.opacity = "1";
      dialog.style.transform = "translateX(-50%) translateY(0)";
    }, 10);

    // Auto dismiss
    if (duration) {
      setTimeout(() => {
        dialog.style.opacity = "0";
        dialog.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => {
          if (dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
          }
        }, 300);
      }, duration);
    }
  };

  // Toggle todo completion with animation
  const toggleTodoComplete = (id) => {
    let isComplete = false;
    todos = todos.map((todo) => {
      if (todo.id === id) {
        isComplete = !todo.completed;
        return { ...todo, completed: isComplete };
      }
      return todo;
    });
    saveTodos();

    // Instead of updating just this item, re-render the whole list
    // This ensures the event listeners are properly updated
    renderTodos();

    // Show status change notification
    showNotification(
      isComplete ? "success" : "primary",
      `Task marked as ${isComplete ? "complete" : "incomplete"}`,
      isComplete ? "check-circle" : "arrow-counterclockwise",
      2000
    );

    // Apply highlight effect to the toggled item after re-rendering
    setTimeout(() => {
      const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
      if (todoEl) {
        todoEl.style.animation = "pulse 0.4s";
      }
    }, 0);
  };

  // Add new todo with animation
  const addTodo = () => {
    const text = todoInput.value.trim();
    if (text === "") {
      // Show validation feedback with shake animation
      todoInput.focus();
      todoInput.style.animation = "shake 0.5s";
      setTimeout(() => {
        todoInput.style.animation = "";
      }, 500);

      showNotification(
        "warning",
        "Please enter a task before adding",
        "exclamation-triangle"
      );
      return;
    }

    // Show category selection modal
    showCategoryModal(text);
  };

  // Create and show category selection modal
  const showCategoryModal = (text, existingTodo = null) => {
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      backdrop-filter: blur(8px);
    `;

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
      background-color: var(--bg-surface);
      padding: 24px;
      border-radius: 16px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10000000;
    `;

    const modalHeader = document.createElement("div");
    modalHeader.style.cssText = `
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-color);
    `;
    modalHeader.textContent = existingTodo
      ? "Update Task Category"
      : "Choose Task Category";

    // Create category selection grid
    const categoryGrid = document.createElement("div");
    categoryGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    `;

    // Add categories to the grid
    categories.forEach((category) => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "category-item";
      categoryItem.dataset.category = category.id;

      // Check if this is the currently selected category (for edit mode)
      if (existingTodo && existingTodo.category === category.id) {
        categoryItem.classList.add("selected");
      }

      categoryItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background-color: var(--bg-component);
        border-radius: var(--border-radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
        border-left: 4px solid ${category.color};
      `;

      categoryItem.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: ${category.color}20;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${category.color};
          font-size: 1.2rem;
        ">
          <sl-icon name="${category.icon}"></sl-icon>
        </div>
        <span style="font-weight: 500;">${category.name}</span>
      `;

      // Add hover effects
      categoryItem.addEventListener("mouseover", () => {
        if (!categoryItem.classList.contains("selected")) {
          categoryItem.style.backgroundColor = "var(--bg-hover)";
          categoryItem.style.transform = "translateY(-2px)";
        }
      });

      categoryItem.addEventListener("mouseout", () => {
        if (!categoryItem.classList.contains("selected")) {
          categoryItem.style.backgroundColor = "var(--bg-component)";
          categoryItem.style.transform = "translateY(0)";
        }
      });

      // Add click handler to select category
      categoryItem.addEventListener("click", () => {
        // Remove 'selected' class from all categories
        document.querySelectorAll(".category-item").forEach((item) => {
          item.classList.remove("selected");
          item.style.backgroundColor = "var(--bg-component)";
          item.style.transform = "translateY(0)";
        });

        // Add 'selected' class to clicked category
        categoryItem.classList.add("selected");
        categoryItem.style.backgroundColor = `${category.color}15`;
        categoryItem.style.transform = "translateY(-2px)";
      });

      categoryGrid.appendChild(categoryItem);
    });

    // Add buttons (cancel/confirm)
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background-color: transparent;
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = existingTodo ? "Update" : "Add Task";
    confirmBtn.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: var(--gradient-primary);
      color: white;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Hover effects
    cancelBtn.addEventListener("mouseover", () => {
      cancelBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });

    cancelBtn.addEventListener("mouseout", () => {
      cancelBtn.style.backgroundColor = "transparent";
    });

    confirmBtn.addEventListener("mouseover", () => {
      confirmBtn.style.transform = "translateY(-2px)";
      confirmBtn.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
    });

    confirmBtn.addEventListener("mouseout", () => {
      confirmBtn.style.transform = "translateY(0)";
      confirmBtn.style.boxShadow = "none";
    });

    // Assemble the modal
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(categoryGrid);
    modalContent.appendChild(buttonsContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close modal function
    const closeModal = () => {
      modalOverlay.style.opacity = "0";
      setTimeout(() => {
        if (modalOverlay.parentNode) {
          modalOverlay.parentNode.removeChild(modalOverlay);
        }
      }, 200);
    };

    // Event handlers
    cancelBtn.addEventListener("click", closeModal);

    confirmBtn.addEventListener("click", () => {
      const selectedCategory = document.querySelector(
        ".category-item.selected"
      );

      if (!selectedCategory) {
        showNotification(
          "warning",
          "Please select a category",
          "exclamation-triangle"
        );
        return;
      }

      const categoryId = selectedCategory.dataset.category;

      if (existingTodo) {
        // Update existing todo
        todos = todos.map((todo) => {
          if (todo.id === existingTodo.id) {
            return {
              ...todo,
              category: categoryId,
            };
          }
          return todo;
        });

        saveTodos();
        renderTodos();

        showNotification(
          "success",
          "Task category updated!",
          "check-circle",
          2000
        );
      } else {
        // Create new todo
        const newTodo = {
          id: generateId(),
          text: text,
          category: categoryId,
          completed: false,
          createdAt: new Date().toISOString(),
        };

        // Add at the beginning for better UX
        todos.unshift(newTodo);
        saveTodos();
        renderTodos();

        // Success feedback
        showNotification(
          "success",
          "Task added successfully!",
          "check-circle",
          2000
        );

        todoInput.value = "";
        todoInput.focus();
      }

      closeModal();
    });

    // Close on backdrop click
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // Add a subtle fade-in effect
    modalOverlay.style.opacity = "0";
    setTimeout(() => {
      modalOverlay.style.opacity = "1";
      modalOverlay.style.transition = "opacity 0.2s ease";
    }, 10);
  };

  // Edit todo
  const editTodo = (id) => {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;

    // Create a modal wrapper that sits on top of everything
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      backdrop-filter: blur(8px);
    `;

    // Create the actual modal content
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
      background-color: var(--bg-surface);
      padding: 24px;
      border-radius: 16px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10000000;
    `;

    // Create header
    const modalHeader = document.createElement("div");
    modalHeader.style.cssText = `
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-color);
    `;
    modalHeader.textContent = "Edit Task";

    // Create input field
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = `margin-bottom: 24px; position: relative;`;

    const input = document.createElement("input");
    input.type = "text";
    input.value = todo.text;
    input.style.cssText = `
      width: 100%;
      padding: 14px 20px 14px 50px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background-color: var(--bg-component);
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      outline: none;
      box-sizing: border-box;
      font-weight: 500;
    `;

    const icon = document.createElement("div");
    icon.style.cssText = `
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    icon.innerHTML = '<sl-icon name="pencil"></sl-icon>';

    // Display current category
    const currentCategory =
      categories.find((cat) => cat.id === todo.category) || categories[0];
    const categoryDisplay = document.createElement("div");
    categoryDisplay.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      padding: 12px;
      background-color: ${currentCategory.color}15;
      border-radius: var(--border-radius-md);
      border-left: 4px solid ${currentCategory.color};
    `;
    categoryDisplay.innerHTML = `
      <sl-icon name="${currentCategory.icon}" style="color: ${currentCategory.color}"></sl-icon>
      <span style="color: var(--text-color); font-weight: 500;">Category: ${currentCategory.name}</span>
      <button id="change-category-btn" style="
        margin-left: auto;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--text-color);
        border-radius: var(--border-radius-sm);
        padding: 6px 10px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all var(--transition-fast);
      ">Change</button>
    `;

    // Create footer with buttons
    const modalFooter = document.createElement("div");
    modalFooter.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    `;

    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = '<sl-icon name="x"></sl-icon> Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background-color: transparent;
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 100px;
      transition: all 0.2s ease;
    `;

    const saveButton = document.createElement("button");
    saveButton.innerHTML = '<sl-icon name="check2"></sl-icon> Save';
    saveButton.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: var(--gradient-primary);
      color: white;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 100px;
      transition: all 0.2s ease;
    `;

    // Hover effects
    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    };
    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = "transparent";
    };

    saveButton.onmouseover = () => {
      saveButton.style.transform = "translateY(-2px)";
      saveButton.style.boxShadow =
        "0 6px 24px rgba(0, 0, 0, 0.2), 0 0 15px rgba(138, 99, 210, 0.4)";
    };
    saveButton.onmouseout = () => {
      saveButton.style.transform = "translateY(0)";
      saveButton.style.boxShadow = "none";
    };

    // Assemble the modal
    inputContainer.appendChild(input);
    inputContainer.appendChild(icon);

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(inputContainer);
    modalContent.appendChild(categoryDisplay);
    modalContent.appendChild(modalFooter);

    modalOverlay.appendChild(modalContent);

    // Add it to the body
    document.body.appendChild(modalOverlay);

    // Function to close the modal
    const closeModal = () => {
      modalOverlay.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
      }, 200);
    };

    // Event listeners
    const handleSave = () => {
      const text = input.value.trim();
      if (text === "") {
        input.style.animation = "shake 0.5s";
        setTimeout(() => {
          input.style.animation = "";
        }, 500);

        showNotification(
          "warning",
          "Task cannot be empty",
          "exclamation-triangle"
        );
        return;
      }

      todos = todos.map((t) => {
        if (t.id === id) {
          return { ...t, text: text };
        }
        return t;
      });

      saveTodos();
      renderTodos();
      closeModal();

      showNotification(
        "success",
        "Task updated successfully!",
        "pencil-square",
        2000
      );

      // Highlight the edited item
      setTimeout(() => {
        const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (todoEl) {
          todoEl.style.animation = "pulse 0.4s";
          todoEl.style.boxShadow = "var(--shadow-glow)";
          setTimeout(() => {
            todoEl.style.boxShadow = "";
          }, 1500);
        }
      }, 100);
    };

    // Add category change handler
    document
      .getElementById("change-category-btn")
      .addEventListener("click", () => {
        closeModal();
        showCategoryModal(null, todo);
      });

    // Event listeners
    cancelButton.addEventListener("click", closeModal);
    saveButton.addEventListener("click", handleSave);

    // Close on overlay click (but not content click)
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // Handle Enter key
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSave();
      }
    });

    // Add a subtle fade-in effect
    modalOverlay.style.opacity = "0";
    setTimeout(() => {
      modalOverlay.style.opacity = "1";
      modalOverlay.style.transition = "opacity 0.2s ease";

      // Focus the input and select text
      input.focus();
      input.setSelectionRange(0, input.value.length);
    }, 10);
  };

  // Delete todo with confirmation
  const deleteTodo = (id) => {
    // Create and show confirmation dialog
    const confirmDialog = Object.assign(document.createElement("div"), {
      className: "modal-overlay",
      style: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999999;
        backdrop-filter: blur(8px);
      `,
    });

    const confirmContent = document.createElement("div");
    confirmContent.className = "modal-content";
    confirmContent.style = `
      background-color: var(--bg-surface);
      padding: 24px;
      border-radius: 16px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10000000;
    `;

    confirmContent.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px;">
        <div style="color: var(--accent-red); font-size: 2rem; margin-top: 3px;">
          <sl-icon name="trash"></sl-icon>
        </div>
        <div>
          <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; color: var(--text-color);">
            Delete Task
          </div>
          <p style="margin: 0; color: var(--text-secondary);">Are you sure you want to delete this task?</p>
          <p style="margin-top: 8px; color: var(--text-tertiary); font-size: 0.9rem;">This action cannot be undone.</p>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="cancel-delete" style="
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background-color: transparent;
          color: var(--text-color);
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 100px;
          transition: all 0.2s ease;
        ">
          <sl-icon name="x"></sl-icon> Cancel
        </button>
        <button id="confirm-delete" style="
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #e94560, #c33149);
          color: white;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 100px;
          transition: all 0.2s ease;
        ">
          <sl-icon name="trash"></sl-icon> Delete
        </button>
      </div>
    `;

    confirmDialog.appendChild(confirmContent);
    document.body.appendChild(confirmDialog);

    // Add hover effects
    const cancelBtn = document.getElementById("cancel-delete");
    const confirmBtn = document.getElementById("confirm-delete");

    cancelBtn.onmouseover = () => {
      cancelBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.backgroundColor = "transparent";
    };

    confirmBtn.onmouseover = () => {
      confirmBtn.style.transform = "translateY(-2px)";
      confirmBtn.style.boxShadow = "0 6px 16px rgba(233, 69, 96, 0.4)";
    };
    confirmBtn.onmouseout = () => {
      confirmBtn.style.transform = "translateY(0)";
      confirmBtn.style.boxShadow = "none";
    };

    // Fade in effect
    confirmDialog.style.opacity = "0";
    setTimeout(() => {
      confirmDialog.style.opacity = "1";
      confirmDialog.style.transition = "opacity 0.2s ease";
    }, 10);

    // Close function
    const closeConfirm = () => {
      confirmDialog.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(confirmDialog);
      }, 200);
    };

    // Event listeners
    cancelBtn.addEventListener("click", closeConfirm);

    confirmBtn.addEventListener("click", () => {
      // Get the task text for better feedback
      const taskText = todos.find((todo) => todo.id === id)?.text || "Task";
      const shortText =
        taskText.length > 30 ? taskText.substring(0, 30) + "..." : taskText;

      // Remove with animation
      const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
      todoEl.style.animation = "fadeOut 0.4s forwards";

      setTimeout(() => {
        todos = todos.filter((todo) => todo.id !== id);
        saveTodos();
        renderTodos();
        closeConfirm();

        // Show delete success notification
        showNotification("danger", `"${shortText}" deleted`, "trash", 2000);
      }, 400);
    });

    // Close on backdrop click
    confirmDialog.addEventListener("click", (e) => {
      if (e.target === confirmDialog) {
        closeConfirm();
      }
    });
  };

  // Update todo order after drag and drop
  const updateTodoOrder = () => {
    // Get all non-completed todos
    const incompleteTodos = todos.filter((todo) => !todo.completed);
    const completedTodos = todos.filter((todo) => todo.completed);

    // Get the current order from the DOM
    const todoElements = document.querySelectorAll(
      ".todo-item:not(.completed)"
    );
    const newOrderedTodos = [];

    // Create a new array with the updated order
    todoElements.forEach((el) => {
      const id = el.dataset.id;
      const todo = incompleteTodos.find((t) => t.id === id);
      if (todo) {
        newOrderedTodos.push(todo);
      }
    });

    // Combine with completed todos (which stay at the end)
    todos = [...newOrderedTodos, ...completedTodos];
    saveTodos();

    // Show notification
    showNotification("success", "Task order updated", "arrow-repeat", 2000);
  };

  // Render todos
  const renderTodos = () => {
    todoList.innerHTML = "";

    if (todos.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.innerHTML = `
        <sl-icon name="journal-check"></sl-icon>
        <p>Your task list is empty</p>
        <p style="opacity: 0.7; font-size: 0.9rem;">Add a new task to get started</p>
      `;
      todoList.appendChild(emptyMessage);
      return;
    }

    // Filter todos based on active filter
    const filteredTodos = todos.filter((todo) => {
      if (activeFilter === "all") return true;
      return todo.category === activeFilter;
    });

    // If filtered list is empty, show filter-specific empty message
    if (filteredTodos.length === 0) {
      const currentCategory = categories.find((cat) => cat.id === activeFilter);
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.innerHTML = `
        <sl-icon name="${
          currentCategory ? currentCategory.icon : "journal-check"
        }" 
                style="color: ${
                  currentCategory
                    ? currentCategory.color
                    : "var(--primary-color)"
                }"></sl-icon>
        <p>No ${
          currentCategory ? currentCategory.name.toLowerCase() : ""
        } tasks found</p>
        <p style="opacity: 0.7; font-size: 0.9rem;">Add a new task or change filter</p>
      `;
      todoList.appendChild(emptyMessage);
      return;
    }

    // Separate todos into incomplete and completed
    const incompleteTodos = filteredTodos.filter((todo) => !todo.completed);
    const completedTodos = filteredTodos.filter((todo) => todo.completed);

    // Render incomplete todos first
    incompleteTodos.forEach((todo, index) => {
      renderTodoItem(todo, index);
    });

    // If there are completed todos, add a collapsible section
    if (completedTodos.length > 0) {
      // Create completed section header
      const completedSection = document.createElement("div");
      completedSection.className = "completed-section";
      if (isCompletedSectionCollapsed) {
        completedSection.classList.add("collapsed");
      }

      const completedHeader = document.createElement("div");
      completedHeader.className = "completed-header";
      completedHeader.innerHTML = `
        <div class="completed-title">
          <sl-icon name="check2-all"></sl-icon>
          <span>Completed Tasks (${completedTodos.length})</span>
        </div>
        <div class="completed-toggle">
          <sl-icon name="${
            isCompletedSectionCollapsed ? "chevron-up" : "chevron-down"
          }"></sl-icon>
        </div>
      `;

      // Add click handler to toggle completed section
      completedHeader.addEventListener("click", () => {
        isCompletedSectionCollapsed = !isCompletedSectionCollapsed;
        completedSection.classList.toggle("collapsed");
        const chevron = completedHeader.querySelector(
          ".completed-toggle sl-icon"
        );
        if (isCompletedSectionCollapsed) {
          chevron.setAttribute("name", "chevron-up");
        } else {
          chevron.setAttribute("name", "chevron-down");
        }
      });

      // Create content container for completed todos
      const completedContent = document.createElement("div");
      completedContent.className = "completed-content";

      // Add completed todos to the content container
      // Always create DOM elements, even if the section is collapsed
      completedTodos.forEach((todo, index) => {
        const todoEl = createTodoElement(todo, incompleteTodos.length + index);
        completedContent.appendChild(todoEl);
      });

      completedSection.appendChild(completedHeader);
      completedSection.appendChild(completedContent);
      todoList.appendChild(completedSection);
    }
  };

  // Helper function to render a single todo item
  const renderTodoItem = (todo, index) => {
    const todoEl = createTodoElement(todo, index);
    todoList.appendChild(todoEl);
  };

  // Create todo element - extracted from renderTodos for reusability
  const createTodoElement = (todo, index) => {
    const todoItem = document.createElement("div");
    todoItem.className = `todo-item ${todo.completed ? "completed" : ""}`;
    todoItem.dataset.id = todo.id;
    todoItem.dataset.category = todo.category || "none";

    // Add staggered animation delay for smoother list appearance
    todoItem.style.animation = `fadeIn 0.4s ${index * 0.05}s backwards`;

    // Find category for this todo
    const todoCategory = categories.find((cat) => cat.id === todo.category) || {
      id: "none",
      name: "Uncategorized",
      icon: "tag",
      color: "var(--text-tertiary)",
    };

    // Set the border color directly on the todo item instead of adding a separate indicator
    todoItem.style.borderLeftColor = todo.completed
      ? "var(--accent-green)"
      : todoCategory.color;

    // Make non-completed items draggable
    if (!todo.completed) {
      todoItem.draggable = true;
      todoItem.classList.add("draggable");

      // Add drag handle
      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.innerHTML = `<sl-icon name="grip-vertical"></sl-icon>`;
      todoItem.appendChild(dragHandle);

      // Drag and drop event listeners
      todoItem.addEventListener("dragstart", (e) => {
        draggedItem = todoItem;
        draggedItemId = todo.id;
        setTimeout(() => {
          todoItem.classList.add("dragging");
        }, 0);
      });

      todoItem.addEventListener("dragend", () => {
        todoItem.classList.remove("dragging");
        draggedItem = null;
        draggedItemId = null;
        // Update the order in our data
        updateTodoOrder();
      });
    }

    // Main content - checkbox, text and time
    const todoContent = document.createElement("div");
    todoContent.className = "todo-content";

    // Create checkbox for completion
    const checkbox = document.createElement("div");
    checkbox.className = `todo-checkbox ${todo.completed ? "checked" : ""}`;
    checkbox.innerHTML = `<sl-icon name="check"></sl-icon>`;
    checkbox.addEventListener("click", () => toggleTodoComplete(todo.id));

    const todoTextContainer = document.createElement("div");
    todoTextContainer.className = "todo-text-container";

    const todoText = document.createElement("div");
    todoText.className = "todo-text";
    todoText.textContent = todo.text;

    // Format the date
    const created = new Date(todo.createdAt);
    const relativeTime = formatRelativeTime(todo.createdAt);
    const fullDate = created.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create the todo time element with category badge included directly in the HTML
    const todoTime = document.createElement("div");
    todoTime.className = "todo-time";
    todoTime.style.display = "flex";
    todoTime.style.alignItems = "center";
    todoTime.style.gap = "10px";

    // Create time info element
    const timeInfo = document.createElement("div");
    timeInfo.style.display = "flex";
    timeInfo.style.alignItems = "center";
    timeInfo.style.gap = "5px";
    timeInfo.innerHTML = `
      <sl-icon name="clock"></sl-icon>
      <span title="${fullDate}">${relativeTime}</span>
    `;

    // Create inline category badge
    const inlineCategoryBadge = document.createElement("div");
    inlineCategoryBadge.className = "todo-category-badge";
    inlineCategoryBadge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      background-color: ${todoCategory.color}20;
      border-radius: 12px;
      font-size: 0.75rem;
      color: ${todoCategory.color};
      margin-left: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
      transition: all 0.2s ease;
    `;
    inlineCategoryBadge.innerHTML = `
      <sl-icon name="${todoCategory.icon}" style="font-size: 0.9rem; flex-shrink: 0;"></sl-icon>
      <span style="overflow: hidden; text-overflow: ellipsis;">${todoCategory.name}</span>
    `;

    // Append elements to todoTime
    todoTime.appendChild(timeInfo);
    todoTime.appendChild(inlineCategoryBadge);

    todoTextContainer.appendChild(todoText);
    todoTextContainer.appendChild(todoTime);

    todoContent.appendChild(checkbox);
    todoContent.appendChild(todoTextContainer);

    // Action buttons - revert to original style but improved
    const todoActions = document.createElement("div");
    todoActions.className = "todo-actions";

    // Create a mobile-specific category badge that will appear above buttons
    const mobileCategoryBadge = document.createElement("div");
    mobileCategoryBadge.className = "mobile-category-badge-wrapper";

    // Clone the category badge for mobile
    const mobileBadge = inlineCategoryBadge.cloneNode(true);
    mobileBadge.style.marginLeft = "0";
    mobileBadge.style.maxWidth = "none";
    mobileCategoryBadge.appendChild(mobileBadge);

    // Create a container for the buttons
    const actionButtons = document.createElement("div");
    actionButtons.className = "todo-actions-buttons";

    const editButton = document.createElement("sl-button");
    editButton.setAttribute("size", "small");
    editButton.setAttribute("variant", "default");
    editButton.innerHTML = '<sl-icon name="pencil"></sl-icon>';
    editButton.title = "Edit Task";

    // Only add event listener if task is not completed
    if (!todo.completed) {
      editButton.addEventListener("click", () => editTodo(todo.id));
      actionButtons.appendChild(editButton);
    } else {
      editButton.setAttribute("disabled", "");
      editButton.title = "Cannot edit completed task";
      editButton.classList.add("disabled-button");
      // Wrap in a div with cursor not-allowed
      const editWrapper = document.createElement("div");
      editWrapper.style.cursor = "not-allowed";
      editWrapper.style.display = "inline-block";
      editWrapper.appendChild(editButton);
      actionButtons.appendChild(editWrapper);
    }

    const deleteButton = document.createElement("sl-button");
    deleteButton.setAttribute("size", "small");
    deleteButton.setAttribute("variant", "danger");
    deleteButton.innerHTML = '<sl-icon name="trash"></sl-icon>';
    deleteButton.title = "Delete Task";

    // Only add event listener if task is not completed
    if (!todo.completed) {
      deleteButton.addEventListener("click", () => deleteTodo(todo.id));
      actionButtons.appendChild(deleteButton);
    } else {
      deleteButton.setAttribute("disabled", "");
      deleteButton.title = "Cannot delete completed task";
      deleteButton.classList.add("disabled-button");
      // Wrap in a div with cursor not-allowed
      const deleteWrapper = document.createElement("div");
      deleteWrapper.style.cursor = "not-allowed";
      deleteWrapper.style.display = "inline-block";
      deleteWrapper.appendChild(deleteButton);
      actionButtons.appendChild(deleteWrapper);
    }

    // Add the mobile category badge and action buttons to the actions container
    todoActions.appendChild(mobileCategoryBadge);
    todoActions.appendChild(actionButtons);

    todoItem.appendChild(todoContent);
    todoItem.appendChild(todoActions);

    return todoItem;
  };

  // Set up drag and drop event listeners once
  todoList.addEventListener("dragover", (e) => {
    e.preventDefault();

    // Only process for non-completed items
    if (!draggedItem || draggedItem.classList.contains("completed")) return;

    const afterElement = getDragAfterElement(todoList, e.clientY);
    const draggable = document.querySelector(".dragging");

    if (afterElement && !afterElement.classList.contains("completed")) {
      todoList.insertBefore(draggable, afterElement);
    } else {
      // Find the first completed item (if any) to insert before
      const firstCompletedItem = todoList.querySelector(".todo-item.completed");
      if (firstCompletedItem) {
        todoList.insertBefore(draggable, firstCompletedItem);
      } else {
        todoList.appendChild(draggable);
      }
    }
  });

  // Helper function to determine where to drop the dragged element
  function getDragAfterElement(container, y) {
    // Get all draggable elements that are not currently being dragged and not completed
    const draggableElements = [
      ...container.querySelectorAll(
        ".draggable:not(.dragging):not(.completed)"
      ),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        // If offset is negative, we're above this element
        // We want the closest element that's above where we're dragging
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // Event Listeners - simplified since dialog handling is now done in the edit functions
  addTodoBtn.addEventListener("click", addTodo);

  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  // Add CSS animations dynamically
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-20px); }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(styleSheet);

  // Initialize
  loadTodos();
  createCategoryFilters(); // Initialize category filters
  getWeather();
  setInterval(getWeather, 30 * 60 * 1000);

  // Focus input on load for better UX
  setTimeout(() => {
    todoInput.focus();
  }, 500);

  // Add CSS for category filters
  const categoryFilterStyles = document.createElement("style");
  categoryFilterStyles.textContent = `
    .category-filter-container {
      padding: 15px 35px 5px;
      animation: fadeIn 0.6s 0.2s backwards;
    }
    
    .category-filter-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    
    .category-filter-items {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .category-filter-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: var(--bg-component);
      border-radius: var(--border-radius-md);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      border: 1px solid transparent;
    }
    
    .category-filter-item:hover {
      background-color: var(--bg-hover);
      transform: translateY(-2px);
    }
    
    .category-filter-item.active {
      background-color: var(--primary-color);
      color: white;
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    
    .todo-category-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      margin-top: 5px;
    }
    
    @media (max-width: 650px) {
      .category-filter-container {
        padding: 15px 20px 5px;
      }
      
      .category-filter-item {
        font-size: 0.8rem;
        padding: 5px 10px;
      }
    }
  `;
  document.head.appendChild(categoryFilterStyles);

  // Pomodoro Timer Feature
  const createPomodoroTimer = () => {
    // Create pomodoro button in footer
    const footer = document.querySelector(".footer-content");
    const pomodoroBtn = document.createElement("button");
    pomodoroBtn.id = "pomodoro-btn";
    pomodoroBtn.className = "pomodoro-btn";
    pomodoroBtn.innerHTML = '<sl-icon name="stopwatch"></sl-icon> Focus Timer';
    pomodoroBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 15px;
      margin-top: 12px;
      background-color: var(--primary-color);
      border: none;
      border-radius: var(--border-radius-md);
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    `;

    // Hover effects
    pomodoroBtn.addEventListener("mouseover", () => {
      pomodoroBtn.style.backgroundColor = "var(--primary-hover)";
      pomodoroBtn.style.transform = "translateY(-2px)";
      pomodoroBtn.style.boxShadow = "var(--shadow-md)";
    });

    pomodoroBtn.addEventListener("mouseout", () => {
      pomodoroBtn.style.backgroundColor = "var(--primary-color)";
      pomodoroBtn.style.transform = "translateY(0)";
      pomodoroBtn.style.boxShadow = "none";
    });

    // Click handler to open pomodoro modal
    pomodoroBtn.addEventListener("click", showPomodoroModal);

    footer.appendChild(document.createElement("br"));
    footer.appendChild(pomodoroBtn);
  };

  // Show pomodoro timer modal
  const showPomodoroModal = () => {
    // Variables for timer
    let timerInterval = null;
    let isTimerRunning = false;
    let timerMode = "pomodoro"; // pomodoro, shortBreak, longBreak
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let completedPomodoros = 0;

    // Timer settings
    const timerSettings = {
      pomodoro: 25 * 60, // 25 minutes
      shortBreak: 5 * 60, // 5 minutes
      longBreak: 15 * 60, // 15 minutes
    };

    // Create modal overlay
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      backdrop-filter: blur(8px);
    `;

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content pomodoro-modal";
    modalContent.style.cssText = `
      background-color: var(--bg-surface);
      padding: 30px;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10000000;
      text-align: center;
    `;

    // Modal header
    const modalHeader = document.createElement("div");
    modalHeader.style.cssText = `
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--text-color);
    `;
    modalHeader.innerHTML = `
      <sl-icon name="stopwatch" style="margin-right: 10px;"></sl-icon>
      Pomodoro Timer
    `;

    // Timer modes selector
    const modesContainer = document.createElement("div");
    modesContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 25px;
    `;

    const createModeButton = (mode, label, icon, color) => {
      const button = document.createElement("button");
      button.className = `timer-mode-btn ${
        mode === "pomodoro" ? "active" : ""
      }`;
      button.dataset.mode = mode;
      button.innerHTML = `<sl-icon name="${icon}"></sl-icon> ${label}`;
      button.style.cssText = `
        padding: 8px 15px;
        background-color: ${
          mode === "pomodoro" ? color : "var(--bg-component)"
        };
        border: none;
        border-radius: var(--border-radius-md);
        color: ${mode === "pomodoro" ? "white" : "var(--text-color)"};
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      `;

      // Click handler to change timer mode
      button.addEventListener("click", () => {
        if (isTimerRunning) {
          // Ask for confirmation before changing mode
          if (
            !confirm("Timer is running. Are you sure you want to switch modes?")
          ) {
            return;
          }
          clearInterval(timerInterval);
          isTimerRunning = false;
        }

        // Update active button
        document.querySelectorAll(".timer-mode-btn").forEach((btn) => {
          btn.classList.remove("active");
          btn.style.backgroundColor = "var(--bg-component)";
          btn.style.color = "var(--text-color)";
        });
        button.classList.add("active");
        button.style.backgroundColor = color;
        button.style.color = "white";

        // Update timer mode and time left
        timerMode = mode;
        timeLeft = timerSettings[mode];
        updateTimerDisplay();

        // Update start/pause button text
        if (!isTimerRunning) {
          startPauseBtn.innerHTML =
            '<sl-icon name="play-fill"></sl-icon> Start';
        }
      });

      return button;
    };

    // Create mode buttons
    const pomodoroBtn = createModeButton(
      "pomodoro",
      "Pomodoro",
      "stopwatch",
      "var(--primary-color)"
    );
    const shortBreakBtn = createModeButton(
      "shortBreak",
      "Short Break",
      "cup-hot",
      "var(--accent-green)"
    );
    const longBreakBtn = createModeButton(
      "longBreak",
      "Long Break",
      "cup",
      "var(--accent-blue)"
    );

    modesContainer.appendChild(pomodoroBtn);
    modesContainer.appendChild(shortBreakBtn);
    modesContainer.appendChild(longBreakBtn);

    // Timer display
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "timer-display";
    timerDisplay.style.cssText = `
      font-size: 4rem;
      font-weight: 700;
      line-height: 1;
      margin: 20px 0 30px;
      color: var(--text-color);
      font-variant-numeric: tabular-nums;
    `;

    // Progress bar
    const progressBarContainer = document.createElement("div");
    progressBarContainer.style.cssText = `
      width: 100%;
      height: 8px;
      background-color: var(--bg-component);
      border-radius: 4px;
      margin-bottom: 30px;
      overflow: hidden;
    `;

    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      height: 100%;
      width: 100%;
      background: var(--gradient-primary);
      border-radius: 4px;
      transition: width 1s linear;
    `;
    progressBarContainer.appendChild(progressBar);

    // Timer controls
    const timerControls = document.createElement("div");
    timerControls.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 20px;
    `;

    // Start/Pause button
    const startPauseBtn = document.createElement("button");
    startPauseBtn.innerHTML = '<sl-icon name="play-fill"></sl-icon> Start';
    startPauseBtn.style.cssText = `
      padding: 12px 25px;
      background: var(--gradient-primary);
      border: none;
      border-radius: var(--border-radius-md);
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      min-width: 120px;
      transition: all var(--transition-fast);
    `;

    // Reset button
    const resetBtn = document.createElement("button");
    resetBtn.innerHTML = '<sl-icon name="arrow-repeat"></sl-icon> Reset';
    resetBtn.style.cssText = `
      padding: 12px 25px;
      background-color: var(--bg-component);
      border: none;
      border-radius: var(--border-radius-md);
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      min-width: 120px;
      transition: all var(--transition-fast);
    `;

    // Stats display
    const statsDisplay = document.createElement("div");
    statsDisplay.style.cssText = `
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 25px;
    `;
    statsDisplay.textContent = "Completed Pomodoros: 0";

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = '<sl-icon name="x"></sl-icon> Close';
    closeButton.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background-color: transparent;
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 0 auto;
      transition: all 0.2s ease;
    `;

    // Update timer display
    const updateTimerDisplay = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerDisplay.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      // Update progress bar
      const totalTime = timerSettings[timerMode];
      const progress = (timeLeft / totalTime) * 100;
      progressBar.style.width = `${progress}%`;

      // Update document title
      document.title = `${timerDisplay.textContent} - ${
        timerMode === "pomodoro" ? "Focus" : "Break"
      } - Todoodledo`;
    };

    // Start timer function
    const startTimer = () => {
      if (isTimerRunning) return;

      isTimerRunning = true;
      startPauseBtn.innerHTML = '<sl-icon name="pause-fill"></sl-icon> Pause';

      timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          isTimerRunning = false;

          // Play notification sound
          const audio = new Audio(
            "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-alert-notification-256.mp3"
          );
          audio.play();

          // Show notification
          showNotification(
            timerMode === "pomodoro" ? "success" : "primary",
            `${timerMode === "pomodoro" ? "Pomodoro" : "Break"} completed!`,
            timerMode === "pomodoro" ? "check-circle" : "cup-hot"
          );

          // If pomodoro completed, update stats
          if (timerMode === "pomodoro") {
            completedPomodoros++;
            statsDisplay.textContent = `Completed Pomodoros: ${completedPomodoros}`;

            // Show desktop notification if permission granted
            if (Notification.permission === "granted") {
              new Notification("Pomodoro Completed", {
                body: "Great job! Time for a break.",
                icon: "assets/favicon-32x32.png",
              });
            }

            // Auto switch to break
            if (completedPomodoros % 4 === 0) {
              // After 4 pomodoros, take a long break
              longBreakBtn.click();
            } else {
              // Otherwise take a short break
              shortBreakBtn.click();
            }
          } else {
            // If break completed, switch to pomodoro
            pomodoroBtn.click();
          }
        }
      }, 1000);
    };

    // Pause timer function
    const pauseTimer = () => {
      if (!isTimerRunning) return;

      clearInterval(timerInterval);
      isTimerRunning = false;
      startPauseBtn.innerHTML = '<sl-icon name="play-fill"></sl-icon> Resume';
    };

    // Reset timer function
    const resetTimer = () => {
      clearInterval(timerInterval);
      isTimerRunning = false;
      timeLeft = timerSettings[timerMode];
      updateTimerDisplay();
      startPauseBtn.innerHTML = '<sl-icon name="play-fill"></sl-icon> Start';
    };

    // Add event listeners
    startPauseBtn.addEventListener("click", () => {
      if (isTimerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    resetBtn.addEventListener("click", resetTimer);

    closeButton.addEventListener("click", () => {
      // Restore original document title
      document.title = "Todoodledo";

      if (isTimerRunning) {
        if (
          confirm("Timer is still running. Are you sure you want to close?")
        ) {
          clearInterval(timerInterval);
          modalOverlay.remove();
        }
      } else {
        modalOverlay.remove();
      }
    });

    // Hover effects
    startPauseBtn.addEventListener("mouseover", () => {
      startPauseBtn.style.transform = "translateY(-2px)";
      startPauseBtn.style.boxShadow = "var(--shadow-md)";
    });

    startPauseBtn.addEventListener("mouseout", () => {
      startPauseBtn.style.transform = "translateY(0)";
      startPauseBtn.style.boxShadow = "none";
    });

    resetBtn.addEventListener("mouseover", () => {
      resetBtn.style.backgroundColor = "var(--bg-hover)";
    });

    resetBtn.addEventListener("mouseout", () => {
      resetBtn.style.backgroundColor = "var(--bg-component)";
    });

    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      closeButton.style.color = "var(--text-color)";
    });

    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "transparent";
      closeButton.style.color = "var(--text-secondary)";
    });

    // Assemble modal
    timerControls.appendChild(startPauseBtn);
    timerControls.appendChild(resetBtn);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modesContainer);
    modalContent.appendChild(timerDisplay);
    modalContent.appendChild(progressBarContainer);
    modalContent.appendChild(timerControls);
    modalContent.appendChild(statsDisplay);
    modalContent.appendChild(closeButton);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Initialize
    updateTimerDisplay();

    // Request notification permission if needed
    if (
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  };

  // Initialize pomodoro timer
  createPomodoroTimer();
});
