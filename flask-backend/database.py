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
                return {
                    'id': user[0],
                    'username': user[1],
                    'password_hash': user[2],
                    'display_name': user[3],
                    'app_settings': json.loads(user[4]) if user[4] else None,
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

# Initialize database when module is imported
init_db() 