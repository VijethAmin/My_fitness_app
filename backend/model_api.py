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
Gender = Literal["Male", "Female"]

DEFAULT_DATA_FILE = Path(
    os.getenv(
        "DATA_FILE",
        "/tmp/ai-fitness-store.json"
        if os.getenv("VERCEL")
        else str(Path(__file__).resolve().parent / "data" / "store.json"),
    )
)
FALLBACK_DATA_FILE = Path("/tmp/ai-fitness-store.json")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@fitness.local").lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


class FitnessInput(BaseModel):
    user_id: str | None = None
    gender: Gender
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


GYM_EXERCISES = {
    "push": ["Bench Press", "Incline Dumbbell Press", "Chest Press Machine", "Cable Fly", "Triceps Pushdown"],
    "pull": ["Lat Pulldown", "Seated Cable Row", "One-Arm Dumbbell Row", "Face Pull", "Dumbbell Curl"],
    "legs": ["Squat", "Leg Press", "Romanian Deadlift", "Walking Lunge", "Hamstring Curl"],
    "glutes": ["Hip Thrust", "Cable Kickback", "Goblet Squat", "Leg Press", "Abductor Machine"],
    "cardio": ["Incline Treadmill Walk", "Cycling", "Rowing Machine", "Elliptical", "Battle Ropes"],
    "core": ["Cable Crunch", "Plank", "Hanging Knee Raise", "Pallof Press"],
}

HOME_EXERCISES = {
    "push": ["Push-ups", "Incline Push-ups", "Pike Push-ups", "Chair Dips", "Shoulder Taps"],
    "pull": ["Resistance Band Row", "Towel Row", "Reverse Snow Angel", "Band Pull-apart", "Superman Hold"],
    "legs": ["Bodyweight Squat", "Reverse Lunge", "Bulgarian Split Squat", "Glute Bridge", "Calf Raise"],
    "glutes": ["Glute Bridge", "Single-Leg Glute Bridge", "Donkey Kick", "Fire Hydrant", "Step-ups"],
    "cardio": ["Jumping Jacks", "High Knees", "Mountain Climbers", "Burpees", "Brisk Walk"],
    "core": ["Plank", "Dead Bug", "Leg Raise", "Russian Twist", "Side Plank"],
}

VEGETARIAN_MEALS = {
    "Muscle Gain": {
        "Male": {
            "Breakfast": "Oats with milk, banana, peanut butter, and paneer/tofu scramble",
            "Lunch": "Rice or roti with dal, paneer/tofu, vegetables, curd, and salad",
            "Dinner": "Chapati with chole/rajma, vegetables, and curd",
            "Snack": "Greek yogurt or curd with nuts, fruit, and roasted chana",
        },
        "Female": {
            "Breakfast": "Oats with curd, berries/banana, chia seeds, and tofu/paneer bhurji",
            "Lunch": "Roti or rice with dal, tofu/paneer, vegetables, and salad",
            "Dinner": "Moong dal khichdi with vegetables, curd, and salad",
            "Snack": "Sprouts chaat, fruit, and a small handful of nuts",
        },
    },
    "Fat Loss": {
        "Male": {
            "Breakfast": "Besan chilla with curd and fruit",
            "Lunch": "Large salad bowl with dal, tofu/paneer, vegetables, and small rice/roti portion",
            "Dinner": "Vegetable soup with paneer/tofu and one roti",
            "Snack": "Roasted chana, buttermilk, or sprouts",
        },
        "Female": {
            "Breakfast": "Moong dal chilla with curd and fruit",
            "Lunch": "Dal, vegetables, salad, and one roti or small rice portion",
            "Dinner": "Paneer/tofu salad bowl with soup",
            "Snack": "Fruit, sprouts, or unsweetened curd",
        },
    },
    "Maintenance": {
        "Male": {
            "Breakfast": "Oats or poha with curd and nuts",
            "Lunch": "Rice/roti with dal, paneer/tofu, vegetables, and salad",
            "Dinner": "Chapati with vegetables, dal, and curd",
            "Snack": "Fruit, roasted chana, or curd",
        },
        "Female": {
            "Breakfast": "Idli/upma/oats with curd and fruit",
            "Lunch": "Roti/rice with dal, vegetables, tofu/paneer, and salad",
            "Dinner": "Dal soup or khichdi with vegetables and curd",
            "Snack": "Fruit, sprouts, or nuts",
        },
    },
}

