
from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import re
import json
import hmac
import base64
import hashlib
import urllib.request
import urllib.error
from functools import wraps
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

app.config['SECRET_KEY'] = 'xskill-secret-key'
IST_TZ = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


# ---------------- DATABASE CONNECTION ---------------- #

def create_db_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Veera@2008",   # change if needed
            database="xskill_db1"
        )
        return connection
    except Error as e:
        print("Database Error:", e)
        return None


def sanitize_user(user):
    if not user:
        return None

    safe_user = dict(user)
    safe_user.pop("password", None)
    return safe_user


def get_request_data():
    return request.get_json(silent=True) or {}


def decode_auth_token(token):
    if not token:
        return None

    if token.startswith("Bearer "):
        token = token.split(" ", 1)[1]

    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
    except Exception:
        return None


def to_iso_utc(value):
    if isinstance(value, datetime.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=datetime.timezone.utc)
        return value.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, str):
        raw_value = value.strip()
        if not raw_value:
            return raw_value

        normalized = raw_value.replace(" ", "T")
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"

        try:
            parsed = datetime.datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=datetime.timezone.utc)
            return parsed.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            return value
    return value


def to_iso_ist(value):
    if isinstance(value, datetime.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=IST_TZ)
        return value.astimezone(IST_TZ).isoformat()
    if isinstance(value, str):
        raw_value = value.strip()
        if not raw_value:
            return raw_value

        normalized = raw_value.replace(" ", "T")
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"

        try:
            parsed = datetime.datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=IST_TZ)
            return parsed.astimezone(IST_TZ).isoformat()
        except ValueError:
            return value
    return value


def utc_now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_message_record(record):
    safe_record = dict(record)
    safe_record["created_at"] = to_iso_ist(safe_record.get("created_at"))
    safe_record["edited_at"] = to_iso_ist(safe_record.get("edited_at"))
    safe_record["seen_at"] = to_iso_ist(safe_record.get("seen_at"))
    return safe_record


def ensure_messages_schema(conn):
    cursor = conn.cursor()
    statements = [
        "ALTER TABLE messages ADD COLUMN seen_at TIMESTAMP NULL DEFAULT NULL",
        "ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL",
        "CREATE INDEX idx_messages_receiver_seen ON messages(receiver_id, seen_at)",
    ]

    try:
        for sql in statements:
            try:
                cursor.execute(sql)
            except Error as err:
                if getattr(err, "errno", None) in {1060, 1061, 1831}:
                    continue
                if "Duplicate" in str(err):
                    continue
                raise
        conn.commit()
    finally:
        cursor.close()


def default_user_settings():
    return {
        "timezone": "UTC",
        "language": "English (US)",
        "dark_mode": False,
        "notifications": {
            "email": True,
            "push": True,
            "trialUpdates": True,
            "messages": True,
            "payments": True,
            "marketing": False,
        },
        "privacy": {
            "profileVisible": True,
            "showSkills": True,
            "showEarnings": False,
            "allowMessages": True,
        },
    }


def parse_json_object(raw_value, fallback):
    if not raw_value:
        return dict(fallback)
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict):
            safe = dict(fallback)
            for key, value in parsed.items():
                safe[key] = value
            return safe
    except Exception:
        pass
    return dict(fallback)


def normalize_skill_record(row):
    skill = dict(row or {})
    skill.setdefault("id", None)
    skill.setdefault("skill_name", "")
    skill.setdefault("category", "")
    skill.setdefault("level", "beginner")
    skill.setdefault("skill_price", None)
    skill.setdefault("validation_status", "pending")
    skill.setdefault("test_score", None)
    skill.setdefault("best_test_score", None)
    skill.setdefault("test_attempts", 0)
    skill.setdefault("certificate_name", None)
    skill.setdefault("certificate_uploaded_at", None)
    skill.setdefault("last_tested_at", None)

    best_score = skill.get("best_test_score")
    attempts = int(skill.get("test_attempts") or 0)
    if "has_certificate" in skill:
        has_certificate = bool(skill.get("has_certificate"))
    else:
        has_certificate = bool(skill.get("certificate_data"))

    if skill.get("validation_status") not in {"pending", "in_progress", "validated"}:
        if best_score == 100 and has_certificate:
            skill["validation_status"] = "validated"
        elif attempts > 0:
            skill["validation_status"] = "in_progress"
        else:
            skill["validation_status"] = "pending"

    if skill["validation_status"] == "validated":
        progress = 100
    else:
        progress = max(0, min(99, int(best_score or skill.get("test_score") or 0)))
        if attempts > 0:
            progress = max(progress, 15)

    skill["progress"] = progress
    skill["has_certificate"] = has_certificate
    skill["last_tested_at"] = to_iso_ist(skill.get("last_tested_at"))
    skill["certificate_uploaded_at"] = to_iso_ist(skill.get("certificate_uploaded_at"))
    return skill


def fetch_user_skills(conn, user_id):
    cursor = conn.cursor(dictionary=True)
    try:
        queries = [
            """
            SELECT
                id,
                skill_name,
                category,
                level,
                skill_price,
                validation_status,
                test_score,
                best_test_score,
                test_attempts,
                certificate_name,
                certificate_uploaded_at,
                last_tested_at,
                (CASE WHEN certificate_data IS NULL OR certificate_data = '' THEN 0 ELSE 1 END) AS has_certificate
            FROM skills
            WHERE user_id=%s
            ORDER BY id DESC
            """,
            """
            SELECT
                id,
                skill_name,
                category,
                level,
                validation_status,
                test_score,
                best_test_score,
                test_attempts,
                certificate_name,
                certificate_uploaded_at,
                last_tested_at,
                (CASE WHEN certificate_data IS NULL OR certificate_data = '' THEN 0 ELSE 1 END) AS has_certificate
            FROM skills
            WHERE user_id=%s
            ORDER BY id DESC
            """,
            """
            SELECT id, skill_name, category, level
            FROM skills
            WHERE user_id=%s
            ORDER BY id DESC
            """,
        ]

        rows = []
        for sql in queries:
            try:
                cursor.execute(sql, (user_id,))
                rows = cursor.fetchall() or []
                break
            except Error as err:
                if getattr(err, "errno", None) == 1054:
                    continue
                raise

        return [normalize_skill_record(row) for row in rows]
    finally:
        cursor.close()


