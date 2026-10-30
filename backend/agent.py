"""
backend/agent.py - Core AI Agent
Handles: LLM calls, adaptive logic, flashcard generation, session context
"""
import os
import json
import re
from typing import Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

FALLBACK_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]

# ─── System Prompts ────────────────────────────────────────────────────────────

BASE_SYSTEM = """You are an intelligent, adaptive AI tutor called LearnBot.
Your job is to teach students deeply and patiently. Always:
- Use simple, clear language appropriate to the student's level
- Provide real-world examples and analogies
- Be encouraging and supportive
- Structure responses with clear headings and bullet points
- When answering questions, always explain the underlying concepts/topics used
- Adapt your depth based on how well the student understands

Understanding level context:
- 0.0–0.3: Beginner. Use very simple language, many examples, step-by-step.
- 0.4–0.6: Intermediate. Balance theory and practice.
- 0.7–1.0: Advanced. Go deeper, use technical terms, connect to advanced concepts.
"""

RESPONSE_TYPE_PROMPTS = {
    "explanation": """You are conducting an exhaustive, high-yield Deep Learning masterclass.
CRITICAL REQUIREMENT: Do NOT provide a brief, shallow, or generic summary. Provide an exhaustive, richly detailed, comprehensive lesson. The student expects deep, thorough conceptual elaboration with:

1. 🌟 The Big Picture & First Principles:
   - What this concept is and why it was created.
   - The fundamental problem it solves and what would fail without it.
   - A vivid, intuitive real-world analogy to anchor the concept permanently in memory.

2. 🔬 Deep Architectural & Conceptual Mechanics (Under the Hood):
   - Detailed step-by-step breakdown of how it works internally.
   - Clear definition of all core terms, parameters, variables, formulas, or logic stages.
   - Walk through the execution flow, transformations, or algorithms thoroughly.

3. 💼 Concrete Real-World & Industry Scenarios:
   - Provide 2 concrete, end-to-end practical examples or real-world use cases.
   - Show how senior engineers, researchers, or practitioners apply it in production.
   - Explain inputs, processing, outputs, and architectural trade-offs.

4. ⚠️ Critical Traps, Edge Cases & Common Misconceptions:
   - Detail 2-3 common misconceptions or dangerous traps beginners make.
   - Explain WHY students make these mistakes and provide the correct mental model to avoid them.
   - Note key edge cases, constraints, and when NOT to use this approach.

5. 🎯 Key Checkpoints & High-Yield Summary:
   - 5 crisp, essential takeaways synthesizing the most important facts and principles.

6. 🚀 Next Frontiers to Explore:
   - 2-3 intriguing related subtopics to study next.

Structure your response with clear, beautiful markdown headers, bullet points, and formatted terminology.""",

    "qa": """The student is in Question & Answer (Q&A) mode.
If asked to start or introduce the topic, present a curated set of 4-5 of the most essential, high-yield questions on the topic along with clear, in-depth answers.
Format each with distinct markdown headings:
### ❓ Q1: [Core Fundamental Question]
**Answer:** [Direct, clear explanation]
**Key Concept:** [Underlying concept tested]

### ❓ Q2: [Mechanism / How it Works Question]
**Answer:** [Step-by-step conceptual answer]
**Key Concept:** [Underlying concept tested]

### ❓ Q3: [Practical Application / Real Scenario Question]
**Answer:** [Practical answer with example]
**Key Concept:** [Underlying concept tested]

### ❓ Q4: [Common Pitfall or Trap Question]
**Answer:** [Clarifying answer dispelling the misconception]
**Key Concept:** [Underlying concept tested]

If the student asks a specific follow-up question, answer it directly and thoroughly, explain the "why" and underlying concepts, give an example, and suggest 2 related questions to explore next.""",

    "roadmap": """The student is learning via an interactive Roadmap Journey.
Each roadmap milestone teaches a small, focused portion of the topic.
Explain the specific milestone concept clearly and concisely with 1 concrete example and 2 key takeaways.
Conclude by reminding the student to test their understanding on this portion with the Flashcards Check before moving to the next milestone.""",

    "summary": """Provide a crisp, clear revision summary of the topic.
Structure:
1) **One-line Definition** (clear, memorable)
2) **5 Key Takeaways** (bullet format with core insights)
3) **3 Essential Terms & Definitions** (glossary format)
4) **One Memorable Analogy**
5) **Quick Cheat-Sheet Rule**""",

    "practice": """Create an interactive set of 3 progressive practice problems for this topic.
Structure:
### 🏋️ Problem 1: Conceptual Warm-up
- **Problem Statement**
- **Hint:** [Helpful hint without giving away the answer]
- **Approach Strategy:** [Guidance on how to think through it]

### 🏋️ Problem 2: Applied Challenge
- **Problem Statement**
- **Hint:** [Helpful hint]
- **Approach Strategy:** [Solving method]

### 🏋️ Problem 3: Advanced Scenario
- **Problem Statement**
- **Hint:** [Deep reasoning hint]
- **Approach Strategy:** [Analysis needed]

Ask the student to submit their attempt or solution to any of the problems in the chat!"""
}

