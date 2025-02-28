from flask import Flask, request, jsonify
import requests
import os
import random
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes to allow Expo app to connect

# Get Google API key from environment variables
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# In-memory storage for restaurants
# In a production app, you might want to use a database
restaurants_cache = {
    # Format: {session_id: {"all": [list_of_restaurants], "current": [current_two_restaurants]}}
}

@app.route('/api/nearby-restaurants', methods=['GET'])
def get_nearby_restaurants():
    # Get parameters from request
    session_id = request.args.get('session_id', '')
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')
    radius = request.args.get('radius', 1000)  # Default radius: 1000 meters

    # Validate required parameters
    if not all([session_id, latitude, longitude]):
        return jsonify({"error": "Missing required parameters"}), 400

    # Check if we already have restaurants for this session
    if session_id in restaurants_cache:
        # Return the current two restaurants
        return jsonify({"restaurants": restaurants_cache[session_id]["current"]}), 200

    # If no cached data, fetch from Google Places API
    try:
        restaurants = fetch_restaurants_from_google(latitude, longitude, radius)

        if not restaurants:
            return jsonify({"error": "No restaurants found nearby"}), 404

        # Store all restaurants in cache
        restaurants_cache[session_id] = {
            "all": restaurants,
            "current": random.sample(restaurants, min(2, len(restaurants)))
        }

        # Return the current two restaurants
        return jsonify({"restaurants": restaurants_cache[session_id]["current"]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/next-restaurant', methods=['POST'])
def get_next_restaurant():
    data = request.json
    session_id = data.get('session_id', '')
    kept_restaurant_id = data.get('kept_restaurant_id', '')

    # Validate required parameters
    if not all([session_id, kept_restaurant_id]):
        return jsonify({"error": "Missing required parameters"}), 400

    # Check if session exists
    if session_id not in restaurants_cache:
        return jsonify({"error": "Session not found"}), 404

    session_data = restaurants_cache[session_id]
    current_restaurants = session_data["current"]
    all_restaurants = session_data["all"]

    # Find the restaurant to keep
    kept_restaurant = None
    for restaurant in current_restaurants:
        if restaurant["place_id"] == kept_restaurant_id:
            kept_restaurant = restaurant
            break

    if not kept_restaurant:
        return jsonify({"error": "Kept restaurant not found in current options"}), 404

    # Find a new restaurant that's not already in current selection
    current_ids = [r["place_id"] for r in current_restaurants]
    available_restaurants = [r for r in all_restaurants if r["place_id"] not in current_ids]

    if not available_restaurants:
        return jsonify({"error": "No more restaurants available"}), 404

    # Select a random new restaurant
    new_restaurant = random.choice(available_restaurants)

    # Update current restaurants
    session_data["current"] = [kept_restaurant, new_restaurant]

    return jsonify({
        "restaurants": session_data["current"],
        "remaining_count": len(available_restaurants) - 1
    }), 200

@app.route('/api/reset-session', methods=['POST'])
def reset_session():
    data = request.json
    session_id = data.get('session_id', '')

    if not session_id:
        return jsonify({"error": "Missing session ID"}), 400

    if session_id in restaurants_cache:
        del restaurants_cache[session_id]

    return jsonify({"success": True, "message": "Session reset successfully"}), 200

def fetch_restaurants_from_google(latitude, longitude, radius):
    """Fetch restaurants from Google Places API"""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "type": "restaurant",
        "key": GOOGLE_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data["status"] != "OK":
        raise Exception(f"Google API Error: {data.get('status')}")

    # Extract relevant information from each restaurant
    restaurants = []
    for place in data["results"]:
        restaurant = {
            "place_id": place["place_id"],
            "name": place["name"],
            "vicinity": place.get("vicinity", ""),
            "rating": place.get("rating", 0),
            "user_ratings_total": place.get("user_ratings_total", 0),
            "price_level": place.get("price_level", 0),
            "photo_reference": place.get("photos", [{}])[0].get("photo_reference", "") if place.get("photos") else "",
            "location": {
                "lat": place["geometry"]["location"]["lat"],
                "lng": place["geometry"]["location"]["lng"]
            },
            "open_now": place.get("opening_hours", {}).get("open_now", None)
        }
        restaurants.append(restaurant)

    # Handle pagination if there are more results
    if "next_page_token" in data:
        # In a real app, you might want to fetch more pages
        pass

    return restaurants

@app.route('/api/photo', methods=['GET'])
def get_photo():
    """Proxy for Google Places photos to avoid exposing API key to client"""
    photo_reference = request.args.get('photo_reference')
    max_width = request.args.get('max_width', 400)

    if not photo_reference:
        return jsonify({"error": "Missing photo reference"}), 400

    url = "https://maps.googleapis.com/maps/api/place/photo"
    params = {
        "photoreference": photo_reference,
        "maxwidth": max_width,
        "key": GOOGLE_API_KEY
    }

    response = requests.get(url, params=params, stream=True)

    # Return the image directly
    return response.content, response.status_code, response.headers.items()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
