import os
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app)

GOOGLE_WEATHER_BASE = "https://weather.googleapis.com/v1"
API_TIMEOUT_SECONDS = 12

MALAYSIA_CITIES: list[dict[str, object]] = [
    {"city": "Kuala Lumpur", "lat": 3.1390, "lng": 101.6869},
    {"city": "George Town", "lat": 5.4141, "lng": 100.3288},
    {"city": "Johor Bahru", "lat": 1.4927, "lng": 103.7414},
    {"city": "Kota Kinabalu", "lat": 5.9804, "lng": 116.0735},
    {"city": "Kuching", "lat": 1.5535, "lng": 110.3593},
]

CITY_LOOKUP = {entry["city"].lower(): entry for entry in MALAYSIA_CITIES}
DEFAULT_CITY_KEY = "kuala lumpur"

ICON_MAP = {
    "CLEAR": "☀️",
    "MOSTLY_CLEAR": "🌤️",
    "PARTLY_CLOUDY": "⛅",
    "MOSTLY_CLOUDY": "☁️",
    "CLOUDY": "☁️",
    "FOG": "🌫️",
    "LIGHT_RAIN": "🌦️",
    "RAIN": "🌧️",
    "RAIN_SHOWERS": "🌧️",
    "SCATTERED_SHOWERS": "🌦️",
    "THUNDERSTORM": "⛈️",
    "SNOW": "❄️",
}


def _city_record(city_name: str) -> dict[str, object]:
    normalized = (city_name or "").strip().lower()
    return CITY_LOOKUP.get(normalized, CITY_LOOKUP[DEFAULT_CITY_KEY])


def _get_weather_api_key() -> str:
    return os.environ.get("GOOGLE_WEATHER_API_KEY", "").strip()


def _weather_request(path: str, params: dict[str, object], api_key: str) -> dict:
    response = requests.get(
        f"{GOOGLE_WEATHER_BASE}{path}",
        params={**params, "key": api_key},
        timeout=API_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _format_google_payload(city: str, current: dict, daily: dict) -> dict:
    now = datetime.now()
    date_str = now.strftime("%A, %b ") + str(now.day)

    current_temp = round((current.get("temperature") or {}).get("degrees", 0))
    max_temp = current_temp
    min_temp = current_temp

    forecast_days = daily.get("forecastDays", [])
    if forecast_days:
        today = forecast_days[0]
        max_temp = round((today.get("maxTemperature") or {}).get("degrees", current_temp))
        min_temp = round((today.get("minTemperature") or {}).get("degrees", current_temp))

    condition = (
        ((current.get("weatherCondition") or {}).get("description") or {}).get("text")
        or "Unknown"
    )
    condition_type = (current.get("weatherCondition") or {}).get("type", "")

    humidity = current.get("relativeHumidity")
    humidity_text = f"{humidity}%" if humidity is not None else "N/A"

    wind_speed = ((current.get("wind") or {}).get("speed") or {}).get("value")
    wind_text = f"{round(wind_speed)} km/h" if wind_speed is not None else "N/A"

    timeline = []
    for idx, day in enumerate(forecast_days[:4]):
        display = day.get("displayDate") or {}
        label = f"{display.get('day', idx + 1)}/{display.get('month', '')}" if display else f"Day {idx + 1}"

        day_forecast = day.get("daytimeForecast") or {}
        night_forecast = day.get("nighttimeForecast") or {}
        day_type = (day_forecast.get("weatherCondition") or {}).get("type", condition_type)

        icon = ICON_MAP.get(day_type, "🌤️")
        temp = round((day.get("maxTemperature") or {}).get("degrees", current_temp))
        rain = ((day_forecast.get("precipitation") or {}).get("probability") or {}).get("percent", 0)

        timeline.append(
            {
                "slot": label,
                "icon": icon,
                "temp": temp,
                "rain": rain,
                "nightHumidity": night_forecast.get("relativeHumidity"),
            }
        )

    if not timeline:
        timeline = [
            {"slot": "Today", "icon": ICON_MAP.get(condition_type, "🌤️"), "temp": current_temp, "rain": 0}
        ]

    return {
        "city": city,
        "condition": condition,
        "temp": current_temp,
        "high": max_temp,
        "low": min_temp,
        "wind": wind_text,
        "humidity": humidity_text,
        "timeline": timeline,
        "date": date_str,
        "ts": datetime.utcnow().isoformat() + "Z",
    }


@app.route("/api/weather")
def get_weather():
    city_param = request.args.get("city", CITY_LOOKUP[DEFAULT_CITY_KEY]["city"])
    selected_city = _city_record(city_param)
    api_key = _get_weather_api_key()

    if not api_key:
        return jsonify({"error": "Missing GOOGLE_WEATHER_API_KEY in backend environment."}), 500

    lat = selected_city["lat"]
    lng = selected_city["lng"]

    try:
        current_payload = _weather_request(
            "/currentConditions:lookup",
            {
                "location.latitude": lat,
                "location.longitude": lng,
            },
            api_key,
        )
        daily_payload = _weather_request(
            "/forecast/days:lookup",
            {
                "location.latitude": lat,
                "location.longitude": lng,
                "days": 4,
            },
            api_key,
        )
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        body = exc.response.text if exc.response is not None else str(exc)
        return jsonify({"error": "Google Weather API request failed.", "details": body}), status_code
    except requests.RequestException as exc:
        return jsonify({"error": "Google Weather API is unreachable.", "details": str(exc)}), 502

    return jsonify(_format_google_payload(selected_city["city"], current_payload, daily_payload))


@app.route("/api/hourly-forecast")
def get_hourly_forecast():
    city_param = request.args.get("city", CITY_LOOKUP[DEFAULT_CITY_KEY]["city"])
    selected_city = _city_record(city_param)
    api_key = _get_weather_api_key()

    if not api_key:
        return jsonify({"error": "Missing GOOGLE_WEATHER_API_KEY in backend environment."}), 500

    lat = selected_city["lat"]
    lng = selected_city["lng"]

    try:
        hourly_payload = _weather_request(
            "/forecast/hours:lookup",
            {
                "location.latitude": lat,
                "location.longitude": lng,
                "hours": 240,
            },
            api_key,
        )
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        body = exc.response.text if exc.response is not None else str(exc)
        return jsonify({"error": "Google Weather API request failed.", "details": body}), status_code
    except requests.RequestException as exc:
        return jsonify({"error": "Google Weather API is unreachable.", "details": str(exc)}), 502

    return jsonify(hourly_payload)


@app.route("/api/daily-forecast")
def get_daily_forecast():
    city_param = request.args.get("city", CITY_LOOKUP[DEFAULT_CITY_KEY]["city"])
    selected_city = _city_record(city_param)
    api_key = _get_weather_api_key()

    if not api_key:
        return jsonify({"error": "Missing GOOGLE_WEATHER_API_KEY in backend environment."}), 500

    lat = selected_city["lat"]
    lng = selected_city["lng"]

    try:
        daily_payload = _weather_request(
            "/forecast/days:lookup",
            {
                "location.latitude": lat,
                "location.longitude": lng,
                "days": 10,
            },
            api_key,
        )
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else 502
        body = exc.response.text if exc.response is not None else str(exc)
        return jsonify({"error": "Google Weather API request failed.", "details": body}), status_code
    except requests.RequestException as exc:
        return jsonify({"error": "Google Weather API is unreachable.", "details": str(exc)}), 502

    return jsonify(daily_payload)


@app.route("/api/cities")
def list_cities():
    return jsonify({"cities": [entry["city"] for entry in MALAYSIA_CITIES]})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