def fetch_user_settings(conn, user_id):
    defaults = default_user_settings()
    cursor = conn.cursor(dictionary=True)
    try:
        try:
            cursor.execute("""
                SELECT timezone, language, dark_mode, notifications_json, privacy_json
                FROM user_settings
                WHERE user_id=%s
                LIMIT 1
            """, (user_id,))
            row = cursor.fetchone()
        except Error as err:
            # If settings table/columns are not migrated yet, do not block login/profile APIs.
            if getattr(err, "errno", None) in {1146, 1054}:
                return defaults
            raise

        if not row:
            return defaults

        notifications = parse_json_object(row.get("notifications_json"), defaults["notifications"])
        privacy = parse_json_object(row.get("privacy_json"), defaults["privacy"])
        return {
            "timezone": row.get("timezone") or defaults["timezone"],
            "language": row.get("language") or defaults["language"],
            "dark_mode": bool(row.get("dark_mode")),
            "notifications": notifications,
            "privacy": privacy,
        }
    finally:
        cursor.close()

def tokenize_text(value):
    return set(re.findall(r"[a-z0-9]+", (value or "").lower()))


def money_to_paise(amount):
    return int(round(float(amount) * 100))


def paise_to_money(amount):
    return round(float(amount) / 100, 2)


def compute_platform_split(gross_amount):
    gross = round(float(gross_amount), 2)
    platform_fee = round(gross * 0.10, 2)
    student_amount = round(gross - platform_fee, 2)
    return gross, platform_fee, student_amount


def razorpay_api_request(method, path, payload=None):
    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()

    if not key_id or not key_secret:
        raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required")

    url = f"https://api.razorpay.com{path}"
    auth_value = base64.b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_value}",
        "Content-Type": "application/json",
    }
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw or "{}")
    except urllib.error.HTTPError as err:
        error_raw = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Razorpay API error ({err.code}): {error_raw}")
    except urllib.error.URLError as err:
        raise RuntimeError(f"Razorpay network error: {err}")


def ensure_payments_schema(conn):
    cursor = conn.cursor()
    statements = [
        "ALTER TABLE payments ADD COLUMN client_id INT NULL",
        "ALTER TABLE payments ADD COLUMN student_id INT NULL",
        "ALTER TABLE payments ADD COLUMN gross_amount DECIMAL(10,2) NULL",
        "ALTER TABLE payments ADD COLUMN platform_fee DECIMAL(10,2) NULL",
        "ALTER TABLE payments ADD COLUMN student_amount DECIMAL(10,2) NULL",
        "ALTER TABLE payments ADD COLUMN currency VARCHAR(10) NULL DEFAULT 'INR'",
        "ALTER TABLE payments ADD COLUMN provider VARCHAR(40) NULL DEFAULT 'manual'",
        "ALTER TABLE payments ADD COLUMN gateway_order_id VARCHAR(120) NULL",
        "ALTER TABLE payments ADD COLUMN gateway_payment_id VARCHAR(120) NULL",
        "ALTER TABLE payments ADD COLUMN gateway_signature VARCHAR(255) NULL",
        "ALTER TABLE payments ADD COLUMN meta_json LONGTEXT NULL",
        "CREATE INDEX idx_payments_client ON payments(client_id)",
        "CREATE INDEX idx_payments_student ON payments(student_id)",
        "CREATE UNIQUE INDEX uq_payments_gateway_order_id ON payments(gateway_order_id)",
    ]

    try:
        for sql in statements:
            try:
                cursor.execute(sql)
            except Error as err:
                if getattr(err, "errno", None) in {1060, 1061, 1831}:
                    continue
                if "Duplicate" in str(err):
                    continue
                raise
        conn.commit()
    finally:
        cursor.close()


# ---------------- ROOT ---------------- #

@app.route('/')
def home():
    return jsonify({"message": "XSkill API running"})


# ---------------- REGISTER ---------------- #

@app.route('/api/users', methods=['POST'])
def register():
    data = get_request_data()

    required_fields = ['name', 'email', 'password', 'role']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    hashed_password = generate_password_hash(data['password'])

    try:
        cursor.execute("""
            INSERT INTO users (name, email, password, role)
            VALUES (%s,%s,%s,%s)
        """, (
            data['name'],
            data['email'],
            hashed_password,
            data['role']
        ))

        conn.commit()
        return jsonify({"message": "User registered"}), 201

    except mysql.connector.IntegrityError:
        return jsonify({"error": "Email exists"}), 409
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    finally:
        cursor.close()
        conn.close()


# ---------------- LOGIN ---------------- #

