const chatWindow = document.querySelector("#chatWindow");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const quizDialog = document.querySelector("#quizDialog");
const quizBody = document.querySelector("#quizBody");
const selectionNoteBtn = document.querySelector("#selectionNoteBtn");
let selectedTutorText = "";

if (chatWindow) {
    hydrateExistingMessages();
    startInitialLesson();
    setupSelectionNotes();
}

function hydrateExistingMessages() {
    chatWindow.querySelectorAll(".message").forEach((node) => {
        const role = [...node.classList].find((item) => ["assistant", "user", "system"].includes(item));
        node.innerHTML = renderMessageContent({ role, content: node.textContent || "" });
    });
}

async function startInitialLesson() {
    const hasAssistant = Boolean(chatWindow.querySelector(".message.assistant"));
    if (hasAssistant) return;
    chatWindow.insertAdjacentHTML(
        "beforeend",
        '<article class="message system" id="lessonLoading">Preparing your first lesson...</article>'
    );
    const response = await fetch("/api/lesson/start", { method: "POST" });
    const data = await response.json();
    document.querySelector("#lessonLoading")?.remove();
    if (data.messages) renderMessages(data.messages);
}

function renderMessages(messages) {
    if (!chatWindow) return;
    chatWindow.innerHTML = messages
        .map((message) => `<article class="message ${message.role}">${renderMessageContent(message)}</article>`)
        .join("");
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderMessageContent(message) {
    if (message.role === "assistant") {
        return formatTutorText(message.content);
    }
    return escapeHtml(message.content);
}

function formatTutorText(value) {
    const lines = String(value)
        .replaceAll("\r\n", "\n")
        .replace(/```(?:\w+)?/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    let sectionIndex = 0;
    const parts = lines.map((rawLine) => {
        const line = rawLine.replace(/^#{1,6}\s*/, "").replace(/^\*{1,2}\s*/, "").replace(/\*{1,2}$/, "").trim();
        const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
        if (numbered) {
            sectionIndex += 1;
            const colorClass = `tone-${((sectionIndex - 1) % 4) + 1}`;
            return `<h3 class="tutor-section-title ${colorClass}"><span>${numbered[1]}</span>${inlineFormat(numbered[2])}</h3>`;
        }

        const markdownHeading = rawLine.match(/^#{1,6}\s+(.+)$/);
        if (markdownHeading) {
            sectionIndex += 1;
            const colorClass = `tone-${((sectionIndex - 1) % 4) + 1}`;
            return `<h3 class="tutor-section-title ${colorClass}">${inlineFormat(markdownHeading[1])}</h3>`;
        }

        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
            return `<div class="tutor-bullet">${inlineFormat(bullet[1])}</div>`;
        }

        const subtopic = line.match(/^([A-Z][A-Za-z0-9 /()&-]{2,54}):\s+(.+)$/);
        if (subtopic) {
            return `<p class="tutor-subtopic"><strong>${inlineFormat(subtopic[1])}</strong><span>${inlineFormat(subtopic[2])}</span></p>`;
        }

        return `<p>${inlineFormat(line)}</p>`;
    });

    return `<div class="tutor-content">${parts.join("")}</div>`;
}

function inlineFormat(value) {
    return escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = "";
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (data.redirect) {
        window.location.href = data.redirect;
        return;
    }
    if (data.quiz) {
        await openQuiz();
        return;
    }
    if (data.messages) renderMessages(data.messages);
});

document.querySelector("#quizStart")?.addEventListener("click", openQuiz);
document.querySelector("#closeQuiz")?.addEventListener("click", () => quizDialog?.close());

async function openQuiz() {
    if (!quizDialog || !quizBody) return;
    quizBody.innerHTML = "<p>Preparing flashcards...</p>";
    quizDialog.showModal();
    const response = await fetch("/api/quiz/start", { method: "POST" });
    renderQuiz(await response.json());
}

function renderQuiz(data) {
    if (!quizBody) return;
    if (data.done) {
        quizBody.innerHTML = `
            <div class="quiz-question">
                <strong>Result: ${data.correct}/${data.total} correct</strong><br>
                Score: ${data.score}%<br>
                Understanding: ${data.understanding}%
            </div>
            <button class="primary-btn" type="button" onclick="window.location.reload()">Continue Learning</button>
        `;
        return;
    }
    if (!data.card) {
        quizBody.innerHTML = "<p>Prashiksha could not create flashcards yet. Learn a little more, then try again.</p>";
        return;
    }

    const isMcq = data.card.type === "mcq";
    let answerHtml = "";

    if (isMcq && data.card.options) {
        answerHtml = `
            <div class="mcq-options">
                ${data.card.options.map(opt => `
                    <button class="mcq-option-btn" type="button" data-val="${escapeHtml(opt)}">
                        ${escapeHtml(opt)}
                    </button>
                `).join("")}
            </div>
            <input type="hidden" id="quizAnswer" value="">
        `;
    } else {
        answerHtml = `<textarea id="quizAnswer" placeholder="Type your answer here..."></textarea>`;
    }

    quizBody.innerHTML = `
        <p class="eyebrow">Question ${data.index + 1} of ${data.total}</p>
        <div class="quiz-question">${escapeHtml(data.card.question)}</div>
        ${answerHtml}
        <div class="quiz-actions">
            <button class="primary-btn" id="submitQuizAnswer" type="button">Submit Answer</button>
            <button class="ghost-btn" id="skipQuizAnswer" type="button">Skip</button>
        </div>
    `;

    if (isMcq) {
        document.querySelectorAll(".mcq-option-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".mcq-option-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                const answerInput = document.querySelector("#quizAnswer");
                if (answerInput) answerInput.value = btn.getAttribute("data-val") || "";
            });
        });
    }

    document.querySelector("#submitQuizAnswer")?.addEventListener("click", () => submitQuizAnswer(data, false));
    document.querySelector("#skipQuizAnswer")?.addEventListener("click", () => submitQuizAnswer(data, true));
}

async function submitQuizAnswer(currentPayload, skip = false) {
    const answer = document.querySelector("#quizAnswer")?.value || "";
    if (!skip && !answer) {
        alert("Please select or type an answer first.");
        return;
    }
    quizBody.insertAdjacentHTML("beforeend", "<p class='checking-text'>Checking...</p>");
    const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, skip }),
    });
    const data = await response.json();
    if (data.last_result) {
        const result = data.last_result;
        const card = data.answered_card || currentPayload.card;
        const userAns = skip ? "Skipped" : (data.user_answer || answer || "(No Answer)");
        
        let statusText = "";
        let badgeClass = "";
        
        if (result.is_correct) {
            statusText = `Correct (${Math.round(result.score * 100)}%)`;
            badgeClass = "badge-correct";
        } else if (result.score > 0) {
            statusText = `Partially Correct (${Math.round(result.score * 100)}%)`;
            badgeClass = "badge-partial";
        } else {
            statusText = `Incorrect (0%)`;
            badgeClass = "badge-incorrect";
        }
        
        const btnText = data.done ? "Finish Quiz" : "Next Card";

        quizBody.innerHTML = `
            <p class="eyebrow">Result</p>
            <div class="quiz-result-wrapper">
                <div class="quiz-result-item">
                    <strong>Question:</strong>
                    <div class="quiz-val">${escapeHtml(card.question)}</div>
                </div>
                
                <div class="quiz-result-item">
                    <strong>Your Answer:</strong>
                    <div class="quiz-val user-val">${escapeHtml(userAns)}</div>
                </div>
                
                <div class="quiz-result-item">
                    <strong>Grading:</strong>
                    <div class="quiz-val">
                        <span class="quiz-badge ${badgeClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="quiz-result-item">
                    <strong>Feedback:</strong>
                    <div class="quiz-val feedback-val">${escapeHtml(result.feedback || "Review expected response below.")}</div>
                </div>
                
                <div class="quiz-result-item">
                    <strong>Correct/Reference Answer:</strong>
                    <div class="quiz-val correct-val">${escapeHtml(result.explanation || card.answer || "")}</div>
                </div>
            </div>
            
            <button class="primary-btn" id="nextQuizCard" type="button">${btnText}</button>
        `;
        document.querySelector("#nextQuizCard")?.addEventListener("click", () => renderQuiz(data));
        return;
    }
    renderQuiz(data);
}

document.querySelector("#completeRoadmap")?.addEventListener("click", async () => {
    await fetch("/api/roadmap/complete", { method: "POST" });
    window.location.reload();
});

function setupSelectionNotes() {
    document.addEventListener("selectionchange", () => {
        if (!selectionNoteBtn) return;
        const selection = window.getSelection();
        const text = selection?.toString().trim() || "";
        const anchor = selection?.anchorNode?.parentElement;
        const insideAssistant = anchor?.closest?.(".message.assistant");
        if (text.length > 2 && insideAssistant && selection.rangeCount > 0) {
            selectedTutorText = text;
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            selectionNoteBtn.style.left = `${Math.min(rect.left, window.innerWidth - 190)}px`;
            selectionNoteBtn.style.top = `${Math.max(rect.top - 54, 12)}px`;
            selectionNoteBtn.classList.add("is-visible");
        } else {
            selectionNoteBtn.classList.remove("is-visible");
        }
    });

    selectionNoteBtn?.addEventListener("click", async () => {
        if (!selectedTutorText) return;
        selectionNoteBtn.disabled = true;
        selectionNoteBtn.innerHTML = '<i data-lucide="loader"></i> Saving...';
        const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: selectedTutorText }),
        });
        if (response.ok) {
            const data = await response.json();
            const notesFabSpan = document.querySelector(".notes-fab span");
            if (notesFabSpan && data.count !== undefined) {
                notesFabSpan.textContent = data.count;
            }
            selectionNoteBtn.innerHTML = '<i data-lucide="check"></i> Saved';
            setTimeout(() => {
                selectionNoteBtn.classList.remove("is-visible");
                selectionNoteBtn.disabled = false;
                selectionNoteBtn.innerHTML = '<i data-lucide="notebook-pen"></i> Save to Notes';
                lucide.createIcons();
            }, 900);
        } else {
            selectionNoteBtn.disabled = false;
            selectionNoteBtn.innerHTML = '<i data-lucide="notebook-pen"></i> Try again';
        }
        lucide.createIcons();
    });
}