RETEACH_PROMPT = """The student answered flashcard questions on "{topic}" incorrectly.
They seem to struggle with this concept. Please reteach it using:
1. A completely different approach or analogy than before
2. A simpler, more concrete example
3. A visual or step-by-step breakdown
4. Check understanding with one simple question at the end
Be encouraging — mistakes are part of learning!"""

JOURNEY_SUMMARY_PROMPT = """The student has finished their study session. Here is their progress data:
{progress_data}

Create an encouraging journey summary with:
1. 🎯 Topics mastered today
2. 📊 Quiz performance breakdown  
3. 💪 Strengths identified
4. 📚 Areas to revisit
5. 🗺️ Recommended next steps (3-5 specific topics to explore)
6. 🌟 Motivational closing message

Keep it warm, personal, and motivating."""


# ─── AI Agent Class ────────────────────────────────────────────────────────────

class AITutorAgent:
    def __init__(self, understanding_level: float = 0.5, language: str = "en"):
        self.model_name = "gemini-3.1-flash-lite"
        self.understanding_level = understanding_level
        self.language = language

    def _generate_content(self, contents, config=None):
        """Generate content with automatic model rotation across fallbacks."""
        models_to_try = [self.model_name] + [m for m in FALLBACK_MODELS if m != self.model_name]
        last_err = None
        for model in models_to_try:
            try:
                if config:
                    resp = client.models.generate_content(model=model, contents=contents, config=config)
                else:
                    resp = client.models.generate_content(model=model, contents=contents)
                self.model_name = model
                return resp
            except Exception as e:
                last_err = e
                continue
        raise last_err or RuntimeError("All Gemini models failed")

    def _chat_message(self, history: list, prompt: str) -> str:
        """Send chat message with automatic model rotation across fallbacks."""
        models_to_try = [self.model_name] + [m for m in FALLBACK_MODELS if m != self.model_name]
        last_err = None
        for model in models_to_try:
            try:
                chat = client.chats.create(model=model, history=history)
                resp = chat.send_message(prompt)
                self.model_name = model
                return resp.text
            except Exception as e:
                last_err = e
                continue
        raise last_err or RuntimeError("All Gemini models failed")

    def _build_system_context(self, response_type: str) -> str:
        level_desc = (
            "beginner level" if self.understanding_level < 0.4
            else "intermediate level" if self.understanding_level < 0.7
            else "advanced level"
        )
        lang_note = (
            f"\n\nIMPORTANT: Respond in {self._language_name()} language. "
            f"Use natural {self._language_name()} — not a word-by-word translation."
            if self.language != "en" else ""
        )
        return (
            BASE_SYSTEM
            + f"\n\nCurrent student level: {level_desc} (score: {self.understanding_level:.1f})"
            + f"\n\nResponse style: {RESPONSE_TYPE_PROMPTS.get(response_type, RESPONSE_TYPE_PROMPTS['explanation'])}"
            + lang_note
        )

    def _language_name(self) -> str:
        names = {
            "hi": "Hindi", "mr": "Marathi", "bn": "Bengali",
            "gu": "Gujarati", "ta": "Tamil", "te": "Telugu",
            "kn": "Kannada", "pa": "Punjabi", "en": "English"
        }
        return names.get(self.language, "English")

    def _format_history(self, history: list[dict]) -> list:
        """Convert DB messages to Gemini chat format."""
        formatted = []
        for msg in history[-12:]:  # Last 12 messages for context window
            role = "user" if msg["role"] == "user" else "model"
            formatted.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        return formatted

    def get_response(
        self,
        user_input: str,
        topic: str,
        response_type: str,
        history: list[dict]
    ) -> str:
        """Main method: get AI response with full context."""
        system_ctx = self._build_system_context(response_type)
        full_prompt = f"{system_ctx}\n\n---\n[Topic: {topic}]\n\n{user_input}"

        chat_history = self._format_history(history)

        return self._chat_message(chat_history, full_prompt)

    def generate_flashcards(self, topic: str, content: str, count: int = 5) -> list[dict]:
        """Generate quiz flashcards from recent content in MCQ format."""
        prompt = f"""Based on this content about "{topic}":
---
{content[:2000]}
---

Generate exactly {count} interactive flashcard quiz questions to test understanding.
Format each question as a Multiple Choice Question (MCQ) with 4 distinct options (labeled A), B), C), D)).

Question Type Rules:
1. Standard Single-Option MCQ ("type": "mcq"):
   - EXACTLY ONE option is correct out of 4.
   - The other 3 options MUST be plausible but definitely incorrect distractors.
   - "answer" must be a single uppercase letter ("A", "B", "C", or "D").
   - NEVER have multiple correct answers in a standard mcq.

2. Multiple-Option MCQ ("type": "multiple"):
   - Use ONLY when a question legitimately has multiple correct answers/components (e.g. "Which of the following are primary characteristics of X? (Select all that apply)").
   - "answer" must be a JSON array of all correct option letters, e.g. ["A", "C"].
   - Explicitly include "(Select all that apply)" in the question text.

Respond ONLY with a JSON array (no markdown code blocks, no extra text):
[
  {{
    "type": "mcq",
    "question": "What is the primary function of...?",
    "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
    "answer": "A",
    "explanation": "Clear explanation of why A is correct and why the other choices are incorrect.",
    "topic": "{topic}"
  }},
  {{
    "type": "multiple",
    "question": "Which of the following are core characteristics of...? (Select all that apply)",
    "options": ["A) characteristic 1", "B) distractor 1", "C) characteristic 2", "D) distractor 2"],
    "answer": ["A", "C"],
    "explanation": "Clear explanation of why A and C are correct, and why B and D are incorrect.",
    "topic": "{topic}"
  }}
]

Rules:
1. Return ONLY a valid JSON array of objects.
2. The vast majority (or all) of questions should be single-choice "type": "mcq" with STRICTLY ONE correct option.
3. If and only if a question has multiple valid answers, use "type": "multiple", set "answer" as an array of correct letters (e.g. ["A", "C"]), and append "(Select all that apply)" to the question.
4. "options" must contain 4 distinct choices labeled A), B), C), D).
5. Never use ambiguous distractors or options like "None of the above" or "All of the above".
6. "explanation" must clearly explain the reasoning.
"""

        response = self._generate_content(contents=prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        text = re.sub(r"```json\s*|\s*```", "", text).strip()
        try:
            cards = json.loads(text)
        except json.JSONDecodeError:
            # Fallback: extract JSON array pattern
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                try:
                    cards = json.loads(match.group())
                except Exception:
                    cards = []
            else:
                cards = []
        
        # Post-process cards to ensure type safety and randomize options
        import random
        for card in cards:
            if not isinstance(card, dict):
                continue

            raw_type = card.get("type", "mcq")
            raw_answer = card.get("answer")
            is_multiple = (
                raw_type in ("multiple", "multi_select")
                or isinstance(raw_answer, list)
                or bool(card.get("is_multiple"))
            )

            if is_multiple:
                card["type"] = "multiple"
                card["is_multiple"] = True
            elif "options" in card and isinstance(card["options"], list) and len(card["options"]) > 0:
                card["type"] = "mcq"
                card["is_multiple"] = False
            else:
                card["type"] = "text"
                card["is_multiple"] = False
            
            # Shuffle options and map correct letters
            if card["type"] in ("mcq", "multiple") and isinstance(card.get("options"), list) and len(card["options"]) == 4:
                clean_opts = [re.sub(r"^[A-D]\)\s*", "", opt).strip() for opt in card["options"]]
                
                # Determine original correct indices (0..3)
                correct_indices = set()
                if is_multiple:
                    if isinstance(raw_answer, list):
                        for a in raw_answer:
                            m = re.match(r"^([A-D])", str(a).strip().upper())
                            if m:
                                correct_indices.add(ord(m.group(1)) - ord('A'))
                    elif isinstance(raw_answer, str):
                        for m in re.finditer(r"\b([A-D])\b", raw_answer.upper()):
                            correct_indices.add(ord(m.group(1)) - ord('A'))
                else:
                    ans_str = str(raw_answer or "").strip().upper()
                    m = re.match(r"^([A-D])", ans_str)
                    if m:
                        correct_indices.add(ord(m.group(1)) - ord('A'))
                    else:
                        for i, opt in enumerate(card["options"]):
                            clean_opt = re.sub(r"^[A-D]\)\s*", "", opt).strip().lower()
                            if ans_str.lower() in clean_opt or clean_opt in ans_str.lower():
                                correct_indices.add(i)
                                break
                    if not correct_indices:
                        correct_indices.add(0)  # default fallback

                # Create zipped list to track indices during shuffle
                zipped = list(enumerate(clean_opts))
                random.shuffle(zipped)
                
                new_options = []
                new_correct_letters = []
                for new_idx, (old_idx, text_val) in enumerate(zipped):
                    letter = chr(ord('A') + new_idx)
                    new_options.append(f"{letter}) {text_val}")
                    if old_idx in correct_indices:
                        new_correct_letters.append(letter)
                
                new_correct_letters.sort()
                card["options"] = new_options
                if is_multiple:
                    card["answer"] = new_correct_letters if new_correct_letters else ["A"]
                else:
                    card["answer"] = new_correct_letters[0] if new_correct_letters else "A"

        # Randomize the sequence order of questions
        random.shuffle(cards)
        return cards

    def evaluate_answer(self, question: str, correct_answer: str, user_answer: str) -> dict:
        """Evaluate a student's flashcard answer."""
        prompt = f"""Evaluate this student answer:
Question: {question}
Correct answer: {correct_answer}
Student answer: {user_answer}

Respond ONLY with JSON (no markdown):
{{"is_correct": true/false, "score": 0.0-1.0, "feedback": "brief encouraging feedback", "explanation": "what was right/wrong"}}

Be generous — partial credit if they got the core idea. Score 1.0 = perfect, 0.5 = partial, 0.0 = wrong."""

        response = self._generate_content(contents=prompt)
        text = response.text.strip()
        text = re.sub(r"```json\s*|\s*```", "", text).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback evaluation
            user_lower = user_answer.lower()
            correct_lower = correct_answer.lower()
            key_words = set(correct_lower.split()) & set(user_lower.split())
            score = min(len(key_words) / max(len(correct_lower.split()), 1), 1.0)
            return {
                "is_correct": score > 0.6,
                "score": score,
                "feedback": "Good effort!" if score > 0.4 else "Keep trying!",
                "explanation": f"Key concepts: {correct_answer}"
            }

    def reteach_topic(self, topic: str, history: list[dict]) -> str:
        """Reteach a topic the student struggled with, using a different approach."""
        system_ctx = self._build_system_context("explanation")
        reteach = RETEACH_PROMPT.format(topic=topic)
        full_prompt = f"{system_ctx}\n\n{reteach}"

        chat_history = self._format_history(history)
        return self._chat_message(chat_history, full_prompt)

    def generate_journey_summary(self, progress_data: dict) -> str:
        """Generate an end-of-session journey summary."""
        prompt = JOURNEY_SUMMARY_PROMPT.format(progress_data=json.dumps(progress_data, indent=2))
        response = self._generate_content(contents=prompt)
        return response.text

    def parse_roadmap(self, response_text: str) -> Optional[dict]:
        """Extract roadmap JSON from model response."""
        match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            return None

    def update_understanding(self, quiz_scores: list[float]) -> float:
        """Update understanding level based on quiz performance."""
        if not quiz_scores:
            return self.understanding_level
        avg_score = sum(quiz_scores) / len(quiz_scores)
        # Weighted update: 70% existing + 30% new quiz performance
        new_level = (self.understanding_level * 0.7) + (avg_score * 0.3)
        self.understanding_level = round(min(max(new_level, 0.0), 1.0), 2)
        return self.understanding_level

    def generate_roadmap(self, topic: str) -> dict:
        """Generate a structured, progressive learning roadmap for a topic."""
        prompt = f"""Create a clear, progressive learning roadmap for "{topic}".
The roadmap must have 4 to 6 bite-sized progressive milestones.
For each step, provide:
1. "step": milestone number (1, 2, 3...)
2. "title": concise, engaging subtopic title
3. "content": short 1-sentence summary of the milestone scope
4. "what_will_be_explained": an array of 2-3 brief bullet points stating what topics/agenda the AI will cover in this step (NOTE: only state what topics will be explained, do not provide the actual lesson content).
5. "duration": estimated time like "10-15 mins"

Respond ONLY with a valid JSON object wrapped in ```json ``` with this structure:
{{
  "topic": "{topic}",
  "overview": "Clear overview of how the student will master this topic step-by-step",
  "steps": [
    {{
      "step": 1,
      "title": "Clear concise subtopic title",
      "content": "Short summary of this milestone",
      "what_will_be_explained": [
        "Core definitions and boundaries of this concept",
        "Intuitive real-world analogy and mechanism breakdown",
        "Key takeaways needed to score >=70% on the flashcard check"
      ],
      "duration": "10-15 mins"
    }}
  ]
}}"""
        try:
            response = self._generate_content(contents=prompt)
            parsed = self.parse_roadmap(response.text)
            if parsed and parsed.get("steps"):
                for s in parsed["steps"]:
                    if not s.get("what_will_be_explained"):
                        s["what_will_be_explained"] = [
                            f"Core principles and definitions of {s.get('title', 'this topic')}",
                            "Real-world intuitive analogy and mechanism breakdown",
                            "Key concepts tested in the 70% checkpoint quiz"
                        ]
                return parsed
        except Exception:
            pass
        return self._fallback_roadmap(topic)

    def _fallback_roadmap(self, topic: str) -> dict:
        return {
            "topic": topic,
            "overview": f"A step-by-step roadmap to master {topic} through conceptual portions and checkpoint flashcards.",
            "steps": [
                {
                    "step": 1,
                    "title": f"Foundations & Core Ideas of {topic}",
                    "content": f"Understand the fundamental definitions, why {topic} matters, and key terms.",
                    "what_will_be_explained": [
                        f"Foundational terminology and scope of {topic}",
                        "Intuitive real-world mental model to anchor the concept",
                        "Essential definitions tested in the 70% checkpoint quiz"
                    ],
                    "duration": "10 mins",
                },
                {
                    "step": 2,
                    "title": f"Core Mechanics & Operating Principles",
                    "content": f"Explore how {topic} works under the hood with essential relationships and rules.",
                    "what_will_be_explained": [
                        f"Step-by-step breakdown of how {topic} operates internally",
                        "Interactions between core components and rules",
                        "Common misconceptions learners encounter"
                    ],
                    "duration": "15 mins",
                },
                {
                    "step": 3,
                    "title": f"Practical Application & Real-World Use Cases",
                    "content": f"See {topic} applied in real-world scenarios and solve concrete practical problems.",
                    "what_will_be_explained": [
                        f"Real industry & practical systems utilizing {topic}",
                        "Concrete applied problem walkthrough",
                        "Decision rules for when to use these techniques"
                    ],
                    "duration": "15 mins",
                },
                {
                    "step": 4,
                    "title": f"Advanced Nuances, Edge Cases & Best Practices",
                    "content": f"Master subtle distinctions, optimization techniques, and common pitfalls in {topic}.",
                    "what_will_be_explained": [
                        f"Corner cases, edge conditions, and boundaries of {topic}",
                        "Optimization strategies and efficiency trade-offs",
                        "Synthesized master takeaways before final review"
                    ],
                    "duration": "20 mins",
                },
            ],
        }

    def teach_roadmap_step(self, topic: str, step: dict, step_index: int, total_steps: int) -> str:
        """Teach a specific milestone portion with an exhaustive, deep learning masterclass lesson."""
        step_num = step.get("step", step_index + 1)
        step_title = step.get("title", f"Milestone {step_num}")
        step_desc = step.get("content", "")
        agenda = step.get("what_will_be_explained", [])
        agenda_str = "\n".join([f"- {item}" for item in agenda]) if agenda else ""

        prompt = f"""You are conducting an in-depth Deep Learning masterclass for:
Topic: "{topic}"
Milestone {step_num} of {total_steps}: "{step_title}"
Description: "{step_desc}"
Specific Agenda Topics:
{agenda_str}

CRITICAL REQUIREMENT: Do NOT provide a brief or shallow summary. The student specifically requested a comprehensive, detailed, high-yield Deep Learning explanation.
Generate a thorough, richly detailed lesson structured with clear, engaging sections:

# 🌟 Deep Learning: {step_title}

### 1. Conceptual Foundation & Intuitive Mental Model
- Explain where "{step_title}" fits into the broader discipline of "{topic}".
- Provide a detailed, intuitive real-world analogy that makes the concept unforgettable.
- Clearly articulate the fundamental problem this concept solves and why it matters.

### 2. In-Depth Mechanics & Technical Architecture
- Provide a rigorous, step-by-step breakdown of how "{step_title}" works under the hood.
- Define all core terminology, parameters, and foundational rules clearly.
- Walk through the underlying workflow, logic, transformations, or equations in detail.
- Provide a structured markdown breakdown (e.g. numbered phases or bullet points) explaining each layer of the mechanism.

### 3. Concrete Real-World Industry Application & Case Study
- Walk through a realistic, concrete end-to-end industry scenario or practical implementation walkthrough.
- Describe what the inputs look like, how they are processed, and what the final output or decision is.
- Discuss practical trade-offs, architecture decisions, and best practices used by senior engineers and scientists.

### 4. Critical Traps, Edge Cases & Common Misconceptions
- Detail 2-3 frequent misconceptions and dangerous pitfalls learners encounter with "{step_title}".
- Explain precisely WHY students make these mistakes and provide the correct mental model to avoid them.
- Highlight subtle edge cases to watch out for in exams and production systems.

### 5. Essential Checkpoints to Ace the 70% Flashcard Quiz
- Provide 4-5 bulleted, high-yield summary checkpoints synthesizing the core facts, definitions, and rules from this lesson.
- These checkpoints should directly prepare the student to pass the flashcard test with at least 70%.

Conclude with:
"💡 **Ready to test your understanding?** Click the **Flashcards** button above. Score at least **70%** on the flashcard quiz to complete this milestone on your roadmap!"
"""

        system_ctx = self._build_system_context("explanation")
        full_prompt = f"{system_ctx}\n\n---\n[Deep Learning Masterclass: {topic} | Milestone {step_num}: {step_title}]\n\n{prompt}"
        try:
            response = self._generate_content(
                contents=full_prompt,
                config=types.GenerateContentConfig(temperature=0.7)
            )
            return response.text
        except Exception:
            return (
                f"# 🌟 Deep Learning: Milestone {step_num} - {step_title}\n\n"
                f"### 1. Conceptual Foundation\n"
                f"{step_desc}\n\n"
                f"In mastering **{topic}**, understanding **{step_title}** is foundational. It provides the core mechanism that allows systems to function reliably and scalably.\n\n"
                f"### 2. In-Depth Technical Breakdown\n"
                f"- **Architecture & Flow:** Data and logic flow through defined transformation stages.\n"
                f"- **Core Rules:** Consistency, boundary conditions, and invariant states must be maintained.\n"
                f"- **Mechanism:** Inputs are validated, processed according to core principles, and produce verifiable outputs.\n\n"
                f"### 3. Practical Real-World Context\n"
                f"In production environments, applying {step_title} ensures robust system behavior and predictable outcomes under variable loads.\n\n"
                f"### 4. Critical Traps & Misconceptions\n"
                f"- Never assume default configurations handle edge cases automatically.\n"
                f"- Avoid conflating intermediate representations with final evaluation states.\n\n"
                f"### 5. Checkpoints to Remember\n"
                f"- Core definitions and principles of {step_title}.\n"
                f"- How {step_title} connects to {topic}.\n"
                f"- The primary trade-offs and best practices.\n\n"
                f"💡 **Ready to test your understanding?** Click the **Flashcards** button above. Score at least **70%** on the flashcard quiz to complete this milestone on your roadmap!"
            )

    def generate_qa_overview(self, topic: str) -> str:
        """Generate a curated high-yield Q&A lesson for the topic."""
        prompt = f"""The student is starting {topic} in Question & Answer (Q&A) Mode.
Do NOT give a general monologue lecture. Instead, provide a curated set of 4-5 of the most essential, high-yield conceptual questions and comprehensive answers on "{topic}".

Format each clearly with distinct markdown headers:
### ❓ Q1: [Core Fundamental Question]
**Answer:** [Clear, direct, and comprehensive answer]
**Key Concept:** [Underlying concept tested]

### ❓ Q2: [Mechanism or "How it Works" Question]
**Answer:** [Step-by-step conceptual answer]
**Key Concept:** [Underlying concept tested]

### ❓ Q3: [Practical Application or Real Scenario Question]
**Answer:** [Real-world practical answer]
**Key Concept:** [Underlying concept tested]

### ❓ Q4: [Common Trap or Misconception Question]
**Answer:** [Clarifying answer dispelling the misconception]
**Key Concept:** [Underlying concept tested]

Conclude with: "💡 *Have a specific question? Ask anything below to get a dedicated concept breakdown!*"
"""
        system_ctx = self._build_system_context("qa")
        full_prompt = f"{system_ctx}\n\n---\n[Topic: {topic}]\n\n{prompt}"
        try:
            response = self._generate_content(contents=full_prompt)
            return response.text
        except Exception:
            return self._fallback_qa(topic)

    def _fallback_qa(self, topic: str) -> str:
        return (
            f"### 🎯 Essential Questions & Answers for {topic}\n\n"
            f"#### ❓ Q1: What is the fundamental concept and purpose of {topic}?\n"
            f"**Answer:** {topic} is a structured domain designed to model, analyze, and solve problems systematically using verified foundational principles.\n"
            f"**Key Concept:** Core definitions & rationale\n\n"
            f"#### ❓ Q2: How does {topic} function in practical scenarios?\n"
            f"**Answer:** It applies systematic rules, pipelines, or relationships that transform inputs into clear, verifiable outcomes.\n"
            f"**Key Concept:** Internal mechanisms & operational flow\n\n"
            f"#### ❓ Q3: What is a classic real-world application of {topic}?\n"
            f"**Answer:** In modern industry, {topic} is used to automate decisions, optimize resource usage, and build dependable solutions.\n"
            f"**Key Concept:** Real-world problem solving\n\n"
            f"#### ❓ Q4: What common mistake should learners avoid in {topic}?\n"
            f"**Answer:** Rushing into complex variations without mastering the foundational basics and operational rules first.\n"
            f"**Key Concept:** Pitfall prevention\n\n"
            f"💡 *Ask any specific question in the box below to get an in-depth conceptual breakdown!*"
        )

    def generate_summary(self, topic: str) -> str:
        """Generate a crisp, structured revision sheet."""
        prompt = f"""Provide a crisp, comprehensive revision summary of "{topic}".
Structure:
1) **One-line Definition** (clear, memorable)
2) **5 Core Takeaways** (bullet points highlighting essential insights)
3) **3 Essential Terms & Definitions** (glossary format)
4) **One Memorable Analogy**
5) **Quick Cheat-Sheet Rule**"""
        system_ctx = self._build_system_context("summary")
        full_prompt = f"{system_ctx}\n\n---\n[Topic: {topic}]\n\n{prompt}"
        try:
            response = self._generate_content(contents=full_prompt)
            return response.text
        except Exception:
            return (
                f"### ⚡ Quick Summary: {topic}\n\n"
                f"**Definition:** {topic} is a core discipline focusing on structured principles and real-world methods.\n\n"
                f"**Key Takeaways:**\n"
                f"- Understand the foundational ideas and terminology.\n"
                f"- Observe how internal rules govern its behavior.\n"
                f"- Connect concepts to practical examples.\n"
                f"- Notice common edge cases and limitations.\n"
                f"- Practice regularly to reinforce memory.\n\n"
                f"**Essential Terms:**\n"
                f"- **Core Principle:** The underlying premise of {topic}.\n"
                f"- **Mechanism:** The workflow that drives outcomes.\n"
                f"- **Application:** Where and how it is used effectively.\n\n"
                f"**Analogy:** Master {topic} like building a sturdy framework—the stronger the foundation, the higher you can climb."
            )

    def generate_practice(self, topic: str) -> str:
        """Generate interactive practice problems."""
        prompt = f"""Create an interactive set of 3 progressive practice problems for "{topic}".
Structure:
### 🏋️ Problem 1: Conceptual Warm-up
- **Problem Statement**
- **Hint:** [Helpful hint without giving away the answer]
- **Approach Strategy:** [Guidance on how to think through it]

### 🏋️ Problem 2: Applied Challenge
- **Problem Statement**
- **Hint:** [Helpful hint]
- **Approach Strategy:** [Solving method]

### 🏋️ Problem 3: Advanced Scenario
- **Problem Statement**
- **Hint:** [Deep reasoning hint]
- **Approach Strategy:** [Analysis needed]

Ask the student to submit their attempt or solution to any of the problems in the chat!"""
        system_ctx = self._build_system_context("practice")
        full_prompt = f"{system_ctx}\n\n---\n[Topic: {topic}]\n\n{prompt}"
        try:
            response = self._generate_content(contents=full_prompt)
            return response.text
        except Exception:
            return (
                f"### 🏋️ Practice Problems for {topic}\n\n"
                f"#### Problem 1: Conceptual Warm-up\n"
                f"State the foundational premise of {topic} in your own words and explain one scenario where it applies.\n"
                f"*Hint: Focus on the main objective and how it achieves results.*\n\n"
                f"#### Problem 2: Applied Challenge\n"
                f"How would you apply {topic} to resolve an unexpected error or inconsistency in a real-world project?\n"
                f"*Hint: Trace the input pipeline back to first principles.*\n\n"
                f"#### Problem 3: Optimization Analysis\n"
                f"What key trade-offs must you consider when choosing this approach over alternative methods?\n"
                f"*Hint: Consider speed, complexity, and resource constraints.*\n\n"
                f"👉 **Type your answer to any problem below to get detailed feedback!**"
            )