@app.route('/api/login', methods=['POST'])
def login():
    data = get_request_data()

    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    # Admin hardcoded bypass
    if data.get('email') == 'palojubhadraiah@gmail.com' and data.get('password') == 'veera2008':
        if data.get('role') != 'admin':
            return jsonify({"error": "Admin account must log in through the Admin tab."}), 403
            
        token = jwt.encode({
            "id": 999999,
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({"token": token, "user": {"id": 999999, "name": "Admin", "email": data['email'], "role": "admin"}})

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                u.id,
                u.name,
                u.email,
                u.password,
                u.role,
                u.created_at,
                p.avatar,
                p.bio,
                p.phone,
                p.website,
                p.location,
                p.skills_summary,
                p.avatar_image
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.email=%s
            LIMIT 1
        """, (data['email'],))
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({"error": "Invalid credentials"}), 401

        if user['role'] != data.get('role'):
            return jsonify({"error": f"Invalid role. This email is registered as a {user['role'].capitalize()}."}), 403

        skills = fetch_user_skills(conn, user["id"])

        user["skills"] = [skill["skill_name"] for skill in skills]
        user["skill_records"] = skills
        user["settings"] = fetch_user_settings(conn, user["id"])

        token = jwt.encode({
            "id": user["id"],
            "role": user["role"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"token": token, "user": sanitize_user(user)})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- AUTH DECORATOR ---------------- #

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        try:
            decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            request.user = decoded
        except Exception:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return wrapper


# ---------------- PROFILE ---------------- #

@app.route('/api/profile', methods=['GET', 'POST'])
@token_required
def profile():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    if request.method == 'GET':
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    p.avatar,
                    p.bio,
                    p.phone,
                    p.website,
                    p.location,
                    p.skills_summary,
                    p.avatar_image 
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = %s
            """, (request.user["id"],))
            user = cursor.fetchone()

            if not user:
                return jsonify({"error": "User not found"}), 404

            skills = fetch_user_skills(conn, request.user["id"])

            user["skills"] = [skill["skill_name"] for skill in skills]
            user["skill_records"] = skills
            user["settings"] = fetch_user_settings(conn, request.user["id"])
            return jsonify({"user": sanitize_user(user)})
        except Error as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            cursor.close()
            conn.close()

    data = get_request_data()
    cursor = conn.cursor(dictionary=True)

    try:
        if data.get("name"):
            cursor.execute(
                "UPDATE users SET name=%s WHERE id=%s",
                (data.get("name"), request.user["id"])
            )

        cursor.execute(
            "SELECT id FROM profiles WHERE user_id=%s LIMIT 1",
            (request.user["id"],)
        )
        existing_profile = cursor.fetchone()

        if existing_profile:
            cursor.execute("""
                UPDATE profiles
                SET avatar=%s, bio=%s, phone=%s, website=%s, location=%s, skills_summary=%s
                WHERE user_id=%s
            """, (
                data.get("avatar"),
                data.get("bio"),
                data.get("phone"),
                data.get("website"),
                data.get("location"),
                data.get("skills_summary"),
                request.user["id"]
            ))
        else:
            cursor.execute("""
                INSERT INTO profiles (user_id, avatar, bio, phone, website, location, skills_summary)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                request.user["id"],
                data.get("avatar"),
                data.get("bio"),
                data.get("phone"),
                data.get("website"),
                data.get("location"),
                data.get("skills_summary")
            ))

        conn.commit()
        return jsonify({"message": "Profile saved", "user_id": request.user["id"]})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- SETTINGS ---------------- #

@app.route('/api/settings', methods=['GET', 'POST'])
@token_required
def user_settings():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    if request.method == 'GET':
        try:
            settings = fetch_user_settings(conn, request.user["id"])
            return jsonify({"settings": settings})
        except Error as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()

    data = get_request_data()
    defaults = default_user_settings()
    incoming_notifications = data.get("notifications") if isinstance(data.get("notifications"), dict) else {}
    incoming_privacy = data.get("privacy") if isinstance(data.get("privacy"), dict) else {}

    notifications = dict(defaults["notifications"])
    notifications.update(incoming_notifications)
    privacy = dict(defaults["privacy"])
    privacy.update(incoming_privacy)

    timezone_value = str(data.get("timezone") or defaults["timezone"]).strip() or defaults["timezone"]
    language_value = str(data.get("language") or defaults["language"]).strip() or defaults["language"]
    dark_mode = bool(data.get("dark_mode"))

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO user_settings (
                user_id, timezone, language, dark_mode, notifications_json, privacy_json
            )
            VALUES (%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
                timezone=VALUES(timezone),
                language=VALUES(language),
                dark_mode=VALUES(dark_mode),
                notifications_json=VALUES(notifications_json),
                privacy_json=VALUES(privacy_json)
        """, (
            request.user["id"],
            timezone_value,
            language_value,
            1 if dark_mode else 0,
            json.dumps(notifications),
            json.dumps(privacy),
        ))
        conn.commit()
        return jsonify({
            "message": "Settings saved",
            "settings": {
                "timezone": timezone_value,
                "language": language_value,
                "dark_mode": dark_mode,
                "notifications": notifications,
                "privacy": privacy,
            }
        })
    except Error as e:
        if getattr(e, "errno", None) == 1146:
            return jsonify({
                "error": "Settings table missing. Run the MySQL migration SQL in Workbench for user_settings."
            }), 400
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- SKILLS ---------------- #

@app.route('/api/skills', methods=['GET', 'POST'])
@token_required
def skills():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    if request.method == 'GET':
        try:
            records = fetch_user_skills(conn, request.user["id"])
            return jsonify({"skills": records})
        except Error as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()

    data = get_request_data()

    required_fields = ["skill_name", "category", "level"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        conn.close()
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    skill_price = data.get("skill_price")
    if skill_price is not None and skill_price != "":
        try:
            skill_price = round(float(skill_price), 2)
            if skill_price < 0:
                return jsonify({"error": "skill_price cannot be negative"}), 400
        except Exception:
            return jsonify({"error": "skill_price must be a valid number"}), 400
    else:
        skill_price = None

    cursor = conn.cursor()

    try:
        try:
            cursor.execute("""
                INSERT INTO skills (user_id, skill_name, category, level, skill_price, validation_status, test_attempts)
                VALUES (%s,%s,%s,%s,%s,'pending',0)
            """, (
                request.user["id"],
                data["skill_name"],
                data["category"],
                data["level"],
                skill_price
            ))
        except Error as err:
            if getattr(err, "errno", None) == 1054:
                cursor.execute("""
                    INSERT INTO skills (user_id, skill_name, category, level)
                    VALUES (%s,%s,%s,%s)
                """, (
                    request.user["id"],
                    data["skill_name"],
                    data["category"],
                    data["level"]
                ))
            else:
                raise

        conn.commit()
        return jsonify({"message": "Skill added", "id": cursor.lastrowid}), 201
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/skills/<int:skill_id>/price', methods=['PUT'])
@token_required
def update_skill_price(skill_id):
    data = get_request_data()
    if "skill_price" not in data:
        return jsonify({"error": "skill_price is required"}), 400

    skill_price = data.get("skill_price")
    if skill_price is None or skill_price == "":
        normalized_price = None
    else:
        try:
            normalized_price = round(float(skill_price), 2)
            if normalized_price < 0:
                return jsonify({"error": "skill_price cannot be negative"}), 400
        except Exception:
            return jsonify({"error": "skill_price must be a valid number"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            UPDATE skills
            SET skill_price=%s
            WHERE id=%s AND user_id=%s
        """, (normalized_price, skill_id, request.user["id"]))

        if cursor.rowcount == 0:
            return jsonify({"error": "Skill not found"}), 404
        conn.commit()

        updated = None
        for skill in fetch_user_skills(conn, request.user["id"]):
            if int(skill.get("id") or 0) == skill_id:
                updated = skill
                break
        if not updated:
            return jsonify({"error": "Skill not found after update"}), 404
        return jsonify({"message": "Skill price updated", "skill": updated})
    except Error as e:
        if getattr(e, "errno", None) == 1054:
            return jsonify({"error": "skill_price column is missing in DB. Please run ALTER TABLE skills ADD COLUMN skill_price DECIMAL(10,2) NULL;"}), 400
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/skills/<int:skill_id>/test-result', methods=['POST'])
@token_required
def save_skill_test_result(skill_id):
    data = get_request_data()
    score = data.get("score")

    try:
        score = int(score)
    except Exception:
        return jsonify({"error": "score must be an integer from 0 to 100"}), 400

    if score < 0 or score > 100:
        return jsonify({"error": "score must be between 0 and 100"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                id,
                user_id,
                skill_name,
                category,
                level,
                skill_price,
                validation_status,
                test_score,
                best_test_score,
                test_attempts,
                certificate_name,
                certificate_uploaded_at,
                last_tested_at,
                certificate_data
            FROM skills
            WHERE id=%s AND user_id=%s
            LIMIT 1
        """, (skill_id, request.user["id"]))
        skill = cursor.fetchone()

        if not skill:
            return jsonify({"error": "Skill not found"}), 404

        previous_best = skill.get("best_test_score")
        new_best = score if previous_best is None else max(int(previous_best), score)
        has_certificate = bool(skill.get("certificate_data"))
        next_status = "validated" if (new_best == 100 and has_certificate) else "in_progress"

        cursor.execute("""
            UPDATE skills
            SET
                test_score=%s,
                best_test_score=%s,
                test_attempts=COALESCE(test_attempts, 0) + 1,
                validation_status=%s,
                last_tested_at=UTC_TIMESTAMP()
            WHERE id=%s AND user_id=%s
        """, (score, new_best, next_status, skill_id, request.user["id"]))
        conn.commit()

        cursor.execute("""
            SELECT
                id,
                skill_name,
                category,
                level,
                skill_price,
                validation_status,
                test_score,
                best_test_score,
                test_attempts,
                certificate_name,
                certificate_uploaded_at,
                last_tested_at,
                (CASE WHEN certificate_data IS NULL OR certificate_data = '' THEN 0 ELSE 1 END) AS has_certificate
            FROM skills
            WHERE id=%s AND user_id=%s
            LIMIT 1
        """, (skill_id, request.user["id"]))
        updated = normalize_skill_record(cursor.fetchone())
        return jsonify({"message": "Test result saved", "skill": updated})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/skills/<int:skill_id>/certificate', methods=['POST'])
@token_required
def upload_skill_certificate(skill_id):
    data = get_request_data()
    certificate_name = (data.get("certificate_name") or "").strip()
    certificate_data = (data.get("certificate_data") or "").strip()

    if not certificate_name:
        return jsonify({"error": "certificate_name is required"}), 400
    if not certificate_data:
        return jsonify({"error": "certificate_data is required"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, user_id, best_test_score
            FROM skills
            WHERE id=%s AND user_id=%s
            LIMIT 1
        """, (skill_id, request.user["id"]))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Skill not found"}), 404

        best_score = int(row.get("best_test_score") or 0)
        next_status = "validated" if best_score == 100 else "in_progress"

        cursor.execute("""
            UPDATE skills
            SET
                certificate_name=%s,
                certificate_data=%s,
                certificate_uploaded_at=UTC_TIMESTAMP(),
                validation_status=%s
            WHERE id=%s AND user_id=%s
        """, (certificate_name, certificate_data, next_status, skill_id, request.user["id"]))
        conn.commit()

        cursor.execute("""
            SELECT
                id,
                skill_name,
                category,
                level,
                skill_price,
                validation_status,
                test_score,
                best_test_score,
                test_attempts,
                certificate_name,
                certificate_uploaded_at,
                last_tested_at,
                (CASE WHEN certificate_data IS NULL OR certificate_data = '' THEN 0 ELSE 1 END) AS has_certificate
            FROM skills
            WHERE id=%s AND user_id=%s
            LIMIT 1
        """, (skill_id, request.user["id"]))
        updated = normalize_skill_record(cursor.fetchone())
        return jsonify({"message": "Certificate uploaded", "skill": updated})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
@token_required
def delete_skill(skill_id):
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM skills WHERE id=%s AND user_id=%s",
            (skill_id, request.user["id"])
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Skill not found"}), 404

        conn.commit()
        return jsonify({"message": "Skill removed"})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- CREATE TRIAL ---------------- #

@app.route('/api/trials', methods=['GET', 'POST'])
@token_required
def create_trial():
    if request.method == 'GET':
        conn = create_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor(dictionary=True)

        try:
            if request.user["role"] == "client":
                cursor.execute("""
                    SELECT
                        t.id,
                        t.client_id,
                        t.seller_id,
                        t.task_description,
                        t.status,
                        t.submission_file,
                        t.created_at,
                        t.updated_at,
                        seller.name AS student_name,
                        seller.email AS student_email,
                        seller_profile.avatar AS student_avatar,
                        client.name AS client_name,
                        client_profile.avatar AS client_avatar,
                        seller_profile.skills_summary AS student_skills_summary
                    FROM trials t
                    JOIN users seller ON seller.id = t.seller_id
                    JOIN users client ON client.id = t.client_id
                    LEFT JOIN profiles seller_profile ON seller_profile.user_id = seller.id
                    LEFT JOIN profiles client_profile ON client_profile.user_id = client.id
                    WHERE t.client_id = %s
                    ORDER BY t.updated_at DESC, t.id DESC
                """, (request.user["id"],))
            else:
                cursor.execute("""
                    SELECT
                        t.id,
                        t.client_id,
                        t.seller_id,
                        t.task_description,
                        t.status,
                        t.submission_file,
                        t.created_at,
                        t.updated_at,
                        seller.name AS student_name,
                        seller.email AS student_email,
                        seller_profile.avatar AS student_avatar,
                        client.name AS client_name,
                        client_profile.avatar AS client_avatar,
                        seller_profile.skills_summary AS student_skills_summary
                    FROM trials t
                    JOIN users seller ON seller.id = t.seller_id
                    JOIN users client ON client.id = t.client_id
                    LEFT JOIN profiles seller_profile ON seller_profile.user_id = seller.id
                    LEFT JOIN profiles client_profile ON client_profile.user_id = client.id
                    WHERE t.seller_id = %s
                    ORDER BY t.updated_at DESC, t.id DESC
                """, (request.user["id"],))

            return jsonify({"trials": cursor.fetchall()})
        except Error as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            cursor.close()
            conn.close()

    data = get_request_data()

    if request.user.get("role") != "client":
        return jsonify({"error": "Only client accounts can create trial requests"}), 403

    required_fields = ["seller_id", "task_description"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT id, role FROM users WHERE id=%s LIMIT 1",
            (data["seller_id"],)
        )
        seller = cursor.fetchone()

        if not seller:
            return jsonify({"error": "Selected student not found"}), 404

        if seller[1] != "student":
            return jsonify({"error": "Trial requests can only be sent to student accounts"}), 400

        cursor.execute("""
            INSERT INTO trials (client_id, seller_id, task_description)
            VALUES (%s,%s,%s)
        """, (
            request.user["id"],
            data["seller_id"],
            data["task_description"]
        ))

        conn.commit()
        return jsonify({
            "message": "Trial created",
            "id": cursor.lastrowid,
            "trial": {
                "id": cursor.lastrowid,
                "client_id": request.user["id"],
                "seller_id": data["seller_id"],
                "task_description": data["task_description"],
                "status": "Pending"
            }
        }), 201
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- SUBMIT TRIAL ---------------- #

@app.route('/api/trials/submit/<int:trial_id>', methods=['POST'])
@token_required
def submit_trial(trial_id):
    data = request.get_json()

    conn = create_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE trials
        SET submission_file=%s, status='Submitted'
        WHERE id=%s
    """, (data["submission_file"], trial_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Trial submitted"})


@app.route('/api/trials/<int:trial_id>/status', methods=['PATCH'])
@token_required
def update_trial_status(trial_id):
    data = get_request_data()
    next_status = data.get("status")

    if next_status not in {"Submitted", "In Progress", "Approved"}:
        return jsonify({"error": "Invalid status"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, client_id, seller_id, status FROM trials WHERE id=%s LIMIT 1",
            (trial_id,)
        )
        trial = cursor.fetchone()

        if not trial:
            return jsonify({"error": "Trial not found"}), 404

        if request.user["role"] == "student" and trial["seller_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to update this trial"}), 403

        if request.user["role"] == "client" and trial["client_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to update this trial"}), 403

        cursor.execute(
            "UPDATE trials SET status=%s WHERE id=%s",
            (next_status, trial_id)
        )
        conn.commit()

        return jsonify({"message": "Trial status updated", "status": next_status})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/trials/<int:trial_id>', methods=['DELETE'])
@token_required
def delete_trial(trial_id):
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, client_id, seller_id, status FROM trials WHERE id=%s LIMIT 1",
            (trial_id,)
        )
        trial = cursor.fetchone()

        if not trial:
            return jsonify({"error": "Trial not found"}), 404

        if request.user["role"] == "student" and trial["seller_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to decline this trial"}), 403

        if request.user["role"] == "client" and trial["client_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to cancel this trial"}), 403

        cursor.execute("DELETE FROM trials WHERE id=%s", (trial_id,))
        conn.commit()

        return jsonify({"message": "Trial removed"})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- MESSAGES ---------------- #

@app.route('/api/contacts', methods=['GET'])
@token_required
def contacts():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        target_role = request.args.get("role")

        if not target_role:
            if request.user["role"] == "student":
                target_role = "client"
            elif request.user["role"] == "client":
                target_role = "student"

        if target_role:
            cursor.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    p.avatar
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id != %s AND u.role = %s
                ORDER BY u.name ASC
            """, (request.user["id"], target_role))
        else:
            cursor.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    p.avatar
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id != %s
                ORDER BY u.name ASC
            """, (request.user["id"],))

        return jsonify({"contacts": cursor.fetchall()})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/students', methods=['GET'])
@token_required
def list_students():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                p.avatar,
                p.bio,
                p.location,
                p.skills_summary
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.role = 'student'
            ORDER BY u.created_at DESC
        """)
        students = cursor.fetchall()

        skills_cursor = conn.cursor(dictionary=True)
        try:
            skills_cursor.execute("""
                SELECT user_id, skill_name, category, level
                FROM skills
                ORDER BY id DESC
            """)
            skill_rows = skills_cursor.fetchall()
        finally:
            skills_cursor.close()

        skills_by_user = {}
        for row in skill_rows:
            user_skills = skills_by_user.setdefault(row["user_id"], [])
            user_skills.append(row)

        response = []
        for student in students:
            skill_records = skills_by_user.get(student["id"], [])
            skills = [row["skill_name"] for row in skill_records]
            response.append({
                "id": student["id"],
                "name": student["name"],
                "email": student["email"],
                "avatar": student.get("avatar"),
                "location": student.get("location") or "Location not added",
                "title": (skills[0] if skills else "Student Freelancer"),
                "skills": skills,
                "bio": student.get("bio") or "This student has not added a bio yet.",
                "available": True,
                "experience": f"{max(len(skill_records), 1)} validated skill{'s' if len(skill_records) != 1 else ''}",
                "languages": ["English"],
                "responseTime": "< 1 day",
                "completedTrials": len(skill_records),
                "hourlyRate": 25 + (len(skill_records) * 5),
                "rating": round(min(5.0, 4.2 + (len(skill_records) * 0.1)), 1),
            })

        return jsonify({"students": response})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/students/recommendations', methods=['POST'])
@token_required
def recommend_students():
    if request.user.get("role") not in {"client", "admin"}:
        return jsonify({"error": "Only client or admin accounts can use smart recommendations"}), 403

    data = get_request_data()
    requirement = (data.get("requirement") or "").strip()
    limit = data.get("limit", 5)

    if not requirement:
        return jsonify({"error": "requirement is required"}), 400

    try:
        limit = max(1, min(int(limit), 10))
    except Exception:
        limit = 5

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                u.id,
                u.name,
                u.email,
                p.avatar,
                p.bio,
                p.location,
                p.skills_summary
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.role='student'
            ORDER BY u.created_at DESC
        """)
        students = cursor.fetchall()

        skills_cursor = conn.cursor(dictionary=True)
        try:
            skills_cursor.execute("""
                SELECT user_id, skill_name, category, level
                FROM skills
                ORDER BY id DESC
            """)
            skill_rows = skills_cursor.fetchall()
        finally:
            skills_cursor.close()

        skills_by_user = {}
        for row in skill_rows:
            skills_by_user.setdefault(row["user_id"], []).append(row)

        need_tokens = tokenize_text(requirement)
        ranked = []

        for student in students:
            student_skill_rows = skills_by_user.get(student["id"], [])
            skill_names = [row["skill_name"] for row in student_skill_rows]

            base_text = " ".join([
                student.get("name") or "",
                student.get("bio") or "",
                student.get("skills_summary") or "",
                " ".join(skill_names),
            ])
            student_tokens = tokenize_text(base_text)
            overlap = need_tokens.intersection(student_tokens)

            overlap_score = len(overlap) * 12
            profile_bonus = min(len(skill_names), 8) * 3
            quality_bonus = min(len(student_skill_rows), 15) * 2
            total_score = overlap_score + profile_bonus + quality_bonus

            ranked.append({
                "id": student["id"],
                "name": student["name"],
                "email": student["email"],
                "avatar": student.get("avatar"),
                "location": student.get("location") or "Location not added",
                "bio": student.get("bio") or "This student has not added a bio yet.",
                "skills": skill_names,
                "score": total_score,
                "reason": (
                    f"Matched {len(overlap)} requirement keywords"
                    + (f": {', '.join(sorted(list(overlap))[:4])}" if overlap else "")
                ),
            })

        ranked.sort(key=lambda row: row["score"], reverse=True)
        return jsonify({
            "requirement": requirement,
            "recommendations": ranked[:limit],
        })
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/messages', methods=['GET', 'POST'])
@token_required
def send_message():
    if request.method == 'GET':
        other_user_id = request.args.get("user_id", type=int)
        trial_id = request.args.get("trial_id", type=int)

        if not other_user_id and not trial_id:
            return jsonify({"error": "user_id or trial_id is required"}), 400

        conn = create_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor(dictionary=True)

        try:
            ensure_messages_schema(conn)

            if trial_id:
                cursor.execute("""
                    UPDATE messages
                    SET seen_at = UTC_TIMESTAMP()
                    WHERE trial_id=%s AND receiver_id=%s AND sender_id<>%s AND seen_at IS NULL
                """, (trial_id, request.user["id"], request.user["id"]))
            else:
                cursor.execute("""
                    UPDATE messages
                    SET seen_at = UTC_TIMESTAMP()
                    WHERE sender_id=%s AND receiver_id=%s AND seen_at IS NULL
                """, (other_user_id, request.user["id"]))

            if trial_id:
                cursor.execute("""
                    SELECT id, sender_id, receiver_id, trial_id, message, created_at, edited_at, seen_at
                    FROM messages
                    WHERE trial_id=%s
                    ORDER BY created_at ASC, id ASC
                """, (trial_id,))
            else:
                cursor.execute("""
                    SELECT id, sender_id, receiver_id, trial_id, message, created_at, edited_at, seen_at
                    FROM messages
                    WHERE
                        (sender_id=%s AND receiver_id=%s)
                        OR
                        (sender_id=%s AND receiver_id=%s)
                    ORDER BY created_at ASC, id ASC
                """, (
                    request.user["id"],
                    other_user_id,
                    other_user_id,
                    request.user["id"]
                ))

            messages = [normalize_message_record(row) for row in cursor.fetchall()]
            return jsonify({"messages": messages})
        except Error as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            cursor.close()
            conn.close()

    data = request.get_json()

    conn = create_db_connection()
    cursor = conn.cursor()

    try:
        ensure_messages_schema(conn)
        cursor.execute("""
            INSERT INTO messages (sender_id, receiver_id, trial_id, message)
            VALUES (%s,%s,%s,%s)
        """, (
            request.user["id"],
            data["receiver_id"],
            data.get("trial_id"),
            data["message"]
        ))

        conn.commit()
        created_message_id = cursor.lastrowid
        created_at_value = None
        edited_at_value = None
        seen_at_value = None

        read_cursor = conn.cursor(dictionary=True)
        try:
            read_cursor.execute("SELECT created_at, edited_at, seen_at FROM messages WHERE id=%s", (created_message_id,))
            created_row = read_cursor.fetchone()
            if isinstance(created_row, dict):
                created_at_value = created_row.get("created_at")
                edited_at_value = created_row.get("edited_at")
                seen_at_value = created_row.get("seen_at")
            elif isinstance(created_row, (list, tuple)) and created_row:
                created_at_value = created_row[0]
                if len(created_row) > 1:
                    edited_at_value = created_row[1]
                if len(created_row) > 2:
                    seen_at_value = created_row[2]
        finally:
            read_cursor.close()

        payload = {
            "id": created_message_id,
            "sender_id": request.user["id"],
            "receiver_id": data["receiver_id"],
            "trial_id": data.get("trial_id"),
            "message": data["message"],
            "created_at": to_iso_ist(created_at_value) or to_iso_ist(utc_now_iso()),
            "edited_at": to_iso_ist(edited_at_value),
            "seen_at": to_iso_ist(seen_at_value),
        }

        socketio.emit("receive_message", payload, room=f"user_{request.user['id']}")
        socketio.emit("receive_message", payload, room=f"user_{data['receiver_id']}")

        return jsonify({"message": "Message sent", "data": payload})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@socketio.on("join")