NON_VEGETARIAN_MEALS = {
    "Muscle Gain": {
        "Male": {
            "Breakfast": "Eggs with oats, banana, and milk/curd",
            "Lunch": "Rice or roti with chicken breast/fish, vegetables, dal, and salad",
            "Dinner": "Chicken, fish, or eggs with rice/roti and vegetables",
            "Snack": "Greek yogurt/curd, fruit, nuts, or whey if available",
        },
        "Female": {
            "Breakfast": "Egg omelet with oats or toast and fruit",
            "Lunch": "Chicken/fish with rice or roti, vegetables, and salad",
            "Dinner": "Eggs/chicken/fish with vegetables and a moderate carb portion",
            "Snack": "Curd, fruit, nuts, or boiled eggs",
        },
    },
    "Fat Loss": {
        "Male": {
            "Breakfast": "Egg whites or omelet with fruit",
            "Lunch": "Grilled chicken/fish salad bowl with small rice/roti portion",
            "Dinner": "Chicken/fish soup or stir-fry with vegetables",
            "Snack": "Boiled eggs, curd, or fruit",
        },
        "Female": {
            "Breakfast": "Two eggs or egg-white omelet with fruit",
            "Lunch": "Chicken/fish with vegetables, salad, and small carb portion",
            "Dinner": "Soup or stir-fry with eggs/chicken/fish and vegetables",
            "Snack": "Curd, fruit, or boiled egg",
        },
    },
    "Maintenance": {
        "Male": {
            "Breakfast": "Eggs with oats/poha and fruit",
            "Lunch": "Rice/roti with chicken/fish, vegetables, and salad",
            "Dinner": "Eggs/chicken/fish with vegetables and dal",
            "Snack": "Curd, fruit, or nuts",
        },
        "Female": {
            "Breakfast": "Eggs with toast/oats and fruit",
            "Lunch": "Chicken/fish with rice/roti, vegetables, and salad",
            "Dinner": "Egg curry or fish/chicken with vegetables",
            "Snack": "Curd, fruit, or nuts",
        },
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
    data_file = DEFAULT_DATA_FILE if DEFAULT_DATA_FILE.exists() else FALLBACK_DATA_FILE

    if not data_file.exists():
        return get_empty_store()

    with data_file.open("r", encoding="utf-8") as store_file:
        return json.load(store_file)


def save_store(store: dict[str, object]) -> None:
    try:
        DEFAULT_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with DEFAULT_DATA_FILE.open("w", encoding="utf-8") as store_file:
            json.dump(store, store_file, indent=2)
    except OSError:
        FALLBACK_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with FALLBACK_DATA_FILE.open("w", encoding="utf-8") as store_file:
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


def calculate_bmr(user: FitnessInput) -> float:
    gender_adjustment = 5 if user.gender == "Male" else -161
    return 10 * user.weight + 6.25 * user.height - 5 * user.age + gender_adjustment


def calculate_daily_calories(user: FitnessInput) -> int:
    activity_multiplier = 1.45 if user.workout_place == "Gym" else 1.35
    goal_adjustment = {
        "Muscle Gain": 300 if user.gender == "Male" else 220,
        "Fat Loss": -450 if user.gender == "Male" else -350,
        "Maintenance": 0,
    }[user.goal]
    minimum_calories = 1500 if user.gender == "Male" else 1200
    return max(minimum_calories, int(round(calculate_bmr(user) * activity_multiplier + goal_adjustment)))


def calculate_protein(weight: float, goal: Goal, gender: Gender) -> float:
    multiplier = {
        "Muscle Gain": 1.9 if gender == "Male" else 1.7,
        "Fat Loss": 1.8 if gender == "Male" else 1.6,
        "Maintenance": 1.5 if gender == "Male" else 1.35,
    }[goal]
    return round(weight * multiplier, 1)


def get_intensity(age: int, bmi: float, goal: Goal) -> str:
    if age >= 50 or bmi >= 30 or bmi < 18.5:
        return "moderate"
    if goal == "Fat Loss":
        return "high"
    return "progressive"


def pick_exercises(place: WorkoutPlace, category: str, count: int) -> list[str]:
    exercise_library = GYM_EXERCISES if place == "Gym" else HOME_EXERCISES
    return exercise_library[category][:count]


def make_day(place: WorkoutPlace, focus: str, categories: list[str], count: int) -> WorkoutDay:
    exercises: list[str] = []
    for category in categories:
        exercises.extend(pick_exercises(place, category, count))
    return {"focus": focus, "exercises": exercises[:5]}


def build_workout_plan(user: FitnessInput, bmi: float) -> dict[str, WorkoutDay]:
    intensity = get_intensity(user.age, bmi, user.goal)
    exercise_count = 2 if intensity == "moderate" else 3
    place_prefix = "Gym" if user.workout_place == "Gym" else "Home"
    lower_focus = "glutes and legs" if user.gender == "Female" else "legs and strength"

    if user.goal == "Muscle Gain":
        plan = {
            "Monday": make_day(user.workout_place, f"{place_prefix} push strength", ["push"], exercise_count),
            "Tuesday": make_day(user.workout_place, f"{place_prefix} pull strength", ["pull"], exercise_count),
            "Wednesday": make_day(user.workout_place, f"{place_prefix} {lower_focus}", ["glutes", "legs"], 2),
            "Thursday": make_day(user.workout_place, f"{place_prefix} upper hypertrophy", ["push", "pull"], 2),
            "Friday": make_day(user.workout_place, f"{place_prefix} lower body and core", ["legs", "core"], 2),
            "Saturday": make_day(user.workout_place, "Mobility and light cardio", ["cardio", "core"], 2),
            "Sunday": {"focus": "Rest and recovery", "exercises": ["Rest", "Light Stretching"]},
        }
    elif user.goal == "Fat Loss":
        plan = {
            "Monday": make_day(user.workout_place, f"{place_prefix} full-body fat-loss circuit", ["push", "legs", "cardio"], 2),
            "Tuesday": make_day(user.workout_place, f"{place_prefix} cardio and core", ["cardio", "core"], exercise_count),
            "Wednesday": make_day(user.workout_place, f"{place_prefix} lower body metabolism", ["legs", "glutes"], 2),
            "Thursday": make_day(user.workout_place, f"{place_prefix} upper body circuit", ["push", "pull"], 2),
            "Friday": make_day(user.workout_place, f"{place_prefix} HIIT conditioning", ["cardio", "core"], exercise_count),
            "Saturday": {"focus": "Low-impact cardio and mobility", "exercises": pick_exercises(user.workout_place, "cardio", 2) + ["Stretching"]},
            "Sunday": {"focus": "Rest and easy walk", "exercises": ["Rest", "Easy Walk"]},
        }
    else:
        plan = {
            "Monday": make_day(user.workout_place, f"{place_prefix} balanced strength", ["push", "legs"], 2),
            "Tuesday": make_day(user.workout_place, f"{place_prefix} pull and core", ["pull", "core"], 2),
            "Wednesday": {"focus": "Zone 2 cardio and mobility", "exercises": pick_exercises(user.workout_place, "cardio", 2) + ["Mobility Flow"]},
            "Thursday": make_day(user.workout_place, f"{place_prefix} lower body maintenance", ["legs", "glutes"], 2),
            "Friday": make_day(user.workout_place, f"{place_prefix} upper body maintenance", ["push", "pull"], 2),
            "Saturday": {"focus": "Active recovery", "exercises": pick_exercises(user.workout_place, "cardio", 1) + ["Yoga Flow", "Stretching"]},
            "Sunday": {"focus": "Rest", "exercises": ["Rest"]},
        }

    if intensity == "moderate":
        plan["Friday"] = make_day(user.workout_place, f"{place_prefix} moderate full-body", ["push", "legs", "core"], 1)
        plan["Saturday"] = {"focus": "Recovery cardio and mobility", "exercises": ["Brisk Walk", "Stretching", "Breathing Drills"]}

    return plan


def build_meal_plan(user: FitnessInput, bmi: float) -> dict[str, str]:
    meal_library = VEGETARIAN_MEALS if user.diet == "Vegetarian" else NON_VEGETARIAN_MEALS
    meal_plan = copy.deepcopy(meal_library[user.goal][user.gender])

    if bmi < 18.5 and user.goal != "Fat Loss":
        meal_plan["Extra"] = "Add one calorie-dense snack: banana shake, nuts, or peanut butter toast"
    elif bmi >= 30 or user.goal == "Fat Loss":
        meal_plan["Extra"] = "Keep oil/sugar low and fill half the plate with vegetables or salad"
    else:
        meal_plan["Extra"] = "Keep portions steady and adjust weekly based on progress"

    return meal_plan


def build_notes(user: FitnessInput, bmi: float) -> list[str]:
    intensity = get_intensity(user.age, bmi, user.goal)
    notes = [
        f"Plan adjusted for {user.gender.lower()}, {user.goal.lower()}, {user.diet.lower()} diet, and {user.workout_place.lower()} training.",
        f"Intensity level: {intensity}. Warm up for 5-10 minutes before training.",
        "Use slow, controlled reps and stop if pain feels sharp or unusual.",
    ]

    if bmi < 18.5:
        notes.append("BMI is low, so prioritize strength training, protein, and a small calorie surplus.")
    elif bmi >= 30:
        notes.append("BMI is high, so keep impact moderate and build consistency with walking and strength work.")
    elif user.goal == "Fat Loss":
        notes.append("Aim for steady fat loss with high-protein meals, sleep, and daily steps.")
    elif user.goal == "Muscle Gain":
        notes.append("Track strength progress weekly and increase reps or load gradually.")

    return notes


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
    workout_plan = build_workout_plan(user, bmi)
    meal_plan = build_meal_plan(user, bmi)
    notes = build_notes(user, bmi)

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
        "Daily Calories": calculate_daily_calories(user),
        "Protein": calculate_protein(user.weight, user.goal, user.gender),
        "Water Intake": round(user.weight * 0.04, 1),
        "Workout Plan": workout_plan,
        "Meal Plan": meal_plan,
        "Notes": notes,
    }

    if stored_user:
        stored_user["profile"] = {
            "age": user.age,
            "gender": user.gender,
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
