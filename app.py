"""
app.py - Prashiksha Flask application
Run: flask --app app run --debug
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

sys.path.insert(0, os.path.dirname(__file__))

from backend.agent import AITutorAgent
from backend.session_manager import SessionManager
from backend.translator import SUPPORTED_LANGUAGES, TranslationModule

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.getenv("SECRET_KEY", "prashiksha-dev-secret"))

LEARNING_STATES: dict[str, dict] = {}


LEARNING_TYPES = {
    "explanation": {
        "icon": "lightbulb",
        "label": "Deep Explanation",
        "desc": "Layered teaching with examples, analogies, and common mistakes.",
    },
    "qa": {
        "icon": "messages-square",
        "label": "Q&A Mode",
        "desc": "Ask one focused question and get the concepts behind it.",
    },
    "roadmap": {
        "icon": "map",
        "label": "Roadmap Journey",
        "desc": "A step-by-step learning path from first principles to fluency.",
    },
    "summary": {
        "icon": "clipboard-list",
        "label": "Quick Summary",
        "desc": "Definitions, key points, and a memorable analogy.",
    },
    "practice": {
        "icon": "pencil-ruler",
        "label": "Practice Problems",
        "desc": "Exercises and hints that help you apply the idea.",
    },
}

QUICK_TOPICS = ["Machine Learning", "Photosynthesis", "World War II", "Python Basics", "Trigonometry"]


def _initial_learning_state() -> dict:
    return {
        "user": None,
        "session_id": None,
        "topic": None,
        "response_type": None,
        "chat_history": [],
        "language": "en",
        "understanding_level": 0.5,
        "section_content": "",
        "current_flashcards": [],
        "current_card_idx": 0,
        "quiz_answers": [],
        "roadmap_data": None,
        "current_roadmap_step": 0,
        "prev_session_id": None,
        "notes": [],
    }


def _state() -> dict:
    state_id = session.get("learning_state_id")
    if not state_id:
        state_id = uuid.uuid4().hex
        session["learning_state_id"] = state_id
    if state_id not in LEARNING_STATES:
        legacy_state = session.pop("learning_state", None)
        LEARNING_STATES[state_id] = legacy_state or _initial_learning_state()
        session.modified = True
    return LEARNING_STATES[state_id]


def _save_state(state: dict):
    state_id = session.get("learning_state_id")
    if not state_id:
        state_id = uuid.uuid4().hex
        session["learning_state_id"] = state_id
    LEARNING_STATES[state_id] = state
    session.modified = True


def _reset_state(state: dict | None = None):
    state_id = uuid.uuid4().hex
    session["learning_state_id"] = state_id
    LEARNING_STATES[state_id] = state or _initial_learning_state()
    session.modified = True


def _get_sm() -> SessionManager | None:
    try:
        return SessionManager()
    except Exception:
        return None


def _get_agent(state: dict) -> AITutorAgent:
    return AITutorAgent(
        understanding_level=state.get("understanding_level", 0.5),
        language=state.get("language", "en"),
    )


def _get_translator() -> TranslationModule:
    return TranslationModule()


def _add_message(state: dict, role: str, content: str):
    state.setdefault("chat_history", []).append({"role": role, "content": content})
    sm = _get_sm()
    if sm and state.get("session_id") and role in {"user", "assistant", "system"}:
        try:
            sm.save_message(state["session_id"], role, content, state.get("language", "en"))
        except Exception:
            pass
        finally:
            sm.close()


def _build_local_journey_data(state: dict) -> dict:
    answers = state.get("quiz_answers", [])
    history = state.get("chat_history", [])
    total = max(len(answers), 1)
    return {
        "topic": state.get("topic") or "General",
        "session_duration_minutes": 0,
        "messages_exchanged": sum(1 for msg in history if msg.get("role") in ("user", "assistant")),
        "quiz_results": {
            "total_questions": len(answers),
            "correct_answers": sum(1 for ans in answers if ans.get("is_correct")),
            "average_score": sum(ans.get("score", 0) for ans in answers) / total,
            "accuracy_percent": round(sum(ans.get("score", 0) for ans in answers) / total * 100, 1),
        },
        "understanding_level": state.get("understanding_level", 0.5),
        "weak_topics": [],
        "roadmap_progress": {"total_steps": 0, "completed_steps": 0, "completed_titles": []},
        "overall_progress": [],
    }


def _fallback_lesson(topic: str, response_type: str) -> str:
    return (
        f"Welcome to Prashiksha. Let's begin {topic} in {response_type} mode.\n\n"
        "1. Start with the core idea in simple words.\n"
        "2. Connect it to one real example.\n"
        "3. Practice with a small question.\n\n"
        "The AI service was not reachable for this response, but the Flask frontend and learning flow are ready."
    )


def _ai_error_text(error: Exception) -> str:
    if os.getenv("PRASHIKSHA_DEBUG_AI", "").lower() in {"1", "true", "yes"}:
        return f"\n\nAI debug: {type(error).__name__}: {error}"
    return ""


def _fallback_cards(topic: str) -> list[dict]:
    return [
        {
            "question": f"What is the main idea of {topic}?",
            "answer": f"Explain the core meaning of {topic} in your own words.",
            "topic": topic,
        },
        {
            "question": f"Give one real-world example of {topic}.",
            "answer": f"A useful example should connect {topic} to something practical or familiar.",
            "topic": topic,
        },
    ]


def _notes(state: dict) -> list[dict]:
    state.setdefault("notes", [])
    return state["notes"]


def _note_back_url(default: str = "topic") -> str:
    candidate = request.values.get("back") or request.referrer
    if candidate and candidate.startswith("/"):
        return candidate
    return url_for(default)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not _state().get("user"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.context_processor
def inject_globals():
    return {
        "languages": SUPPORTED_LANGUAGES,
        "learning_types": LEARNING_TYPES,
        "state": _state(),
        "brand_name": "Prashiksha",
    }


@app.get("/")
def login():
    state = _state()
    if state.get("user"):
        return redirect(url_for("topic"))
    return render_template("login.html")


@app.post("/login")
def submit_login():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    language = request.form.get("language", "en")

    if not name or not email:
        return render_template("login.html", error="Please enter your name and Gmail address."), 400
    if language not in SUPPORTED_LANGUAGES:
        language = "en"

    state = _initial_learning_state()
    state["language"] = language

    sm = _get_sm()
    if sm:
        try:
            user = sm.get_or_create_user(name, email, language)
            state["user"] = {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "language_pref": user.language_pref,
            }
            active = sm.get_active_session(user.id)
            if active:
                state["session_id"] = active.id
                state["topic"] = active.topic
                state["response_type"] = active.response_type
                state["chat_history"] = sm.get_history(active.id)
                state["understanding_level"] = active.understanding_level
                _add_message(state, "system", f"Resumed your session on {active.topic}.")
                _save_state(state)
                return redirect(url_for("learn"))
        except Exception:
            state["user"] = {"id": 1, "name": name, "email": email, "language_pref": language}
        finally:
            sm.close()
    else:
        state["user"] = {"id": 1, "name": name, "email": email, "language_pref": language}

    _reset_state(state)
    return redirect(url_for("topic"))


@app.route("/topic", methods=["GET", "POST"])
@login_required
def topic():
    state = _state()
    if request.method == "POST":
        selected_topic = request.form.get("topic", "").strip()
        if not selected_topic:
            return render_template("topic.html", quick_topics=QUICK_TOPICS, error="Choose a topic to begin."), 400
        state["topic"] = selected_topic
        state["prev_session_id"] = None
        sm = _get_sm()
        if sm:
            try:
                previous = sm.get_last_session_for_topic(state["user"]["id"], selected_topic)
                if previous:
                    state["prev_session_id"] = previous.id
            except Exception:
                pass
            finally:
                sm.close()
        _save_state(state)
        return redirect(url_for("mode"))
    return render_template("topic.html", quick_topics=QUICK_TOPICS)


@app.route("/mode", methods=["GET", "POST"])
@login_required
def mode():
    state = _state()
    if not state.get("topic"):
        return redirect(url_for("topic"))

    if request.method == "POST":
        action = request.form.get("action")
        if action == "resume" and state.get("prev_session_id"):
            sm = _get_sm()
            if sm:
                try:
                    sm.resume_session(state["prev_session_id"])
                    state["session_id"] = state["prev_session_id"]
                    state["chat_history"] = sm.get_history(state["prev_session_id"])
                    state["prev_session_id"] = None
                    _add_message(state, "system", f"Continuing from where you left off on {state['topic']}.")
                    _save_state(state)
                    return redirect(url_for("learn"))
                finally:
                    sm.close()

        response_type = request.form.get("response_type", "explanation")
        if response_type not in LEARNING_TYPES:
            response_type = "explanation"
        _prepare_session(state, response_type)
        _save_state(state)
        return redirect(url_for("learn"))

    return render_template("mode.html")


def _prepare_session(state: dict, response_type: str):
    state["response_type"] = response_type
    state["initial_lesson_started"] = False
    sm = _get_sm()
    if sm:
        try:
            created = sm.create_session(state["user"]["id"], state["topic"], response_type)
            state["session_id"] = created.id
        except Exception:
            state["session_id"] = None
        finally:
            sm.close()

    _add_message(state, "system", f"Great. Prashiksha will teach {state['topic']} using {response_type} mode.")


def _start_initial_lesson(state: dict):
    if state.get("initial_lesson_started"):
        return

    state["initial_lesson_started"] = True
    agent = _get_agent(state)
    prompt = f"Please begin teaching me about: {state['topic']}"
    try:
        response = agent.get_response(prompt, state["topic"], state["response_type"], [])
    except Exception as error:
        response = _fallback_lesson(state["topic"], state["response_type"]) + _ai_error_text(error)
    if state.get("language") != "en":
        response = _get_translator().translate(response, state["language"])
    _add_message(state, "user", prompt)
    _add_message(state, "assistant", response)
    state["section_content"] = state.get("section_content", "") + response

    if state["response_type"] == "roadmap":
        roadmap = agent.parse_roadmap(response)
        if roadmap:
            state["roadmap_data"] = roadmap
            sm = _get_sm()
            if sm and state.get("session_id"):
                try:
                    sm.save_roadmap_steps(state["session_id"], roadmap.get("steps", []))
                except Exception:
                    pass
                finally:
                    sm.close()


@app.get("/learn")
@login_required
def learn():
    state = _state()
    if not state.get("topic"):
        return redirect(url_for("topic"))
    if not state.get("response_type"):
        return redirect(url_for("mode"))
    return render_template("learn.html")


@app.route("/notes", methods=["GET", "POST"])
@login_required
def notes():
    state = _state()
    back_url = _note_back_url()
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "").strip()
        if title and content:
            _notes(state).insert(
                0,
                {
                    "id": uuid.uuid4().hex,
                    "title": title,
                    "content": content,
                    "topic": state.get("topic") or "General",
                    "created_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
                },
            )
            _save_state(state)
            return redirect(url_for("notes", back=back_url))
        return render_template("notes.html", notes=_notes(state), back_url=back_url, error="Add a title and note content.")
    return render_template("notes.html", notes=_notes(state), back_url=back_url)


@app.post("/notes/<note_id>/edit")
@login_required
def edit_note(note_id: str):
    state = _state()
    back_url = _note_back_url()
    title = request.form.get("title", "").strip()
    content = request.form.get("content", "").strip()
    for note in _notes(state):
        if note["id"] == note_id:
            if title:
                note["title"] = title
            note["content"] = content
            note["updated_at"] = datetime.now().strftime("%d %b %Y, %I:%M %p")
            break
    _save_state(state)
    return redirect(url_for("notes", back=back_url))


@app.post("/notes/<note_id>/delete")
@login_required
def delete_note(note_id: str):
    state = _state()
    back_url = _note_back_url()
    state["notes"] = [note for note in _notes(state) if note["id"] != note_id]
    _save_state(state)
    return redirect(url_for("notes", back=back_url))


@app.post("/api/notes")
@login_required
def api_create_note():
    state = _state()
    data = request.json or {}
    content = data.get("content", "").strip()
    title = data.get("title", "").strip() or state.get("topic") or "Quick Note"
    if not content:
        return jsonify({"error": "Note content is required."}), 400
    note = {
        "id": uuid.uuid4().hex,
        "title": title,
        "content": content,
        "topic": state.get("topic") or "General",
        "created_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
    }
    _notes(state).insert(0, note)
    _save_state(state)
    return jsonify({"note": note, "count": len(_notes(state))})


@app.post("/api/lesson/start")
@login_required
def api_start_lesson():
    state = _state()
    if not state.get("topic") or not state.get("response_type"):
        return jsonify({"error": "Choose a topic and mode first."}), 400
    _start_initial_lesson(state)
    _save_state(state)
    return jsonify(
        {
            "messages": state.get("chat_history", []),
            "roadmap_data": state.get("roadmap_data"),
            "current_roadmap_step": state.get("current_roadmap_step", 0),
        }
    )


@app.post("/api/chat")
@login_required
def api_chat():
    state = _state()
    user_input = (request.json or {}).get("message", "").strip()
    if not user_input:
        return jsonify({"error": "Message is required."}), 400

    lower = user_input.lower()
    _add_message(state, "user", user_input)
    if any(token in lower for token in ["end session", "finish", "goodbye", "bye", "done learning"]):
        _save_state(state)
        return jsonify({"redirect": url_for("journey")})
    if any(token in lower for token in ["quiz", "test me", "flashcard", "test myself"]):
        _save_state(state)
        return jsonify({"quiz": True})

    agent = _get_agent(state)
    history = state.get("chat_history", [])[:-1]
    try:
        response = agent.get_response(user_input, state["topic"], state["response_type"], history)
    except Exception as error:
        response = _fallback_lesson(state["topic"], state["response_type"]) + _ai_error_text(error)
    if state.get("language") != "en":
        response = _get_translator().translate(response, state["language"])

    _add_message(state, "assistant", response)
    state["section_content"] = state.get("section_content", "") + "\n" + response
    assistant_count = sum(1 for msg in state.get("chat_history", []) if msg.get("role") == "assistant")
    if assistant_count and assistant_count % 3 == 0:
        _add_message(state, "system", "You have covered a useful chunk. Try a quick flashcard check when ready.")
    _save_state(state)
    return jsonify({"messages": state["chat_history"], "can_quiz": len(state.get("section_content", "")) > 300})


@app.post("/api/roadmap/complete")
@login_required
def complete_roadmap_step():
    state = _state()
    steps = (state.get("roadmap_data") or {}).get("steps", [])
    current = state.get("current_roadmap_step", 0)
    if current < len(steps):
        state["current_roadmap_step"] = current + 1
        sm = _get_sm()
        if sm and state.get("session_id"):
            try:
                sm.complete_roadmap_step(state["session_id"], current + 1)
            except Exception:
                pass
            finally:
                sm.close()
    _save_state(state)
    return jsonify({"current_step": state["current_roadmap_step"]})


@app.post("/api/quiz/start")
@login_required
def start_quiz():
    state = _state()
    # Always reset state to start a fresh quiz attempt
    state["current_flashcards"] = []
    state["current_card_idx"] = 0
    state["quiz_answers"] = []

    try:
        cards = _get_agent(state).generate_flashcards(state["topic"], state.get("section_content", ""))
    except Exception:
        cards = []
    if not cards:
        cards = _fallback_cards(state["topic"])
    state["current_flashcards"] = cards
    _save_state(state)
    return jsonify(_quiz_payload(state))


@app.post("/api/quiz/answer")
@login_required
def answer_quiz():
    state = _state()
    answer = (request.json or {}).get("answer", "").strip()
    skip = bool((request.json or {}).get("skip"))
    cards = state.get("current_flashcards", [])
    idx = state.get("current_card_idx", 0)
    if idx >= len(cards):
        return jsonify(_quiz_payload(state))

    card = cards[idx]
    if skip:
        result = {
            "is_correct": False,
            "score": 0.0,
            "feedback": "Skipped.",
            "explanation": card.get("explanation") or card.get("answer") or "Skipped question."
        }
    elif card.get("type") == "mcq":
        # MCQ local grading
        import re
        correct_letter = card.get("answer", "").strip().upper()
        # Extract user answer letter
        user_match = re.match(r"^([A-D])", answer.strip().upper())
        user_letter = user_match.group(1) if user_match else answer.strip().upper()
        
        is_correct = (user_letter == correct_letter)
        score = 1.0 if is_correct else 0.0
        result = {
            "is_correct": is_correct,
            "score": score,
            "feedback": "Correct!" if is_correct else "Incorrect.",
            "explanation": card.get("explanation") or f"The correct answer is {correct_letter}."
        }
    else:
        try:
            result = _get_agent(state).evaluate_answer(card["question"], card["answer"], answer)
        except Exception:
            score = 1.0 if answer and any(word in answer.lower() for word in card["answer"].lower().split()[:4]) else 0.4
            result = {
                "is_correct": score >= 0.6,
                "score": score,
                "feedback": "Nice effort." if score >= 0.6 else "Good attempt. Review the sample answer once.",
                "explanation": card["answer"],
            }

    sm = _get_sm()
    if sm and state.get("session_id"):
        try:
            sm.save_quiz_attempt(
                state["session_id"],
                card.get("topic", state["topic"]),
                card["question"],
                card.get("answer", ""),
                answer,
                result.get("is_correct", False),
                result.get("score", 0.0),
            )
        except Exception:
            pass
        finally:
            sm.close()

    state.setdefault("quiz_answers", []).append({"card": card, **result})
    state["current_card_idx"] = idx + 1
    if state["current_card_idx"] >= len(cards):
        scores = [item.get("score", 0.0) for item in state.get("quiz_answers", [])]
        state["understanding_level"] = _get_agent(state).update_understanding(scores)
        sm = _get_sm()
        if sm and state.get("session_id"):
            try:
                sm.update_understanding(
                    state["session_id"],
                    state["understanding_level"],
                    state["user"]["id"],
                    state["topic"]
                )
            except Exception:
                pass
            finally:
                sm.close()

    _save_state(state)
    payload = _quiz_payload(state)
    payload["last_result"] = result
    payload["answered_card"] = card
    payload["user_answer"] = answer
    return jsonify(payload)


def _quiz_payload(state: dict) -> dict:
    cards = state.get("current_flashcards", [])
    idx = state.get("current_card_idx", 0)
    answers = state.get("quiz_answers", [])
    if idx >= len(cards) and cards:
        total = len(answers)
        avg = sum(item.get("score", 0) for item in answers) / max(total, 1)
        return {
            "done": True,
            "total": total,
            "correct": sum(1 for item in answers if item.get("is_correct")),
            "score": round(avg * 100),
            "understanding": round(state.get("understanding_level", 0.5) * 100),
        }
    return {
        "done": False,
        "index": idx,
        "total": len(cards),
        "card": cards[idx] if idx < len(cards) else None,
    }


@app.get("/journey")
@login_required
def journey():
    state = _state()
    sm = _get_sm()
    if sm and state.get("session_id"):
        try:
            sm.end_session(state["session_id"])
            journey_data = sm.get_session_journey_data(
                state["session_id"], state["user"]["id"], state.get("topic") or "General"
            )
        except Exception:
            journey_data = _build_local_journey_data(state)
        finally:
            sm.close()
    else:
        journey_data = _build_local_journey_data(state)

    try:
        summary = _get_agent(state).generate_journey_summary(journey_data)
    except Exception:
        summary = (
            f"You worked on {journey_data.get('topic', 'your topic')} with Prashiksha. "
            f"You exchanged {journey_data.get('messages_exchanged', 0)} learning messages and reached "
            f"{journey_data.get('understanding_level', 0.5):.0%} mastery. Keep going with one small revision "
            "and one practice round next."
        )
    if state.get("language") != "en":
        summary = _get_translator().translate(summary, state["language"])
    return render_template("journey.html", journey_data=journey_data, summary=summary)


@app.post("/new-topic")
@login_required
def new_topic():
    state = _state()
    sm = _get_sm()
    if sm and state.get("session_id"):
        try:
            sm.pause_session(state["session_id"])
        except Exception:
            pass
        finally:
            sm.close()
    user = state["user"]
    language = state.get("language", "en")
    notes = _notes(state)
    state = _initial_learning_state()
    state["user"] = user
    state["language"] = language
    state["notes"] = notes
    _save_state(state)
    return redirect(url_for("topic"))


@app.post("/logout")
def logout():
    state_id = session.get("learning_state_id")
    if state_id:
        LEARNING_STATES.pop(state_id, None)
    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)