def handle_join(data):
    token = (data or {}).get("token")
    decoded = decode_auth_token(token)

    if not decoded:
        emit("socket_error", {"error": "Invalid token"})
        return

    join_room(f"user_{decoded['id']}")
    emit("joined", {"user_id": decoded["id"]})


@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("send_message")
def handle_socket_message(data):
    token = (data or {}).get("token")
    decoded = decode_auth_token(token)

    if not decoded:
        emit("socket_error", {"error": "Invalid token"})
        return

    receiver_id = data.get("receiver_id")
    message_text = (data.get("message") or "").strip()
    trial_id = data.get("trial_id")

    if not receiver_id or not message_text:
        emit("socket_error", {"error": "receiver_id and message are required"})
        return

    conn = create_db_connection()
    if not conn:
        emit("socket_error", {"error": "Database connection failed"})
        return

    cursor = conn.cursor()

    try:
        ensure_messages_schema(conn)
        cursor.execute("""
            INSERT INTO messages (sender_id, receiver_id, trial_id, message)
            VALUES (%s,%s,%s,%s)
        """, (
            decoded["id"],
            receiver_id,
            trial_id,
            message_text
        ))

        conn.commit()
        created_message_id = cursor.lastrowid
        created_at_value = None
        edited_at_value = None
        seen_at_value = None

        read_cursor = conn.cursor(dictionary=True)
        try:
            read_cursor.execute("SELECT created_at, edited_at, seen_at FROM messages WHERE id=%s", (created_message_id,))
            created_row = read_cursor.fetchone()
            if isinstance(created_row, dict):
                created_at_value = created_row.get("created_at")
                edited_at_value = created_row.get("edited_at")
                seen_at_value = created_row.get("seen_at")
            elif isinstance(created_row, (list, tuple)) and created_row:
                created_at_value = created_row[0]
                if len(created_row) > 1:
                    edited_at_value = created_row[1]
                if len(created_row) > 2:
                    seen_at_value = created_row[2]
        finally:
            read_cursor.close()

        payload = {
            "id": created_message_id,
            "sender_id": decoded["id"],
            "receiver_id": receiver_id,
            "trial_id": trial_id,
            "message": message_text,
            "created_at": to_iso_ist(created_at_value) or to_iso_ist(utc_now_iso()),
            "edited_at": to_iso_ist(edited_at_value),
            "seen_at": to_iso_ist(seen_at_value),
        }

        emit("receive_message", payload, room=f"user_{decoded['id']}")
        emit("receive_message", payload, room=f"user_{receiver_id}")
    except Error as e:
        emit("socket_error", {"error": f"Database error: {str(e)}"})
    except Exception as e:
        emit("socket_error", {"error": f"Unexpected server error: {str(e)}"})
    finally:
        cursor.close()
        conn.close()


