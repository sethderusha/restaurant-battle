from flask import Flask, request, jsonify
import requests
import os
import random
from flask_cors import CORS
from dotenv import load_dotenv
import time
import threading
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
from datetime import datetime, timedelta
from database import (
    add_user,
    get_user,
    update_user_settings,
    add_favorite,
    remove_favorite,
    get_user_favorites,
    create_playlist,
    get_user_playlists,
    get_playlist_items,
    add_to_playlist,
    remove_from_playlist,
    delete_playlist
)
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Update CORS configuration to properly handle preflight requests
CORS(app, resources={r"/api/*": {
    "origins": ["http://localhost:8081", "http://localhost:3000", "http://localhost:5000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')  # Change in production
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# In-memory storage for restaurants
# TODO: We need to make this a database
restaurants_cache = {
    # Format: {session_id: {"all": [list_of_restaurants], "index": current_index}}
}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_user(data['username'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    display_name = data.get('displayName', username)
    
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
    
    if get_user(username):
        return jsonify({'error': 'Username already exists'}), 409
    
    password_hash = generate_password_hash(password)
    user_id = add_user(username, password_hash, display_name)
    
    if user_id:
        token = jwt.encode({
            'username': username,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'token': token,
            'username': username,
            'displayName': display_name
        }), 201
    
    return jsonify({'error': 'Could not create user'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = get_user(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    token = jwt.encode({
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, app.config['SECRET_KEY'])
    
    return jsonify({
        'token': token,
        'username': username,
        'displayName': user['display_name']
    }), 200

@app.route('/api/user/settings', methods=['GET', 'PUT'])
@token_required
def handle_user_settings(current_user):
    if request.method == 'GET':
        settings = current_user['app_settings'] or {}
        return jsonify({
            'settings': settings,
            'profilePicture': settings.get('profilePicture', 'default'),
            'displayName': current_user['display_name'],
            'username': current_user['username']
        }), 200
    
    data = request.json
    current_settings = current_user['app_settings'] or {}
    
    # Handle profile picture update
    if 'profilePicture' in data:
        current_settings['profilePicture'] = data['profilePicture']
    
    # Handle display name update
    if 'displayName' in data:
        conn = create_connection()
        if conn is not None:
            try:
                c = conn.cursor()
                c.execute('''
                    UPDATE users 
                    SET display_name = ?
                    WHERE id = ?
                ''', (data['displayName'], current_user['id']))
                conn.commit()
            except Error as e:
                print(f"Error updating display name: {e}")
                return jsonify({'error': 'Could not update display name'}), 500
            finally:
                conn.close()
    
    # Handle password update
    if 'password' in data and 'currentPassword' in data:
        if not check_password_hash(current_user['password_hash'], data['currentPassword']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        new_password_hash = generate_password_hash(data['password'])
        conn = create_connection()
        if conn is not None:
            try:
                c = conn.cursor()
                c.execute('''
                    UPDATE users 
                    SET password_hash = ?
                    WHERE id = ?
                ''', (new_password_hash, current_user['id']))
                conn.commit()
            except Error as e:
                print(f"Error updating password: {e}")
                return jsonify({'error': 'Could not update password'}), 500
            finally:
                conn.close()
    
    if update_user_settings(current_user['id'], current_settings):
        return jsonify({
            'message': 'Settings updated successfully',
            'profilePicture': current_settings.get('profilePicture', 'default'),
            'displayName': data.get('displayName', current_user['display_name'])
        }), 200
    return jsonify({'error': 'Could not update settings'}), 500

@app.route('/api/favorites', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_favorites(current_user):
    if request.method == 'GET':
        favorites = get_user_favorites(current_user['id'])
        return jsonify({'favorites': favorites}), 200
    
    elif request.method == 'POST':
        data = request.json
        if add_favorite(current_user['id'], data):
            return jsonify({'message': 'Restaurant added to favorites'}), 201
        return jsonify({'error': 'Could not add to favorites'}), 500
    
    elif request.method == 'DELETE':
        place_id = request.args.get('place_id')
        if not place_id:
            return jsonify({'error': 'Missing place_id'}), 400
        
        if remove_favorite(current_user['id'], place_id):
            return jsonify({'message': 'Restaurant removed from favorites'}), 200
        return jsonify({'error': 'Could not remove from favorites'}), 500

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

def parse_google_maps_url(url):
    try:
        print(f"🔍 Parsing Google Maps URL: {url}")
        place_id = None
        
        # Clean the URL by removing any trailing slashes or parameters
        url = url.strip().rstrip('/')
        
        if 'maps.app.goo.gl' in url or 'goo.gl' in url:
            # Format: https://maps.app.goo.gl/A8mmiPFV7VnvpBJZ9
            print(f"🔄 Detected shortened URL format: {url}")
            
            try:
                # Set up a session to handle redirects manually
                session = requests.Session()
                
                # First, make a HEAD request to get the redirect chain
                head_response = session.head(url, allow_redirects=True)
                print(f"🔄 Redirect chain: {head_response.history}")
                final_url = head_response.url
                print(f"🔄 Final URL after redirect: {final_url}")
                
                # Now make a GET request to get the actual content
                response = session.get(final_url)
                content = response.text
                print(f"🔄 Got response content length: {len(content)}")
                
                # Try different methods to extract the place_id
                if 'place_id=' in final_url:
                    place_id = final_url.split('place_id=')[1].split('&')[0]
                    print(f"✅ Extracted place_id from redirected URL query: {place_id}")
                elif 'data=!3m1!4b1!4m' in content:
                    # Try to find place_id in the page content
                    match = re.search(r'!1s([^!]+)!', content)
                    if match:
                        place_id = match.group(1)
                        print(f"✅ Extracted place_id from page content: {place_id}")
                    else:
                        print("❌ Could not find place_id pattern in page content")
                elif '/place/' in final_url:
                    parts = final_url.split('/place/')
                    if len(parts) > 1:
                        potential_id = parts[1].split('/')[0]
                        if potential_id.startswith('ChI'):
                            place_id = potential_id
                            print(f"✅ Extracted place_id from URL path: {place_id}")
                        else:
                            print(f"❌ Found path segment but not a valid place_id: {potential_id}")
                
                if not place_id:
                    # Try to find coordinates and search nearby
                    coord_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                    if coord_match:
                        lat, lng = coord_match.groups()
                        print(f"✅ Found coordinates: {lat}, {lng}")
                        
                        # Use Places API nearby search
                        search_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                        search_params = {
                            "location": f"{lat},{lng}",
                            "radius": "50",  # Very small radius to get exact match
                            "key": GOOGLE_API_KEY
                        }
                        
                        search_response = requests.get(search_url, params=search_params)
                        search_data = search_response.json()
                        
                        if search_data.get("status") == "OK" and search_data.get("results"):
                            place_id = search_data["results"][0]["place_id"]
                            print(f"✅ Found place_id from nearby search: {place_id}")
                        else:
                            print(f"❌ Nearby search failed: {search_data.get('status')}")
                    else:
                        print("❌ Could not find coordinates in URL")
                
            except requests.exceptions.RequestException as e:
                print(f"❌ Error following redirect: {str(e)}")
                raise ValueError(f"Failed to follow redirect: {str(e)}")
            
        elif 'place_id=' in url:
            # Format: https://www.google.com/maps/place/?q=place_id:ChIJ...
            place_id = url.split('place_id=')[1].split('&')[0]
            print(f"✅ Extracted place_id from query parameter: {place_id}")
        else:
            print(f"❌ Unsupported URL format: {url}")
            raise ValueError("Unsupported URL format")
        
        if not place_id:
            print("❌ Could not extract place_id using any method")
            raise ValueError("Could not extract place_id from URL")
        
        # Validate the place_id format
        if not place_id.startswith('ChI'):
            print(f"❌ Invalid place_id format: {place_id}")
            raise ValueError("Invalid place_id format")
            
        print(f"✅ Final place_id: {place_id}")
        return place_id
        
    except Exception as e:
        print(f"❌ Error parsing Google Maps URL: {str(e)}")
        raise ValueError(f"Failed to parse Google Maps URL: {str(e)}")

@app.route('/api/playlists', methods=['GET', 'POST'])
@token_required
def handle_playlists(current_user):
    if request.method == 'GET':
        playlists = get_user_playlists(current_user['id'])
        return jsonify({'playlists': playlists}), 200
    
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Playlist name is required'}), 400
        
        playlist_id = create_playlist(current_user['id'], name)
        if playlist_id:
            return jsonify({
                'message': 'Playlist created successfully',
                'playlist_id': playlist_id
            }), 201
        return jsonify({'error': 'Could not create playlist'}), 500

@app.route('/api/playlists/<int:playlist_id>', methods=['GET', 'DELETE'])
@token_required
def handle_playlist(current_user, playlist_id):
    if request.method == 'GET':
        items = get_playlist_items(playlist_id)
        return jsonify({'items': items}), 200
    
    elif request.method == 'DELETE':
        if delete_playlist(playlist_id):
            return jsonify({'message': 'Playlist deleted successfully'}), 200
        return jsonify({'error': 'Could not delete playlist'}), 500

@app.route('/api/playlists/<int:playlist_id>/items', methods=['POST', 'DELETE'])
@token_required
def handle_playlist_items(current_user, playlist_id):
    if request.method == 'POST':
        data = request.json
        if add_to_playlist(playlist_id, data):
            return jsonify({'message': 'Restaurant added to playlist'}), 201
        return jsonify({'error': 'Could not add to playlist'}), 500
    
    elif request.method == 'DELETE':
        place_id = request.args.get('place_id')
        if not place_id:
            return jsonify({'error': 'Missing place_id'}), 400
        
        if remove_from_playlist(playlist_id, place_id):
            return jsonify({'message': 'Restaurant removed from playlist'}), 200
        return jsonify({'error': 'Could not remove from playlist'}), 500

@app.route('/api/restaurants/search', methods=['GET'])
@token_required
def search_restaurants(current_user):
    query = request.args.get('query')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    try:
        # Use Google Places Autocomplete API
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        params = {
            "input": query,
            "types": "restaurant",
            "key": GOOGLE_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data["status"] != "OK":
            error_message = data.get("error_message", "Unknown error")
            return jsonify({'error': f'Could not search restaurants: {error_message}'}), 400
        
        # Format the results
        results = []
        for prediction in data["predictions"]:
            results.append({
                "place_id": prediction["place_id"],
                "name": prediction["structured_formatting"]["main_text"],
                "address": prediction["structured_formatting"]["secondary_text"]
            })
        
        return jsonify({'results': results}), 200
    
    except Exception as e:
        print(f"❌ Exception in search_restaurants: {str(e)}")
        return jsonify({'error': f'Failed to search restaurants: {str(e)}'}), 500

@app.route('/api/favorites/manual', methods=['POST'])
@token_required
def add_manual_favorite(current_user):
    data = request.json
    place_id = data.get('place_id')
    
    if not place_id:
        print("❌ No place_id provided in request")
        return jsonify({'error': 'Place ID is required'}), 400
    
    try:
        # Make a request to Google Places API to get restaurant details
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,rating,price_level,photos",
            "key": GOOGLE_API_KEY
        }
        
        print(f"🔄 Making Places API request with params: {params}")
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            print(f"🔄 Places API response status: {data.get('status')}")
            
            if data["status"] != "OK":
                error_message = data.get("error_message", "Unknown error")
                print(f"❌ Places API error: {error_message}")
                return jsonify({'error': f'Could not fetch restaurant details: {error_message}'}), 400
            
            result = data["result"]
            restaurant_data = {
                "place_id": place_id,
                "name": result["name"],
                "address": result.get("formatted_address", ""),
                "rating": result.get("rating", 0),
                "price": result.get("price_level", 0),
                "picture": result.get("photos", [{}])[0].get("photo_reference", "") if result.get("photos") else ""
            }
            
            print(f"✅ Adding favorite with data: {restaurant_data}")
            if add_favorite(current_user['id'], restaurant_data):
                return jsonify({'message': 'Restaurant added to favorites'}), 201
            return jsonify({'error': 'Could not add to favorites'}), 500
        except requests.exceptions.RequestException as e:
            print(f"❌ Error making Places API request: {str(e)}")
            return jsonify({'error': f'Failed to connect to Google Places API: {str(e)}'}), 500
        
    except Exception as e:
        print(f"❌ Exception in add_manual_favorite: {str(e)}")
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
