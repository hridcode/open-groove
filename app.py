from flask import Flask, render_template, request, jsonify, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, get_jwt, get_jwt_identity, jwt_required, create_access_token, set_access_cookies, get_csrf_token

from datetime import datetime, timedelta, timezone

from functools import wraps
import os, json
from dotenv import load_dotenv

import uuid, boto3
from botocore.client import Config

import mutagen

load_dotenv()

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ["DB_URI"]
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True
}

app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_COOKIE_SECURE"] = False 
app.config['JWT_CSRF_CHECK_FORM'] = True
app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days = 1)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["R2_URL"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY"],
    aws_secret_access_key=os.environ["R2_SECRET_KEY"],
    config=Config(signature_version="s3v4")
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)

    songs = db.relationship('Song', backref='owner', lazy=True)
    albums = db.relationship('Album', backref='owner', lazy=True) 

class Album(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    artists = db.Column(db.JSON, nullable=False)
    release = db.Column(db.Date)
    cover_url = db.Column(db.String)

    songs = db.relationship('Song', backref='album', lazy=True)
    owner_id = db.Column(db.Integer, db.ForeignKey(User.id), nullable=False)

class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    artists = db.Column(db.JSON, nullable=False)
    
    duration = db.Column(db.Float, nullable=False)

    song_key = db.Column(db.String, nullable=False, unique=True)

    owner_id = db.Column(db.Integer, db.ForeignKey(User.id), nullable=False)
    album_id = db.Column(db.Integer, db.ForeignKey(Album.id))

def code(code, message):
    return jsonify({
        'code': code,
        'message': message,
    })

def safe_route(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            return code(500, str(e))

    return wrapper

@app.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes = 30))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=get_jwt_identity())
            set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        return response

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload")
@jwt_required()
def upload():
    access_token = request.cookies.get("access_token_cookie")
    csrf_token = get_csrf_token(access_token)

    return render_template("upload.html", csrf_token=csrf_token)

@app.route("/login")
def login():
    return render_template("login.html")

@safe_route
@app.route("/auth", methods=["POST"])
def auth():
    mode = request.form.get('mode', type=int)

    # 0: SIGN UP
    # 1: SIGN IN

    if mode not in [0, 1]:
        return code(400, "Argument 'mode' must be either 0 or 1")

    username = request.form.get('user')
    password = request.form.get('pwd')

    success = False
    user_id = None

    if not username or not password:
        return code(400, "Missing username or password argument")

    if mode == 0:
        allowed_chars = list("abcdefghijklmnopqrstuvwxyz1234567890-_")
        if any(char not in allowed_chars for char in username) or not 4 <= len(username) <= 15:
            return code(400, "Username is invalid")

        if " " in password or not 8 <= len(password) <= 20:
            return code(400, "Password is invalid")

        existing_user = User.query.filter_by(username=username).first()

        if existing_user:
            return code(409, "User already exists")

        new_user = User(
            username = username,
            password = bcrypt.generate_password_hash(password).decode('utf-8')
        )

        db.session.add(new_user)
        db.session.commit()

        success = True
        user_id = new_user.id
    elif mode == 1:
        existing_user = User.query.filter_by(username=username).first()

        if not existing_user:
            return code(404, "User does not exist")

        if not bcrypt.check_password_hash(existing_user.password.encode('utf-8'), password):
            return code(403, "Incorrect password")

        success = True
        user_id = existing_user.id    
    if success:
        response = redirect('/')
        access_token = create_access_token(identity=str(user_id))         
        set_access_cookies(response, access_token)
        return response
    else:
        return code(500, "Something went wrong, retry")

@app.route('/media', methods=["POST"])
@jwt_required()
@safe_route
def upload_media():
    if 'file' not in request.files:
        return code(400, "No files uploaded")

    identity = int(get_jwt_identity())

    uploaded_files = request.files.getlist("file")

    file_metadata = request.form.get("metadata")
    file_metadata = json.loads(file_metadata)

    album_dict = {}

    for index, album in enumerate(file_metadata.get("albums")): 
        name = album.get("name")
        artists = album.get("artists")
        release = datetime.strptime(
            album["release"],
            "%-m/%-d/%Y"
        ).date()
        cover_url = album.get("cover")

        new_album = Album(
            name = name,
            artists = artists,
            release = release,
            cover_url = cover_url,
            owner_id = identity
        )

        db.session.add(new_album)
        db.session.flush()

        album_dict[index] = new_album.id

    for index, song in enumerate(file_metadata.get("songs")):
        file = uploaded_files[song["file"]]
        ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"

        audio = mutagen.File(file.stream)

        if audio is None:
            return code(400, "Unsupported file")

        s3.upload_fileobj(file, "open-groove", f"uploads/songs/{filename}")

        name = song.get("name")
        artists = song.get("artists")
        print(song.get("album"), album_dict)
        album_id = album_dict[song.get("album")]
        duration = int(audio.info.length)

        new_song = Song(
            name = name,
            artists = artists,
            song_key = filename,
            owner_id = identity,
            duration = duration,
            album_id = album_id
        )

        db.session.add(new_song)

        del audio
    
    db.session.commit()
    return code(200, "Content successfully uploaded")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(debug=True)