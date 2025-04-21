import json
from pathlib import Path
from database_config import get_db_cursor, get_db_connection, convert_sqlite_to_postgres_query, ENV

DATABASE_PATH = Path(__file__).parent / "restaurant_battle.db"

def create_connection():
    """Create a database connection to SQLite database"""
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        return conn
    except Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def init_db():
    """Initialize the database with required tables"""
    with get_db_connection() as conn:
        try:
            cursor = conn.cursor()
            
            # Create users table
            users_table = convert_sqlite_to_postgres_query('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    display_name TEXT,
                    app_settings TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute(users_table)
            
            # Create favorites table
            favorites_table = convert_sqlite_to_postgres_query('''
                CREATE TABLE IF NOT EXISTS favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    place_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    address TEXT,
                    rating REAL,
                    price INTEGER,
                    lat REAL,
                    lng REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, place_id)
                )
            ''')
            cursor.execute(favorites_table)

            # Create playlists table
            playlists_table = convert_sqlite_to_postgres_query('''
                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            cursor.execute(playlists_table)

            # Create playlist_items table
            playlist_items_table = convert_sqlite_to_postgres_query('''
                CREATE TABLE IF NOT EXISTS playlist_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    playlist_id INTEGER,
                    place_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    address TEXT,
                    rating REAL,
                    price INTEGER,
                    lat REAL,
                    lng REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (playlist_id) REFERENCES playlists (id),
                    UNIQUE(playlist_id, place_id)
                )
            ''')
            cursor.execute(playlist_items_table)
            
            conn.commit()
        except Exception as e:
            print(f"Error creating tables: {e}")
            conn.rollback()

def add_user(username, password_hash, display_name=None, app_settings=None):
    """Add a new user to the database"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                INSERT INTO users (username, password_hash, display_name, app_settings)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (username, password_hash, display_name, json.dumps(app_settings) if app_settings else None))
            return cursor.fetchone()[0]
        except Exception as e:
            print(f"Error adding user: {e}")
            return None

def get_user(username):
    """Get user by username"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
            user = cursor.fetchone()
            if user:
                # Properly handle app_settings deserialization
                app_settings = None
                if user[4]:  # If app_settings exists
                    try:
                        app_settings = json.loads(user[4])
                    except json.JSONDecodeError:
                        app_settings = {}
                
                return {
                    'id': user[0],
                    'username': user[1],
                    'password_hash': user[2],
                    'display_name': user[3],
                    'app_settings': app_settings,
                    'created_at': user[5]
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

def update_user_settings(user_id, app_settings):
    """Update user's app settings"""
    with get_db_cursor() as cursor:
        try:
            # Ensure app_settings is a dictionary before serializing
            if app_settings is None:
                app_settings = {}
            elif isinstance(app_settings, str):
                try:
                    app_settings = json.loads(app_settings)
                except json.JSONDecodeError:
                    app_settings = {}
            
            cursor.execute('''
                UPDATE users 
                SET app_settings = %s
                WHERE id = %s
            ''', (json.dumps(app_settings), user_id))
            return True
        except Exception as e:
            print(f"Error updating user settings: {e}")
            return False

def add_favorite(user_id, restaurant_data):
    """Add a restaurant to user's favorites"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                INSERT INTO favorites 
                (user_id, place_id, name, picture, address, rating, price, lat, lng)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                user_id,
                restaurant_data['place_id'],
                restaurant_data['name'],
                restaurant_data.get('picture', None),
                restaurant_data.get('address', None),
                restaurant_data.get('rating', None),
                restaurant_data.get('price', None),
                restaurant_data.get('lat', None),
                restaurant_data.get('lng', None)
            ))
            return True
        except Exception as e:
            print(f"Error adding favorite: {e}")
            return False

def remove_favorite(user_id, place_id):
    """Remove a restaurant from user's favorites"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                DELETE FROM favorites 
                WHERE user_id = %s AND place_id = %s
            ''', (user_id, place_id))
            return True
        except Exception as e:
            print(f"Error removing favorite: {e}")
            return False

def get_user_favorites(user_id):
    """Get all favorite restaurants for a user"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                SELECT place_id, name, picture, address, rating, price, lat, lng
                FROM favorites
                WHERE user_id = %s
                ORDER BY created_at DESC
            ''', (user_id,))
            favorites = []
            for row in cursor.fetchall():
                favorites.append({
                    'place_id': row[0],
                    'name': row[1],
                    'picture': row[2],
                    'address': row[3],
                    'rating': row[4],
                    'price': row[5],
                    'lat': row[6],
                    'lng': row[7]
                })
            return favorites
        except Exception as e:
            print(f"Error getting user favorites: {e}")
            return []

def create_playlist(user_id, name):
    """Create a new playlist for a user"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                INSERT INTO playlists (user_id, name)
                VALUES (%s, %s)
                RETURNING id
            ''', (user_id, name))
            return cursor.fetchone()[0]
        except Exception as e:
            print(f"Error creating playlist: {e}")
            return None

def get_user_playlists(user_id):
    """Get all playlists for a user"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                SELECT id, name, created_at
                FROM playlists
                WHERE user_id = %s
                ORDER BY created_at DESC
            ''', (user_id,))
            playlists = []
            for row in cursor.fetchall():
                playlists.append({
                    'id': row[0],
                    'name': row[1],
                    'created_at': row[2]
                })
            return playlists
        except Exception as e:
            print(f"Error getting user playlists: {e}")
            return []

def get_playlist_items(playlist_id):
    """Get all items in a playlist"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                SELECT place_id, name, picture, address, rating, price, lat, lng
                FROM playlist_items
                WHERE playlist_id = %s
                ORDER BY created_at DESC
            ''', (playlist_id,))
            items = []
            for row in cursor.fetchall():
                items.append({
                    'place_id': row[0],
                    'name': row[1],
                    'picture': row[2],
                    'address': row[3],
                    'rating': row[4],
                    'price': row[5],
                    'lat': row[6],
                    'lng': row[7]
                })
            return items
        except Exception as e:
            print(f"Error getting playlist items: {e}")
            return []

def add_to_playlist(playlist_id, restaurant_data):
    """Add a restaurant to a playlist"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                INSERT INTO playlist_items 
                (playlist_id, place_id, name, picture, address, rating, price, lat, lng)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                playlist_id,
                restaurant_data['place_id'],
                restaurant_data['name'],
                restaurant_data.get('picture', None),
                restaurant_data.get('address', None),
                restaurant_data.get('rating', None),
                restaurant_data.get('price', None),
                restaurant_data.get('lat', None),
                restaurant_data.get('lng', None)
            ))
            return True
        except Exception as e:
            print(f"Error adding to playlist: {e}")
            return False

def remove_from_playlist(playlist_id, place_id):
    """Remove a restaurant from a playlist"""
    with get_db_cursor() as cursor:
        try:
            cursor.execute('''
                DELETE FROM playlist_items 
                WHERE playlist_id = %s AND place_id = %s
            ''', (playlist_id, place_id))
            return True
        except Exception as e:
            print(f"Error removing from playlist: {e}")
            return False

def delete_playlist(playlist_id):
    """Delete a playlist and all its items"""
    with get_db_connection() as conn:
        try:
            cursor = conn.cursor()
            # First delete all items in the playlist
            cursor.execute('DELETE FROM playlist_items WHERE playlist_id = %s', (playlist_id,))
            # Then delete the playlist itself
            cursor.execute('DELETE FROM playlists WHERE id = %s', (playlist_id,))
            return True
        except Exception as e:
            print(f"Error deleting playlist: {e}")
            return False

# Initialize database when module is imported
init_db() 