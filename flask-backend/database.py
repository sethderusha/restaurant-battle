import sqlite3
from sqlite3 import Error
import json
from pathlib import Path

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
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            
            # Create users table
            c.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    display_name TEXT,
                    app_settings TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create favorites table
            c.execute('''
                CREATE TABLE IF NOT EXISTS favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    place_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    address TEXT,
                    rating REAL,
                    price INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, place_id)
                )
            ''')

            # Create playlists table
            c.execute('''
                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')

            # Create playlist_items table
            c.execute('''
                CREATE TABLE IF NOT EXISTS playlist_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    playlist_id INTEGER,
                    place_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    address TEXT,
                    rating REAL,
                    price INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (playlist_id) REFERENCES playlists (id),
                    UNIQUE(playlist_id, place_id)
                )
            ''')
            
            conn.commit()
        except Error as e:
            print(f"Error creating tables: {e}")
        finally:
            conn.close()

def add_user(username, password_hash, display_name=None, app_settings=None):
    """Add a new user to the database"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                INSERT INTO users (username, password_hash, display_name, app_settings)
                VALUES (?, ?, ?, ?)
            ''', (username, password_hash, display_name, json.dumps(app_settings) if app_settings else None))
            conn.commit()
            return c.lastrowid
        except Error as e:
            print(f"Error adding user: {e}")
            return None
        finally:
            conn.close()

def get_user(username):
    """Get user by username"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('SELECT * FROM users WHERE username = ?', (username,))
            user = c.fetchone()
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
        finally:
            conn.close()

def update_user_settings(user_id, app_settings):
    """Update user's app settings"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            # Ensure app_settings is a dictionary before serializing
            if app_settings is None:
                app_settings = {}
            elif isinstance(app_settings, str):
                try:
                    app_settings = json.loads(app_settings)
                except json.JSONDecodeError:
                    app_settings = {}
            
            c.execute('''
                UPDATE users 
                SET app_settings = ?
                WHERE id = ?
            ''', (json.dumps(app_settings), user_id))
            conn.commit()
            return True
        except Error as e:
            print(f"Error updating user settings: {e}")
            return False
        finally:
            conn.close()

def add_favorite(user_id, restaurant_data):
    """Add a restaurant to user's favorites"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                INSERT INTO favorites 
                (user_id, place_id, name, picture, address, rating, price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                restaurant_data['place_id'],
                restaurant_data['name'],
                restaurant_data.get('picture', None),
                restaurant_data.get('address', None),
                restaurant_data.get('rating', None),
                restaurant_data.get('price', None)
            ))
            conn.commit()
            return True
        except Error as e:
            print(f"Error adding favorite: {e}")
            return False
        finally:
            conn.close()

def remove_favorite(user_id, place_id):
    """Remove a restaurant from user's favorites"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                DELETE FROM favorites 
                WHERE user_id = ? AND place_id = ?
            ''', (user_id, place_id))
            conn.commit()
            return True
        except Error as e:
            print(f"Error removing favorite: {e}")
            return False
        finally:
            conn.close()

def get_user_favorites(user_id):
    """Get all favorite restaurants for a user"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                SELECT place_id, name, picture, address, rating, price
                FROM favorites
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,))
            favorites = []
            for row in c.fetchall():
                favorites.append({
                    'place_id': row[0],
                    'name': row[1],
                    'picture': row[2],
                    'address': row[3],
                    'rating': row[4],
                    'price': row[5]
                })
            return favorites
        finally:
            conn.close()

def create_playlist(user_id, name):
    """Create a new playlist for a user"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                INSERT INTO playlists (user_id, name)
                VALUES (?, ?)
            ''', (user_id, name))
            conn.commit()
            return c.lastrowid
        except Error as e:
            print(f"Error creating playlist: {e}")
            return None
        finally:
            conn.close()

def get_user_playlists(user_id):
    """Get all playlists for a user"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                SELECT id, name, created_at
                FROM playlists
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,))
            playlists = []
            for row in c.fetchall():
                playlists.append({
                    'id': row[0],
                    'name': row[1],
                    'created_at': row[2]
                })
            return playlists
        finally:
            conn.close()

def get_playlist_items(playlist_id):
    """Get all items in a playlist"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                SELECT place_id, name, picture, address, rating, price
                FROM playlist_items
                WHERE playlist_id = ?
                ORDER BY created_at DESC
            ''', (playlist_id,))
            items = []
            for row in c.fetchall():
                items.append({
                    'place_id': row[0],
                    'name': row[1],
                    'picture': row[2],
                    'address': row[3],
                    'rating': row[4],
                    'price': row[5]
                })
            return items
        finally:
            conn.close()

def add_to_playlist(playlist_id, restaurant_data):
    """Add a restaurant to a playlist"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                INSERT INTO playlist_items 
                (playlist_id, place_id, name, picture, address, rating, price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                playlist_id,
                restaurant_data['place_id'],
                restaurant_data['name'],
                restaurant_data.get('picture', None),
                restaurant_data.get('address', None),
                restaurant_data.get('rating', None),
                restaurant_data.get('price', None)
            ))
            conn.commit()
            return True
        except Error as e:
            print(f"Error adding to playlist: {e}")
            return False
        finally:
            conn.close()

def remove_from_playlist(playlist_id, place_id):
    """Remove a restaurant from a playlist"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            c.execute('''
                DELETE FROM playlist_items 
                WHERE playlist_id = ? AND place_id = ?
            ''', (playlist_id, place_id))
            conn.commit()
            return True
        except Error as e:
            print(f"Error removing from playlist: {e}")
            return False
        finally:
            conn.close()

def delete_playlist(playlist_id):
    """Delete a playlist and all its items"""
    conn = create_connection()
    if conn is not None:
        try:
            c = conn.cursor()
            # First delete all items in the playlist
            c.execute('DELETE FROM playlist_items WHERE playlist_id = ?', (playlist_id,))
            # Then delete the playlist itself
            c.execute('DELETE FROM playlists WHERE id = ?', (playlist_id,))
            conn.commit()
            return True
        except Error as e:
            print(f"Error deleting playlist: {e}")
            return False
        finally:
            conn.close()

# Initialize database when module is imported
init_db() 