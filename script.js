'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const liElemen = document.querySelector('li');
class App {
  #map;
  #mapEvent;
  #mapZoom = 13;
  coords;
  #workouts = [];

  /////////////
  constructor() {
    this._getPosition();
    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._panMapOnElemClick.bind(this)
    );
    this._getLocalStorage();
  }
  /////////////
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Location not available');
        }
      );
    }
  }
  /////////////
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const userCoord = [latitude, longitude];

    this.#map = L.map('map').setView(userCoord, this.#mapZoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  /////////////
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  /////////////
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  ////////////
  _newWorkout(e) {
    e.preventDefault();
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;
    this.coords = [lat, lng];

    //fetch data from inputs
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //validation helpers
    const areNumbers = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // if running validate data
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // console.log(distance, duration, cadence);
      if (
        !areNumbers(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('must give valid data: Positive Numbers accepted');
      // create workout obj. push into workouts array
      workout = new Running(this.coords, distance, duration, cadence);
      this.#workouts.push(workout);
    }
    // if cycling validate data
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !areNumbers(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          'must give valid data: Positive Numbers accepted,except for elevation'
        );
      //create workout obj. push into workots array
      workout = new Cycling(this.coords, distance, duration, elevation);
      this.#workouts.push(workout);
    }

    this._renderWorkoutMarker(workout);
    this._renderWorkoutList(workout);
    this._setLocalStorage();
    //clear inputs
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    //hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _renderWorkoutList(workout) {
    if (!workout.iType) return;
    let html = `
    <li class="workout workout--${workout.iType}" data-id="${workout.id}">
      <h2 class="workout__title">Running on April 14</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.iType === 'running' ? '🏃‍♂️' : '🚴‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;
    workout.iType === 'running'
      ? (html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${Math.floor(workout.pace)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`)
      : (html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`);
    form.insertAdjacentHTML('afterend', html);
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(`${workout.description}`, {
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.iType}-popup`,
      })
      .openPopup();
  }

  _panMapOnElemClick(e) {
    const elem = e.target.closest('.workout');
    if (!elem) return;

    const panTO = this.#workouts.find(work => work.id === elem.dataset.id);

    this.#map.setView(panTO.coords, this.#mapZoom, {
      animate: true,
      duration: 1,
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    //stringify and parsing will not inheritate the class methods.
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    console.log(this.#workouts);
    this.#workouts.forEach(work => {
      this._renderWorkoutList(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _getDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${
      this.iType[0].toUpperCase() + this.iType.slice(1)
    } on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  iType = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._getDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  iType = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._getDescription();
  }
  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