@socketio.on("call_user")
def handle_call_user(data):
    token = (data or {}).get("token")
    decoded = decode_auth_token(token)

    if not decoded:
        emit("socket_error", {"error": "Invalid token"})
        return

    to_user_id = data.get("to")
    channel = (data.get("channel") or "").strip()

    if not to_user_id or not channel:
        emit("socket_error", {"error": "to and channel are required"})
        return

    emit(
        "incoming_call",
        {
            "from": decoded["id"],
            "to": to_user_id,
            "channel": channel,
        },
        room=f"user_{to_user_id}"
    )


@app.route('/api/messages/<int:message_id>', methods=['PUT', 'DELETE'])
@token_required
def update_or_delete_message(message_id):
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        ensure_messages_schema(conn)

        cursor.execute("""
            SELECT id, sender_id, receiver_id, trial_id, message, created_at, edited_at, seen_at
            FROM messages
            WHERE id=%s
            LIMIT 1
        """, (message_id,))
        message_row = cursor.fetchone()

        if not message_row:
            return jsonify({"error": "Message not found"}), 404
        if message_row["sender_id"] != request.user["id"]:
            return jsonify({"error": "You can only modify your own messages"}), 403

        if request.method == 'PUT':
            data = get_request_data()
            next_text = (data.get("message") or "").strip()
            if not next_text:
                return jsonify({"error": "message is required"}), 400

            cursor.execute("""
                UPDATE messages
                SET message=%s, edited_at=UTC_TIMESTAMP()
                WHERE id=%s
            """, (next_text, message_id))
            conn.commit()

            cursor.execute("""
                SELECT id, sender_id, receiver_id, trial_id, message, created_at, edited_at, seen_at
                FROM messages
                WHERE id=%s
                LIMIT 1
            """, (message_id,))
            updated_row = cursor.fetchone()
            return jsonify({"message": "Message updated", "data": normalize_message_record(updated_row)})

        if message_row.get("seen_at"):
            return jsonify({"error": "Cannot delete after the other member has seen this message"}), 400

        cursor.execute("DELETE FROM messages WHERE id=%s", (message_id,))
        conn.commit()
        return jsonify({"message": "Message deleted", "id": message_id})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/messages/unread-summary', methods=['GET'])
