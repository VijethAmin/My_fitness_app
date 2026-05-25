import copy
import hashlib
import json
import os
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, TypedDict

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(title="AI Fitness Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.(vercel|netlify)\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Goal = Literal["Muscle Gain", "Fat Loss", "Maintenance"]
Diet = Literal["Vegetarian", "Non-Vegetarian"]
WorkoutPlace = Literal["Gym", "Home"]
Role = Literal["admin", "user"]

DATA_FILE = Path(__file__).resolve().parent / "data" / "store.json"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@fitness.local").lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


class FitnessInput(BaseModel):
    user_id: str | None = None
    age: int = Field(..., ge=13, le=100)
    weight: float = Field(..., gt=20, le=300)
    height: float = Field(..., gt=100, le=250)
    goal: Goal
    diet: Diet
    workout_place: WorkoutPlace


class LoginInput(BaseModel):
    role: Role
    name: str = Field(default="", max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=120)


class WorkoutDayModel(BaseModel):
    focus: str
    exercises: list[str]


class AdminPlanUpdate(BaseModel):
    workout_plan: dict[str, WorkoutDayModel]
    meal_plan: dict[str, str]
    notes: list[str]


class WorkoutDay(TypedDict):
    focus: str
    exercises: list[str]


WORKOUT_PLANS: dict[WorkoutPlace, dict[Goal, dict[str, WorkoutDay]]] = {
    "Gym": {
        "Muscle Gain": {
            "Monday": {
                "focus": "Chest and triceps",
                "exercises": ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Triceps Pushdown"],
            },
            "Tuesday": {
                "focus": "Back and biceps",
                "exercises": ["Lat Pulldown", "Seated Row", "One-Arm Dumbbell Row", "Biceps Curl"],
            },
            "Wednesday": {
                "focus": "Legs",
                "exercises": ["Squat", "Leg Press", "Walking Lunge", "Hamstring Curl"],
            },
            "Thursday": {
                "focus": "Shoulders and core",
                "exercises": ["Shoulder Press", "Lateral Raise", "Face Pull", "Plank"],
            },
            "Friday": {
                "focus": "Full-body strength",
                "exercises": ["Deadlift", "Chest Press", "Goblet Squat", "Farmer Carry"],
            },
            "Saturday": {
                "focus": "Cardio and mobility",
                "exercises": ["Treadmill Walk", "Cycling", "Hip Mobility", "Foam Rolling"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest", "Light Stretching"]},
        },
        "Fat Loss": {
            "Monday": {
                "focus": "Full-body circuit",
                "exercises": ["Chest Press", "Leg Press", "Lat Pulldown", "Incline Treadmill Walk"],
            },
            "Tuesday": {
                "focus": "Upper body and intervals",
                "exercises": ["Push-ups", "Seated Row", "Dumbbell Press", "Battle Ropes"],
            },
            "Wednesday": {
                "focus": "Core and cardio",
                "exercises": ["Plank", "Russian Twist", "Cable Crunch", "Elliptical"],
            },
            "Thursday": {
                "focus": "Lower body",
                "exercises": ["Squat", "Romanian Deadlift", "Step-up", "Sled Push"],
            },
            "Friday": {
                "focus": "HIIT",
                "exercises": ["Burpees", "Kettlebell Swing", "Mountain Climbers", "Rowing Machine"],
            },
            "Saturday": {
                "focus": "Low-intensity cardio",
                "exercises": ["Brisk Walk", "Cycling", "Swimming", "Stretching"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest", "Easy Walk"]},
        },
        "Maintenance": {
            "Monday": {
                "focus": "Push strength",
                "exercises": ["Bench Press", "Shoulder Press", "Chest Fly", "Triceps Extension"],
            },
            "Tuesday": {
                "focus": "Pull strength",
                "exercises": ["Pull-up", "Lat Pulldown", "Seated Row", "Hammer Curl"],
            },
            "Wednesday": {
                "focus": "Zone 2 cardio",
                "exercises": ["Treadmill Walk", "Cycling", "Mobility Flow"],
            },
            "Thursday": {
                "focus": "Lower body strength",
                "exercises": ["Squat", "Leg Press", "Calf Raise", "Hamstring Curl"],
            },
            "Friday": {
                "focus": "Full-body accessories",
                "exercises": ["Chest Press", "Cable Row", "Lunge", "Plank"],
            },
            "Saturday": {
                "focus": "Active recovery",
                "exercises": ["Walking", "Swimming", "Yoga", "Stretching"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest"]},
        },
    },
    "Home": {
        "Muscle Gain": {
            "Monday": {
                "focus": "Chest and triceps",
                "exercises": ["Push-ups", "Decline Push-ups", "Chair Dips", "Diamond Push-ups"],
            },
            "Tuesday": {
                "focus": "Back and biceps",
                "exercises": ["Pull-ups", "Resistance Band Row", "Band Curl", "Reverse Snow Angel"],
            },
            "Wednesday": {
                "focus": "Legs",
                "exercises": ["Bodyweight Squat", "Bulgarian Split Squat", "Glute Bridge", "Calf Raise"],
            },
            "Thursday": {
                "focus": "Shoulders and core",
                "exercises": ["Pike Push-ups", "Band Lateral Raise", "Plank", "Dead Bug"],
            },
            "Friday": {
                "focus": "Full-body strength",
                "exercises": ["Push-ups", "Squats", "Band Rows", "Mountain Climbers"],
            },
            "Saturday": {
                "focus": "Conditioning",
                "exercises": ["Jump Rope", "High Knees", "Mobility Flow", "Stretching"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest", "Light Stretching"]},
        },
        "Fat Loss": {
            "Monday": {
                "focus": "HIIT cardio",
                "exercises": ["Jump Rope", "Burpees", "Mountain Climbers", "High Knees"],
            },
            "Tuesday": {
                "focus": "Upper body circuit",
                "exercises": ["Push-ups", "Chair Dips", "Band Rows", "Shoulder Taps"],
            },
            "Wednesday": {
                "focus": "Core and walking",
                "exercises": ["Plank", "Leg Raise", "Russian Twist", "Brisk Walk"],
            },
            "Thursday": {
                "focus": "Leg circuit",
                "exercises": ["Squats", "Reverse Lunges", "Glute Bridge", "Skater Jumps"],
            },
            "Friday": {
                "focus": "Full-body HIIT",
                "exercises": ["Jumping Jacks", "Push-ups", "Squat Jumps", "Mountain Climbers"],
            },
            "Saturday": {
                "focus": "Recovery cardio",
                "exercises": ["Walking", "Step-ups", "Yoga Flow", "Stretching"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest", "Easy Walk"]},
        },
        "Maintenance": {
            "Monday": {
                "focus": "Bodyweight strength",
                "exercises": ["Push-ups", "Squats", "Chair Dips", "Plank"],
            },
            "Tuesday": {
                "focus": "Pull and legs",
                "exercises": ["Band Rows", "Lunges", "Band Curls", "Side Plank"],
            },
            "Wednesday": {
                "focus": "Mobility cardio",
                "exercises": ["Brisk Walk", "Hip Mobility", "Thoracic Rotation", "Hamstring Stretch"],
            },
            "Thursday": {
                "focus": "Full-body strength",
                "exercises": ["Split Squats", "Push-ups", "Glute Bridge", "Dead Bug"],
            },
            "Friday": {
                "focus": "Low-impact cardio",
                "exercises": ["Marching", "Step-ups", "Shadow Boxing", "Stretching"],
            },
            "Saturday": {
                "focus": "Active recovery",
                "exercises": ["Yoga", "Sport", "Walking", "Mobility Flow"],
            },
            "Sunday": {"focus": "Rest", "exercises": ["Rest"]},
        },
    },
}


MEAL_PLANS: dict[Diet, dict[str, str]] = {
    "Vegetarian": {
        "Breakfast": "Oats with banana, nuts, and Greek yogurt or curd",
        "Lunch": "Rice or roti with dal, paneer or tofu, vegetables, and salad",
        "Dinner": "Chapati with vegetables, lentils, and a protein-rich side",
        "Snack": "Fruit with roasted chana, sprouts, or a protein smoothie",
    },
    "Non-Vegetarian": {
        "Breakfast": "Eggs with oats, fruit, and curd",
        "Lunch": "Rice or roti with chicken or fish, vegetables, and salad",
        "Dinner": "Lean meat, fish, or eggs with vegetables and a carb portion",
        "Snack": "Fruit with yogurt, nuts, or a protein smoothie",
    },
}


DEFAULT_NOTES = [
    "Warm up for 5-10 minutes before training.",
    "Use progressive overload while keeping form clean.",
    "Adjust portions based on hunger, energy, and weekly progress.",
]


def get_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_empty_store() -> dict[str, object]:
    return {"users": []}


def load_store() -> dict[str, object]:
    if not DATA_FILE.exists():
        return get_empty_store()

    with DATA_FILE.open("r", encoding="utf-8") as store_file:
        return json.load(store_file)


def save_store(store: dict[str, object]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as store_file:
        json.dump(store, store_file, indent=2)


def hash_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.sha256(f"{password_salt}:{password}".encode("utf-8")).hexdigest()
    return f"{password_salt}${password_hash}"


def verify_password(password: str, saved_hash: str) -> bool:
    try:
        salt, expected_hash = saved_hash.split("$", 1)
    except ValueError:
        return False

    return secrets.compare_digest(hash_password(password, salt).split("$", 1)[1], expected_hash)


def get_users(store: dict[str, object]) -> list[dict[str, object]]:
    users = store.setdefault("users", [])
    if not isinstance(users, list):
        store["users"] = []
        return []
    return users


def find_user_by_email(users: list[dict[str, object]], email: str) -> dict[str, object] | None:
    normalized_email = email.lower()
    return next((user for user in users if str(user.get("email", "")).lower() == normalized_email), None)


def find_user_by_id(users: list[dict[str, object]], user_id: str) -> dict[str, object] | None:
    return next((user for user in users if user.get("id") == user_id), None)


def public_user(user: dict[str, object]) -> dict[str, object]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": "user",
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
        "profile": user.get("profile"),
        "latest_plan": user.get("latest_plan"),
        "custom_plan": user.get("custom_plan"),
    }


def require_admin(role: str | None) -> None:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def get_bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Healthy"
    if bmi < 30:
        return "Overweight"
    return "Obese"


def calculate_calories(weight: float, goal: Goal) -> int:
    multiplier = {
        "Muscle Gain": 40,
        "Fat Loss": 28,
        "Maintenance": 33,
    }[goal]
    return int(round(weight * multiplier))


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "AI Fitness Coach backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/login")
@app.post("/api/login")
def login(credentials: LoginInput) -> dict[str, object]:
    email = credentials.email.lower().strip()

    if credentials.role == "admin":
        if email != ADMIN_EMAIL or credentials.password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")

        return {
            "id": "admin",
            "name": "Admin",
            "email": ADMIN_EMAIL,
            "role": "admin",
        }

    store = load_store()
    users = get_users(store)
    user = find_user_by_email(users, email)
    now = get_now()

    if user:
        if not verify_password(credentials.password, str(user.get("password_hash", ""))):
            raise HTTPException(status_code=401, detail="Invalid user credentials")
        user["name"] = credentials.name.strip() or user["name"]
        user["last_login"] = now
    else:
        user = {
            "id": str(uuid.uuid4()),
            "name": credentials.name.strip() or email.split("@")[0],
            "email": email,
            "password_hash": hash_password(credentials.password),
            "created_at": now,
            "last_login": now,
            "profile": None,
            "latest_plan": None,
            "custom_plan": None,
        }
        users.append(user)

    save_store(store)
    return public_user(user)


@app.post("/fitness_plan")
@app.post("/api/fitness_plan")
def generate_plan(user: FitnessInput) -> dict[str, object]:
    height_m = user.height / 100
    bmi = round(user.weight / (height_m**2), 2)
    workout_plan = copy.deepcopy(WORKOUT_PLANS[user.workout_place][user.goal])
    meal_plan = copy.deepcopy(MEAL_PLANS[user.diet])
    notes = copy.deepcopy(DEFAULT_NOTES)

    store = load_store()
    users = get_users(store)
    stored_user = find_user_by_id(users, user.user_id) if user.user_id else None

    if stored_user and stored_user.get("custom_plan"):
        custom_plan = stored_user["custom_plan"]
        if isinstance(custom_plan, dict):
            workout_plan = copy.deepcopy(custom_plan.get("Workout Plan", workout_plan))
            meal_plan = copy.deepcopy(custom_plan.get("Meal Plan", meal_plan))
            notes = copy.deepcopy(custom_plan.get("Notes", notes))

    plan = {
        "BMI": bmi,
        "BMI Category": get_bmi_category(bmi),
        "Daily Calories": calculate_calories(user.weight, user.goal),
        "Protein": round(user.weight * 1.8, 1),
        "Water Intake": round(user.weight * 0.04, 1),
        "Workout Plan": workout_plan,
        "Meal Plan": meal_plan,
        "Notes": notes,
    }

    if stored_user:
        stored_user["profile"] = {
            "age": user.age,
            "weight": user.weight,
            "height": user.height,
            "goal": user.goal,
            "diet": user.diet,
            "workout_place": user.workout_place,
            "updated_at": get_now(),
        }
        stored_user["latest_plan"] = plan
        save_store(store)

    return plan


@app.get("/admin/users")
@app.get("/api/admin/users")
def list_users(x_session_role: str | None = Header(default=None)) -> dict[str, object]:
    require_admin(x_session_role)
    store = load_store()
    return {"users": [public_user(user) for user in get_users(store)]}


@app.get("/admin/users/{user_id}")
@app.get("/api/admin/users/{user_id}")
def get_user(user_id: str, x_session_role: str | None = Header(default=None)) -> dict[str, object]:
    require_admin(x_session_role)
    store = load_store()
    user = find_user_by_id(get_users(store), user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(user)


@app.put("/admin/users/{user_id}/plan")
@app.put("/api/admin/users/{user_id}/plan")
def update_user_plan(
    user_id: str,
    update: AdminPlanUpdate,
    x_session_role: str | None = Header(default=None),
) -> dict[str, object]:
    require_admin(x_session_role)
    store = load_store()
    user = find_user_by_id(get_users(store), user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    custom_plan = {
        "Workout Plan": {
            day: {
                "focus": plan.focus,
                "exercises": plan.exercises,
            }
            for day, plan in update.workout_plan.items()
        },
        "Meal Plan": update.meal_plan,
        "Notes": update.notes,
        "updated_at": get_now(),
    }
    user["custom_plan"] = custom_plan

    if user.get("latest_plan") and isinstance(user["latest_plan"], dict):
        user["latest_plan"]["Workout Plan"] = custom_plan["Workout Plan"]
        user["latest_plan"]["Meal Plan"] = custom_plan["Meal Plan"]
        user["latest_plan"]["Notes"] = custom_plan["Notes"]

    save_store(store)
    return public_user(user)
