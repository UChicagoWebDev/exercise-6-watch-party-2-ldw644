import string
import random
from datetime import datetime
from flask import Flask, g, jsonify, request
from functools import wraps
import sqlite3

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404



# -------------------------------- API ROUTES ----------------------------------

# TODO: Create the API

@app.route('/api/signup', methods=['POST'])
def signup():
    u = new_user()
    api_key = u["api_key"]
    return jsonify({"api_key": api_key, "username": u["name"]})


@app.route('/api/login', methods=['POST'])
def login():
    username = request.json.get("username")
    password = request.json.get("password")
    u = query_db("""
             SELECT * FROM users where name = ? and password = ?
             """,
             [username, password], one=True)
    print(username)
    print(password)
    messages = {"success": 1 if u else 0, "api_key": u["api_key"] if u else None}
    return jsonify(messages)
# POST to change the user's name
@app.route('/api/user/name', methods=['POST'])
def update_username():


    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})
    
    
    new_name = request.json.get("new_name")
    _ = query_db("""
                 UPDATE users 
                 SET name = ?
                 WHERE id = ?
                 """,
                 [new_name, user['id']])
    return jsonify(None)

# POST to change the user's password
@app.route('/api/user/password', methods=['POST'])
def update_password():
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})
    
    new_password = request.json.get("new_password")
    _ = query_db("""
                 UPDATE users 
                 SET password = ?
                 WHERE id = ?
                 """,
                 [new_password, user['id']])
    return jsonify(None)
# POST to change the name of a room
@app.route('/api/room/<int:room_id>/name', methods=['POST'])
def update_room_name(room_id):
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})
    
    new_room_name = request.json.get("new_room_name")
    _ = query_db("""
                 UPDATE rooms 
                 SET name = ?
                 WHERE id = ?
                 """,
                 [new_room_name, room_id])
    return jsonify(None)

def validate_api_key(api_key):
    return query_db('select * from users where api_key = ?', [api_key], one=True)

# GET to get all the messages in a room
@app.route('/api/room/<int:room_id>/messages', methods=['GET'])
def get_all_messages(room_id):
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})
    
    last_id = request.args.get('last_id', default=0, type=str)
    rows = query_db("""
                    SELECT m.id, m.body, u.name as author
                    FROM messages m
                    JOIN users u
                    ON m.user_id = u.id
                    WHERE room_id = ?
                        AND m.id > ?
                    """
                    , [room_id, last_id])
    if rows == None:
        return jsonify(None)
    messages = [{"id": row[0], "body": row[1], "author": row[2]} for row in rows ]
    return jsonify(messages)
    
# POST to post a new message to a room
@app.route('/api/room/<int:room_id>/messages', methods=['POST'])
def post_message(room_id):
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})

    comment = request.json.get('comment')
    _ = query_db("""
                 INSERT INTO messages(user_id, room_id, body)
                 VALUES (?, ?, ?)
                 """, [user['id'], room_id, comment])

    return jsonify(None)

@app.route('/api/room/<int:room_id>/info')
def get_room_info(room_id):
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})

    room_name = query_db("""
                 SELECT name FROM rooms where id = ?
                 """, [room_id], one=True)

    return jsonify({"room_name": room_name["name"]})

@app.route('/api/user/info')
def get_user_info():
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})

    return jsonify({"name": user["name"]})

@app.route('/api/rooms')
def get_rooms():

    rows = query_db("""
                    SELECT * FROM ROOMS;
                    """)
    return jsonify([{"id": row["id"], "name": row["name"]} for row in rows])


@app.route('/api/newroom')
def create_room():
    api_key = request.headers.get('api-key')
    user = validate_api_key(api_key)
    if user is None: return jsonify({"success": 0})

    name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
    room = query_db('insert into rooms (name) values (?) returning id', [name], one=True)            
    return jsonify({"id": room["id"]})