@token_required
def unread_messages_summary():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        ensure_messages_schema(conn)
        cursor.execute("""
            SELECT sender_id, COUNT(*) AS unread_count
            FROM messages
            WHERE receiver_id=%s AND seen_at IS NULL
            GROUP BY sender_id
        """, (request.user["id"],))
        rows = cursor.fetchall() or []
        total_unread = sum(int(row.get("unread_count") or 0) for row in rows)
        return jsonify({
            "total_unread": total_unread,
            "by_sender": [
                {
                    "sender_id": int(row.get("sender_id")),
                    "unread_count": int(row.get("unread_count") or 0),
                }
                for row in rows
            ],
        })
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- PAYMENTS ---------------- #

@app.route('/api/payments/create-order', methods=['POST'])
@token_required
def create_payment_order():
    if request.user.get("role") != "client":
        return jsonify({"error": "Only client accounts can create payments"}), 403

    data = get_request_data()
    trial_id = data.get("trial_id")
    amount = data.get("amount")

    if not trial_id or amount is None:
        return jsonify({"error": "trial_id and amount are required"}), 400

    try:
        trial_id = int(trial_id)
        gross_amount = round(float(amount), 2)
    except Exception:
        return jsonify({"error": "Invalid trial_id or amount"}), 400

    if gross_amount <= 0:
        return jsonify({"error": "Amount must be greater than 0"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        ensure_payments_schema(conn)

        cursor.execute("""
            SELECT id, client_id, seller_id, status
            FROM trials
            WHERE id=%s
            LIMIT 1
        """, (trial_id,))
        trial = cursor.fetchone()

        if not trial:
            return jsonify({"error": "Trial not found"}), 404
        if trial["client_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to pay for this trial"}), 403
        if trial["status"] not in {"Submitted", "Approved", "In Progress"}:
            return jsonify({"error": "Trial must be in progress, submitted, or approved before payment"}), 400

        gross_amount, platform_fee, student_amount = compute_platform_split(gross_amount)
        receipt = f"xskill_trial_{trial_id}_{int(datetime.datetime.utcnow().timestamp())}"

        order = razorpay_api_request("POST", "/v1/orders", {
            "amount": money_to_paise(gross_amount),
            "currency": "INR",
            "receipt": receipt,
            "notes": {
                "trial_id": str(trial_id),
                "client_id": str(request.user["id"]),
                "student_id": str(trial["seller_id"]),
            }
        })

        gateway_order_id = order.get("id")
        if not gateway_order_id:
            return jsonify({"error": "Failed to create UPI order"}), 500

        cursor.execute("""
            INSERT INTO payments (
                trial_id,
                client_id,
                student_id,
                amount,
                gross_amount,
                platform_fee,
                student_amount,
                status,
                payment_method,
                gateway_order_id,
                currency,
                provider,
                meta_json
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,'Pending','upi',%s,'INR','razorpay',%s)
        """, (
            trial_id,
            request.user["id"],
            trial["seller_id"],
            gross_amount,
            gross_amount,
            platform_fee,
            student_amount,
            gateway_order_id,
            json.dumps({"receipt": receipt})
        ))
        conn.commit()

        return jsonify({
            "message": "UPI order created",
            "payment": {
                "id": cursor.lastrowid,
                "trial_id": trial_id,
                "gross_amount": gross_amount,
                "platform_fee": platform_fee,
                "student_amount": student_amount,
                "gateway_order_id": gateway_order_id,
                "currency": order.get("currency", "INR"),
            },
            "gateway": {
                "provider": "razorpay",
                "key_id": (os.getenv("RAZORPAY_KEY_ID") or "").strip(),
                "order_id": gateway_order_id,
                "amount": order.get("amount", money_to_paise(gross_amount)),
                "currency": order.get("currency", "INR"),
                "method": "upi",
            }
        })
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/payments/verify', methods=['POST'])
@token_required
def verify_upi_payment():
    if request.user.get("role") != "client":
        return jsonify({"error": "Only client accounts can verify payments"}), 403

    data = get_request_data()
    gateway_order_id = (data.get("order_id") or "").strip()
    gateway_payment_id = (data.get("payment_id") or "").strip()
    gateway_signature = (data.get("signature") or "").strip()

    if not gateway_order_id or not gateway_payment_id or not gateway_signature:
        return jsonify({"error": "order_id, payment_id, and signature are required"}), 400

    secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    if not secret:
        return jsonify({"error": "RAZORPAY_KEY_SECRET is not configured"}), 500

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        f"{gateway_order_id}|{gateway_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, gateway_signature):
        return jsonify({"error": "Invalid payment signature"}), 400

    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        ensure_payments_schema(conn)

        cursor.execute("""
            SELECT id, trial_id, client_id, student_id, status
            FROM payments
            WHERE gateway_order_id=%s
            LIMIT 1
        """, (gateway_order_id,))
        payment_row = cursor.fetchone()

        if not payment_row:
            return jsonify({"error": "Payment record not found for this order"}), 404
        if payment_row["client_id"] != request.user["id"]:
            return jsonify({"error": "Not allowed to verify this payment"}), 403
        if payment_row["status"] == "Paid":
            return jsonify({"message": "Payment already verified", "status": "Paid"})

        gateway_payment = razorpay_api_request("GET", f"/v1/payments/{gateway_payment_id}")
        if (gateway_payment.get("method") or "").lower() != "upi":
            return jsonify({"error": "Only UPI payments are accepted"}), 400

        if gateway_payment.get("status") not in {"captured", "authorized"}:
            return jsonify({"error": "Payment is not successful yet"}), 400

        cursor.execute("""
            UPDATE payments
            SET
                status='Paid',
                payment_method='upi',
                gateway_payment_id=%s,
                gateway_signature=%s,
                provider='razorpay',
                meta_json=%s,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
        """, (
            gateway_payment_id,
            gateway_signature,
            json.dumps(gateway_payment),
            payment_row["id"]
        ))
        conn.commit()

        return jsonify({
            "message": "Payment verified",
            "payment": {
                "id": payment_row["id"],
                "trial_id": payment_row["trial_id"],
                "status": "Paid",
                "method": "upi",
            }
        })
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/payments/summary', methods=['GET'])
@token_required
def payment_summary():
    conn = create_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        ensure_payments_schema(conn)

        user_id = request.user["id"]
        role = request.user.get("role")

        base_query = """
            SELECT
                p.id,
                p.trial_id,
                p.status,
                p.payment_method,
                p.created_at,
                COALESCE(p.gross_amount, p.amount, 0) AS gross_amount,
                COALESCE(p.platform_fee, 0) AS platform_fee,
                COALESCE(p.student_amount, COALESCE(p.gross_amount, p.amount, 0) - COALESCE(p.platform_fee, 0)) AS student_amount,
                c.name AS client_name,
                s.name AS student_name
            FROM payments p
            LEFT JOIN users c ON c.id = p.client_id
            LEFT JOIN users s ON s.id = p.student_id
        """

        where_clause = ""
        params = ()
        if role == "client":
            where_clause = " WHERE p.client_id = %s "
            params = (user_id,)
        elif role == "student":
            where_clause = " WHERE p.student_id = %s "
            params = (user_id,)
        else:
            where_clause = ""
            params = ()

        cursor.execute(base_query + where_clause + " ORDER BY p.created_at DESC, p.id DESC", params)
        rows = cursor.fetchall()

        paid_rows = [row for row in rows if row["status"] == "Paid"]
        pending_rows = [row for row in rows if row["status"] == "Pending"]

        if role == "client":
            total_expense = round(sum(float(row["gross_amount"]) for row in paid_rows), 2)
            platform_fees = round(sum(float(row["platform_fee"]) for row in paid_rows), 2)
            total_to_students = round(sum(float(row["student_amount"]) for row in paid_rows), 2)
            pending_amount = round(sum(float(row["gross_amount"]) for row in pending_rows), 2)
            summary = {
                "role": "client",
                "currency": "INR",
                "total_expense": total_expense,
                "platform_fees_paid": platform_fees,
                "paid_to_students": total_to_students,
                "pending_amount": pending_amount,
            }
        elif role == "student":
            total_income = round(sum(float(row["student_amount"]) for row in paid_rows), 2)
            gross_received = round(sum(float(row["gross_amount"]) for row in paid_rows), 2)
            platform_fees = round(sum(float(row["platform_fee"]) for row in paid_rows), 2)
            pending_income = round(sum(float(row["student_amount"]) for row in pending_rows), 2)
            summary = {
                "role": "student",
                "currency": "INR",
                "total_income": total_income,
                "gross_received": gross_received,
                "platform_fees_deducted": platform_fees,
                "pending_income": pending_income,
            }
        else:
            summary = {
                "role": role,
                "currency": "INR",
                "platform_revenue": round(sum(float(row["platform_fee"]) for row in paid_rows), 2),
                "total_volume": round(sum(float(row["gross_amount"]) for row in paid_rows), 2),
            }

        transactions = []
        for row in rows:
            transactions.append({
                "id": row["id"],
                "trial_id": row["trial_id"],
                "status": row["status"].lower(),
                "method": (row.get("payment_method") or "upi").lower(),
                "date": to_iso_utc(row["created_at"]),
                "gross_amount": round(float(row["gross_amount"]), 2),
                "platform_fee": round(float(row["platform_fee"]), 2),
                "student_amount": round(float(row["student_amount"]), 2),
                "client_name": row.get("client_name"),
                "student_name": row.get("student_name"),
            })

        return jsonify({"summary": summary, "transactions": transactions})
    except Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------- REVIEWS ---------------- #

@app.route('/api/reviews', methods=['POST'])
@token_required
def add_review():
    data = request.get_json()

    conn = create_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO reviews (trial_id, reviewer_id, rating, comment)
        VALUES (%s,%s,%s,%s)
    """, (
        data["trial_id"],
        request.user["id"],
        data["rating"],
        data["comment"]
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Review added"})


# ---------------- RUN SERVER ---------------- #

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", debug=True, port=5001)
