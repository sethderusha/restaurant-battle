import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'development': {
        'type': 'sqlite',
        'database': 'restaurant_battle.db'
    },
    'production': {
        'type': 'postgresql',
        'url': os.getenv('DATABASE_URL')
    }
}

# Get environment
ENV = os.getenv('FLASK_ENV', 'development')

# Connection pool for PostgreSQL
pg_pool = None

def init_db_pool():
    """Initialize the PostgreSQL connection pool"""
    global pg_pool
    if ENV == 'production':
        config = DB_CONFIG['production']
        try:
            print("Attempting to initialize database pool...")
            # Hide password in the connection string for logging
            masked_url = config['url'].replace(os.getenv('DATABASE_URL', '').split('@')[0].split(':')[2], '***')
            print(f"Connection string (with password hidden): {masked_url}")
            pg_pool = SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=config['url']
            )
            print("Successfully initialized database pool")
        except Exception as e:
            print(f"Error initializing database pool: {str(e)}")
            raise

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    if ENV == 'development':
        import sqlite3
        conn = sqlite3.connect(DB_CONFIG['development']['database'])
        conn.row_factory = sqlite3.Row
        yield conn
        conn.close()
    else:
        global pg_pool
        if pg_pool is None:
            init_db_pool()
        conn = pg_pool.getconn()
        try:
            yield conn
            conn.commit()
        finally:
            pg_pool.putconn(conn)

@contextmanager
def get_db_cursor():
    """Context manager for database cursors"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        finally:
            cursor.close()

def convert_sqlite_to_postgres_query(query):
    """Convert SQLite query syntax to PostgreSQL"""
    # Replace SQLite's autoincrement with PostgreSQL's serial
    query = query.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
    
    # Replace SQLite's datetime functions if needed
    query = query.replace('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP')
    
    return query 