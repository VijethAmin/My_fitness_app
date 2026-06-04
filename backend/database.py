import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

logger = logging.getLogger(__name__)

DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "ai_fitness.db")
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def _get_connect_args(url: str) -> dict[str, object]:
    if url.startswith("sqlite:"):
        return {"check_same_thread": False}
    return {}


def _create_engine(url: str):
    return create_engine(url, pool_pre_ping=True, connect_args=_get_connect_args(url))


def _build_engine() -> tuple[object, str]:
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set; falling back to temporary SQLite backend.")
        return _create_engine(DEFAULT_SQLITE_URL), DEFAULT_SQLITE_URL

    try:
        engine = _create_engine(DATABASE_URL)
        if not DATABASE_URL.startswith("sqlite:"):
            with engine.connect() as conn:
                pass
        return engine, DATABASE_URL
    except Exception as exc:
        logger.warning(
            "Failed to initialize database engine with DATABASE_URL=%s; falling back to SQLite: %s",
            DATABASE_URL,
            exc,
        )
        return _create_engine(DEFAULT_SQLITE_URL), DEFAULT_SQLITE_URL


engine, ACTIVE_DATABASE_URL = _build_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_login: Mapped[str | None] = mapped_column(String(40), nullable=True)
    profile_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    latest_plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class WorkoutCompletionRecord(Base):
    __tablename__ = "workout_completions"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_workout_completion_user_day"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[str] = mapped_column(String(20))
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)


def _decode(value: str | None) -> Any:
    return json.loads(value) if value else None


def _encode(value: Any) -> str | None:
    return json.dumps(value) if value is not None else None


def _public_dict(record: UserRecord) -> dict[str, object]:
    return {
        "id": record.id,
        "name": record.name,
        "email": record.email,
        "password_hash": record.password_hash,
        "created_at": record.created_at,
        "last_login": record.last_login,
        "profile": _decode(record.profile_json),
        "latest_plan": _decode(record.latest_plan_json),
        "custom_plan": _decode(record.custom_plan_json),
    }


def load_store() -> dict[str, object]:
    initialize_database()
    with SessionLocal() as session:
        users = session.scalars(select(UserRecord)).all()
        return {"users": [_public_dict(user) for user in users]}


def save_store(store: dict[str, object]) -> None:
    initialize_database()
    users = store.get("users", [])
    if not isinstance(users, list):
        return

    with SessionLocal.begin() as session:
        for user in users:
            if not isinstance(user, dict):
                continue

            user_id = str(user["id"])
            record = session.get(UserRecord, user_id)
            if record is None:
                record = UserRecord(
                    id=user_id,
                    name=str(user["name"]),
                    email=str(user["email"]),
                    password_hash=str(user["password_hash"]),
                )
                session.add(record)

            record.name = str(user["name"])
            record.email = str(user["email"])
            record.password_hash = str(user["password_hash"])
            record.created_at = str(user["created_at"]) if user.get("created_at") else None
            record.last_login = str(user["last_login"]) if user.get("last_login") else None
            record.profile_json = _encode(user.get("profile"))
            record.latest_plan_json = _encode(user.get("latest_plan"))
            record.custom_plan_json = _encode(user.get("custom_plan"))


def get_workout_completions(user_id: str) -> dict[str, bool]:
    initialize_database()
    with SessionLocal() as session:
        records = session.scalars(
            select(WorkoutCompletionRecord).where(WorkoutCompletionRecord.user_id == user_id)
        ).all()
        return {record.day: record.completed for record in records}


def set_workout_completion(user_id: str, day: str, completed: bool) -> dict[str, bool]:
    initialize_database()
    with SessionLocal.begin() as session:
        record = session.scalar(
            select(WorkoutCompletionRecord).where(
                WorkoutCompletionRecord.user_id == user_id,
                WorkoutCompletionRecord.day == day,
            )
        )
        now = datetime.now(timezone.utc)
        if record is None:
            record = WorkoutCompletionRecord(
                user_id=user_id,
                day=day,
                completed=completed,
                updated_at=now,
            )
            session.add(record)
        else:
            record.completed = completed
            record.updated_at = now

    return get_workout_completions(user_id)


def reset_workout_completions(user_id: str) -> dict[str, bool]:
    initialize_database()
    with SessionLocal.begin() as session:
        records = session.scalars(
            select(WorkoutCompletionRecord).where(WorkoutCompletionRecord.user_id == user_id)
        ).all()
        for record in records:
            session.delete(record)

    return {}
