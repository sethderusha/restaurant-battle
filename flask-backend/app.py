from flask import Flask, request, jsonify
import requests
import os
import random
from flask_cors import CORS
from dotenv import load_dotenv
import time
import threading

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get Google API key from environment variables
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# In-memory storage for restaurants
# TODO: We need to make this a database
restaurants_cache = {
    # Format: {session_id: {"all": [list_of_restaurants], "index": current_index}}
}

def fetch_next_page_async(session_id, next_page_token):
    """Asynchronously fetch the next page of restaurants"""
    try:
        new_restaurants, new_token = fetch_next_page_restaurants(next_page_token)
        if new_restaurants and session_id in restaurants_cache:
            session_data = restaurants_cache[session_id]
            session_data["all"].extend(new_restaurants)
            session_data["next_page_token"] = new_token
            session_data["last_fetch_size"] = len(new_restaurants)
            session_data["is_fetching"] = False
    except Exception as e:
        print(f"Failed to fetch next page: {str(e)}")
        if session_id in restaurants_cache:
            restaurants_cache[session_id]["is_fetching"] = False

@app.route('/api/nearby-restaurants', methods=['GET'])
def get_nearby_restaurants():
    session_id = request.args.get('session_id', '')
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')
    radius = request.args.get('radius', 1000)  # Default radius: 1000 meters

    if not all([session_id, latitude, longitude]):
        return jsonify({"error": "Missing required parameters"}), 400

    if session_id in restaurants_cache:
        # Return the current restaurant pair
        index = restaurants_cache[session_id]["index"]
        restaurants = restaurants_cache[session_id]["all"]
        return jsonify({"restaurants": restaurants[index:index+2]}), 200

    try:
        restaurants, next_page_token = fetch_restaurants_from_google(latitude, longitude, radius)
        if not restaurants:
            return jsonify({"error": "No restaurants found nearby"}), 404

        restaurants_cache[session_id] = {
            "all": restaurants,
            "index": 1,
            "next_page_token": next_page_token,
            "last_fetch_size": len(restaurants),
            "is_fetching": False
        }

        return jsonify({"restaurants": restaurants[:2]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/next-restaurant', methods=['POST'])
def get_next_restaurant():
    data = request.json
    session_id = data.get('session_id', '')

    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400

    if session_id not in restaurants_cache:
        return jsonify({"error": "Session not found"}), 404

    session_data = restaurants_cache[session_id]
    all_restaurants = session_data["all"]
    index = session_data["index"]
    next_page_token = session_data.get("next_page_token")
    last_fetch_size = session_data.get("last_fetch_size", 20)
    is_fetching = session_data.get("is_fetching", False)

    # Calculate how many restaurants we've viewed in the current batch
    restaurants_viewed_in_batch = (index + 1) % last_fetch_size

    # If we're 5 restaurants away from the end of current batch and have a next page token
    # and we're not already fetching
    if (restaurants_viewed_in_batch >= (last_fetch_size - 5) and 
        next_page_token and 
        not is_fetching):
        # Start fetching next page in background
        session_data["is_fetching"] = True
        thread = threading.Thread(
            target=fetch_next_page_async,
            args=(session_id, next_page_token)
        )
        thread.start()

    # Move to the next restaurant, stopping at the end
    next_index = min(index + 1, len(all_restaurants) - 1)
    restaurants_cache[session_id]["index"] = next_index

    return jsonify({
        "restaurant": all_restaurants[next_index],
        "remaining_count": len(all_restaurants) - next_index - 1
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
    
    # Initial request parameters
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

    return restaurants, data.get("next_page_token")

def fetch_next_page_restaurants(next_page_token):
    """Fetch the next page of restaurants using the page token"""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    # Wait for token to become valid
    time.sleep(2)
    
    params = {
        "key": GOOGLE_API_KEY,
        "pagetoken": next_page_token
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data["status"] != "OK":
        if data["status"] == "INVALID_REQUEST":
            # Token might not be ready yet, wait longer and try one more time
            time.sleep(3)
            response = requests.get(url, params=params)
            data = response.json()
            if data["status"] != "OK":
                return [], None
        else:
            return [], None

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

    return restaurants, data.get("next_page_token")

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
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
