const chatWindow = document.querySelector("#chatWindow");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const quizDialog = document.querySelector("#quizDialog");
const quizBody = document.querySelector("#quizBody");
const selectionNoteBtn = document.querySelector("#selectionNoteBtn");
let selectedTutorText = "";

const roadmapWrapper = document.querySelector("#roadmapWrapper");

if (chatWindow || roadmapWrapper) {
    if (chatWindow) {
        hydrateExistingMessages();
        // setupSelectionNotes unified into setupTextSelectionNote();
        setupHeaderScrollHide();
    }
    startInitialLesson();
}

function hydrateExistingMessages() {
    chatWindow?.querySelectorAll(".message").forEach((node) => {
        const role = [...node.classList].find((item) => ["assistant", "user", "system"].includes(item));
        node.innerHTML = renderMessageContent({ role, content: node.textContent || "" });
    });
}

async function startInitialLesson() {
    setupRoadmapListeners();
    setupRoadmapArrows();
    setupQaChips();
    const isRoadmap = Boolean(document.querySelector("#roadmapWrapper"));
    const hasRoadmapCards = Boolean(document.querySelector(".roadmap-node-card"));
    const hasAssistant = Boolean(chatWindow?.querySelector(".message.assistant"));

    if (isRoadmap && hasRoadmapCards) {
        return;
    }

    if (hasAssistant && !isRoadmap) return;
    if (!isRoadmap) {
        chatWindow?.insertAdjacentHTML(
            "beforeend",
            '<article class="message system" id="lessonLoading">Preparing your customized lesson...</article>'
        );
    }
    try {
        const response = await fetch("/api/lesson/start", { method: "POST" });
        const data = await response.json();
        document.querySelector("#lessonLoading")?.remove();
        if (data.messages && data.messages.length > 0) {
            document.querySelector("#roadmapEmptyGuide")?.remove();
            renderMessages(data.messages);
        }
        if (data.roadmap_data) {
            renderRoadmap(data.roadmap_data, data.current_roadmap_step, data.completed_milestones);
        }
    } catch (err) {
        console.error("Failed to start initial lesson:", err);
    }
    setupQaChips();
}

function scrollToResponseStart(targetRole = "assistant") {
    if (!chatWindow) return;
    const targetMessages = chatWindow.querySelectorAll(`.message.${targetRole}`);
    if (targetMessages.length > 0) {
        const latest = targetMessages[targetMessages.length - 1];
        // Calculate offset so top of response starts right at top of view
        const containerRect = chatWindow.getBoundingClientRect();
        const targetRect = latest.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + chatWindow.scrollTop;
        chatWindow.scrollTo({
            top: Math.max(relativeTop - 8, 0),
            behavior: "smooth"
        });
        latest.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function renderMessages(messages, scrollToResponse = true) {
    if (!chatWindow) return;
    chatWindow.innerHTML = messages
        .map((message) => `<article class="message ${message.role}">${renderMessageContent(message)}</article>`)
        .join("");
    
    lucide.createIcons();

    if (scrollToResponse) {
        // Place user right at the starting point of the generated response
        setTimeout(() => {
            scrollToResponseStart("assistant");
        }, 60);
    }
}

function renderMessageContent(message) {
    if (message.role === "assistant") {
        return `
            ${formatTutorText(message.content)}
            <div class="message-meta-actions">
                <button type="button" class="msg-action-btn msg-save-note-btn" title="Save this lesson explanation to Quick Notes">
                    <i data-lucide="bookmark-plus"></i>
                    <span>Save to Notes</span>
                </button>
            </div>
        `;
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
    if (data.messages) renderMessages(data.messages, true);
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
        const isRoadmap = Boolean(data.is_roadmap || document.querySelector("#roadmapWrapper"));
        const score = data.score !== undefined ? data.score : 0;
        const passed70 = score >= 70;

        let statusBanner = "";
        let actionButtons = "";

        if (isRoadmap) {
            if (data.roadmap_data) {
                renderRoadmap(data.roadmap_data, data.current_roadmap_step, data.completed_milestones);
            }
            if (passed70) {
                statusBanner = `
                    <div class="milestone-pass-banner success">
                        <div style="font-size: 32px; margin-bottom: 6px;">🎉</div>
                        <strong style="font-size: 18px; color: #15803d;">Milestone Completed!</strong>
                        <p style="margin: 6px 0 0 0; color: #166534; font-size: 14px;">
                            You scored <strong>${score}%</strong> (&ge;70% required). This milestone is now marked completed on your roadmap!
                        </p>
                    </div>
                `;
                actionButtons = `
                    <button class="primary-btn" type="button" id="returnRoadmapBtn"><i data-lucide="map"></i> Return to Roadmap</button>
                    <button class="secondary-btn" type="button" id="closeQuizDone">Continue Learning Here</button>
                `;
            } else {
                statusBanner = `
                    <div class="milestone-pass-banner retry">
                        <div style="font-size: 32px; margin-bottom: 6px;">⚠️</div>
                        <strong style="font-size: 18px; color: #b45309;">Milestone Incomplete</strong>
                        <p style="margin: 6px 0 0 0; color: #92400e; font-size: 14px;">
                            You scored <strong>${score}%</strong>. A score of at least <strong>70%</strong> is required to mark this milestone completed in the roadmap.
                        </p>
                    </div>
                `;
                actionButtons = `
                    <button class="secondary-btn" type="button" id="retryQuizBtn"><i data-lucide="rotate-ccw"></i> Retake Flashcards</button>
                    <button class="ghost-btn" type="button" id="closeQuizDone">Review Lesson First</button>
                `;
            }
        } else {
            statusBanner = `
                <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
                <strong style="font-size: 18px; color: #1a0a4e;">Flashcard Session Complete!</strong>
            `;
            actionButtons = `
                <button class="primary-btn" type="button" id="closeQuizDone">Continue Learning</button>
            `;
        }

        quizBody.innerHTML = `
            <div class="quiz-question" style="text-align: center; padding: 24px;">
                ${statusBanner}
                <div style="display: flex; justify-content: center; gap: 20px; margin: 16px 0;">
                    <div><strong>${data.correct}/${data.total}</strong><br><small style="color: var(--muted)">Correct</small></div>
                    <div><strong style="color: ${passed70 ? '#15803d' : '#b45309'}">${score}%</strong><br><small style="color: var(--muted)">Score</small></div>
                    <div><strong>${data.understanding}%</strong><br><small style="color: var(--muted)">Mastery</small></div>
                </div>
            </div>
            <div class="quiz-actions" style="justify-content: center; gap: 12px; margin-top: 14px;">
                ${actionButtons}
            </div>
        `;
        document.querySelector("#closeQuizDone")?.addEventListener("click", () => {
            quizDialog?.close();
        });
        document.querySelector("#retryQuizBtn")?.addEventListener("click", () => {
            openQuiz();
        });
        document.querySelector("#returnRoadmapBtn")?.addEventListener("click", async () => {
            quizDialog?.close();
            try {
                const res = await fetch("/api/roadmap/view", { method: "POST" });
                const rData = await res.json();
                if (rData.redirect) {
                    window.location.href = rData.redirect;
                    return;
                }
            } catch (err) {
                window.location.href = "/learn";
            }
        });
        lucide.createIcons();
        return;
    }
    if (!data.card) {
        quizBody.innerHTML = "<p>Prashiksha could not create flashcards yet. Learn a little more, then try again.</p>";
        return;
    }

    const card = data.card;
    const isMcq = Boolean(card.options && card.options.length > 0);

    // Parse correct answers
    let correctLetters = [];
    if (Array.isArray(card.answer)) {
        correctLetters = card.answer.map(a => {
            const m = String(a).trim().toUpperCase().match(/^([A-D])/);
            return m ? m[1] : String(a).trim().toUpperCase();
        });
    } else if (typeof card.answer === "string") {
        const matches = card.answer.toUpperCase().match(/\b([A-D])\b/g);
        if (matches && (matches.length > 1 || card.type === "multiple" || card.is_multiple)) {
            correctLetters = matches;
        } else {
            const singleMatch = card.answer.match(/^([A-D])/i);
            correctLetters = [singleMatch ? singleMatch[1].toUpperCase() : card.answer.trim().toUpperCase()];
        }
    }
    // Remove duplicates
    correctLetters = Array.from(new Set(correctLetters)).filter(Boolean);

    const isMultiple = isMcq && (
        card.type === "multiple" ||
        card.type === "multi_select" ||
        Boolean(card.is_multiple) ||
        correctLetters.length > 1
    );

    let optionsHtml = "";
    if (isMcq) {
        if (isMultiple) {
            optionsHtml = `
                <div class="mcq-options is-multiple-options" id="mcqOptionsContainer">
                    ${card.options.map(opt => `
                        <button class="mcq-option-btn multi-select-btn" type="button" data-val="${escapeHtml(opt)}">
                            <span class="mcq-select-indicator checkbox">
                                <i data-lucide="check" style="width: 13px; height: 13px;"></i>
                            </span>
                            <span class="mcq-opt-text">${escapeHtml(opt)}</span>
                        </button>
                    `).join("")}
                </div>
                <div style="margin-top: 14px; display: flex; justify-content: flex-end;" id="multiSubmitWrapper">
                    <button class="primary-btn" id="submitMultiBtn" type="button" style="gap: 8px;">
                        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                        <span>Submit Answer</span>
                    </button>
                </div>
            `;
        } else {
            optionsHtml = `
                <div class="mcq-options" id="mcqOptionsContainer">
                    ${card.options.map(opt => `
                        <button class="mcq-option-btn single-select-btn" type="button" data-val="${escapeHtml(opt)}">
                            <span class="mcq-select-indicator radio"></span>
                            <span class="mcq-opt-text">${escapeHtml(opt)}</span>
                        </button>
                    `).join("")}
                </div>
            `;
        }
    } else {
        optionsHtml = `
            <div style="width: 100%;">
                <textarea id="quizAnswer" placeholder="Type your answer here..."></textarea>
                <button class="primary-btn" id="submitTextQuiz" type="button" style="margin-top: 10px;">Submit Answer</button>
            </div>
        `;
    }

    quizBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <p class="eyebrow" style="margin: 0;">Question ${data.index + 1} of ${data.total}</p>
            ${isMcq ? (isMultiple ? `
                <span class="quiz-type-badge multiple">
                    <i data-lucide="check-square" style="width: 13px; height: 13px;"></i>
                    <span>Multiple Option &bull; Select all that apply</span>
                </span>
            ` : `
                <span class="quiz-type-badge single">
                    <i data-lucide="disc" style="width: 13px; height: 13px;"></i>
                    <span>Single Option &bull; 1 correct answer</span>
                </span>
            `) : ""}
        </div>
        <div class="quiz-question">${escapeHtml(card.question)}</div>

        <div class="quiz-content-layout" id="quizContentLayout">
            ${optionsHtml}
            <div class="quiz-explanation-panel" id="quizExplanationPanel">
                <div class="quiz-explanation-head">
                    <i data-lucide="info" style="width: 16px; height: 16px;"></i>
                    <span>Explanation</span>
                </div>
                <div class="quiz-explanation-text" id="quizExplanationText"></div>
            </div>
        </div>

        <div class="quiz-actions" id="quizFooterActions" style="display: none; align-items: center; justify-content: space-between; margin-top: 16px;">
            <button class="ghost-btn" id="showExplanationBtn" type="button" style="gap: 8px;">
                <i data-lucide="help-circle" style="width: 16px; height: 16px;"></i>
                <span>Explanation</span>
            </button>
            <button class="primary-btn" id="nextQuizBtn" type="button" style="gap: 8px;">
                <span>${data.index + 1 === data.total ? "Finish Flashcards" : "Next Question"}</span>
                <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
            </button>
        </div>
    `;

    lucide.createIcons();

    if (isMcq && isMultiple) {
        let answered = false;
        let answerPromise = null;

        document.querySelectorAll(".mcq-option-btn.multi-select-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (answered) return;
                btn.classList.toggle("is-selected");
                const count = document.querySelectorAll(".mcq-option-btn.multi-select-btn.is-selected").length;
                const submitBtn = document.querySelector("#submitMultiBtn");
                if (submitBtn) {
                    submitBtn.innerHTML = `
                        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                        <span>Submit Answer ${count > 0 ? `(${count} selected)` : ""}</span>
                    `;
                    lucide.createIcons();
                }
            });
        });

        const submitBtn = document.querySelector("#submitMultiBtn");
        submitBtn?.addEventListener("click", () => {
            if (answered) return;
            const selectedBtns = Array.from(document.querySelectorAll(".mcq-option-btn.multi-select-btn.is-selected"));
            if (selectedBtns.length === 0) {
                alert("Please select at least one option before submitting.");
                return;
            }
            answered = true;
            submitBtn.style.display = "none";

            const selectedVals = selectedBtns.map(b => b.getAttribute("data-val") || "");
            const selectedLetters = selectedVals.map(val => {
                const m = val.match(/^([A-D])/i);
                return m ? m[1].toUpperCase() : val.trim().toUpperCase();
            });

            answerPromise = fetch("/api/quiz/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer: selectedLetters.join(", "), answers: selectedLetters, skip: false }),
            }).then(r => r.json());

            // Highlight options:
            // Any option in correctLetters gets opt-correct
            // Any selected option NOT in correctLetters gets opt-wrong
            document.querySelectorAll(".mcq-option-btn.multi-select-btn").forEach(b => {
                b.disabled = true;
                const optVal = b.getAttribute("data-val") || "";
                const matchOpt = optVal.match(/^([A-D])/i);
                const optLetter = matchOpt ? matchOpt[1].toUpperCase() : optVal.trim().toUpperCase();

                if (correctLetters.includes(optLetter)) {
                    b.classList.add("opt-correct");
                } else if (b.classList.contains("is-selected")) {
                    b.classList.add("opt-wrong");
                }
            });

            // Display action buttons: Explanation & Next
            const footerActions = document.querySelector("#quizFooterActions");
            if (footerActions) footerActions.style.display = "flex";

            // Setup explanation button toggle
            const explanationBtn = document.querySelector("#showExplanationBtn");
            const explanationPanel = document.querySelector("#quizExplanationPanel");
            const explanationText = document.querySelector("#quizExplanationText");
            const contentLayout = document.querySelector("#quizContentLayout");

            const explanationContent = card.explanation || `The correct options are: ${correctLetters.join(", ")}.`;
            if (explanationText) explanationText.textContent = explanationContent;

            explanationBtn?.addEventListener("click", () => {
                if (!explanationPanel) return;
                const isVisible = explanationPanel.classList.contains("is-visible");
                if (isVisible) {
                    explanationPanel.classList.remove("is-visible");
                    contentLayout?.classList.remove("has-explanation");
                } else {
                    explanationPanel.classList.add("is-visible");
                    contentLayout?.classList.add("has-explanation");
                }
            });

            const nextBtn = document.querySelector("#nextQuizBtn");
            nextBtn?.addEventListener("click", async () => {
                nextBtn.disabled = true;
                nextBtn.innerHTML = "Loading...";
                const nextData = await answerPromise;
                renderQuiz(nextData);
            });
        });

    } else if (isMcq && !isMultiple) {
        let answered = false;
        const targetCorrect = correctLetters[0] || "A";

        document.querySelectorAll(".mcq-option-btn.single-select-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (answered) return;
                answered = true;

                const selectedVal = btn.getAttribute("data-val") || "";
                const matchSelected = selectedVal.match(/^([A-D])/i);
                const selectedLetter = matchSelected ? matchSelected[1].toUpperCase() : selectedVal.trim().toUpperCase();

                const answerPromise = fetch("/api/quiz/answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answer: selectedVal, skip: false }),
                }).then(r => r.json());

                // Highlight options: STRICT letter matching, NO substring inclusion
                document.querySelectorAll(".mcq-option-btn.single-select-btn").forEach(b => {
                    b.disabled = true;
                    const optVal = b.getAttribute("data-val") || "";
                    const matchOpt = optVal.match(/^([A-D])/i);
                    const optLetter = matchOpt ? matchOpt[1].toUpperCase() : optVal.trim().toUpperCase();

                    if (optLetter === targetCorrect) {
                        b.classList.add("opt-correct");
                    } else if (b === btn) {
                        b.classList.add("opt-wrong");
                    }
                });

                // Display action buttons: Explanation & Next
                const footerActions = document.querySelector("#quizFooterActions");
                if (footerActions) footerActions.style.display = "flex";

                // Setup explanation button toggle
                const explanationBtn = document.querySelector("#showExplanationBtn");
                const explanationPanel = document.querySelector("#quizExplanationPanel");
                const explanationText = document.querySelector("#quizExplanationText");
                const contentLayout = document.querySelector("#quizContentLayout");

                const explanationContent = card.explanation || `The correct option is ${targetCorrect}.`;
                if (explanationText) explanationText.textContent = explanationContent;

                explanationBtn?.addEventListener("click", () => {
                    if (!explanationPanel) return;
                    const isVisible = explanationPanel.classList.contains("is-visible");
                    if (isVisible) {
                        explanationPanel.classList.remove("is-visible");
                        contentLayout?.classList.remove("has-explanation");
                    } else {
                        explanationPanel.classList.add("is-visible");
                        contentLayout?.classList.add("has-explanation");
                    }
                });

                // Next button loads next card seamlessly without reloading
                const nextBtn = document.querySelector("#nextQuizBtn");
                nextBtn?.addEventListener("click", async () => {
                    nextBtn.disabled = true;
                    nextBtn.innerHTML = "Loading...";
                    const nextData = await answerPromise;
                    renderQuiz(nextData);
                });
            });
        });
    } else {
        // Fallback for open-ended text questions
        const submitBtn = document.querySelector("#submitTextQuiz");
        submitBtn?.addEventListener("click", async () => {
            const answer = document.querySelector("#quizAnswer")?.value || "";
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Checking...";
            const res = await fetch("/api/quiz/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer, skip: false }),
            });
            const nextData = await res.json();
            renderQuiz(nextData);
        });
    }
}

function renderRoadmap(roadmapData, currentStep, completedMilestones) {
    if (!roadmapData || !roadmapData.steps) return;
    const container = document.querySelector("#roadmapNodesContainer");
    const counter = document.querySelector("#roadmapStepCounter");
    const progress = document.querySelector("#roadmapProgressBar");
    const steps = roadmapData.steps || [];
    const completedList = completedMilestones || [];
    const hasActive = currentStep !== null && currentStep !== undefined && currentStep >= 0;

    if (counter) {
        counter.textContent = `${completedList.length} of ${steps.length} Milestones Completed`;
    }
    if (progress) {
        const percent = Math.round((completedList.length / Math.max(steps.length, 1)) * 100);
        progress.style.width = `${percent}%`;
    }

    if (container) {
        container.innerHTML = steps.map((step, idx) => {
            const isCompleted = completedList.includes(idx);
            const isActive = hasActive && idx === currentStep && !isCompleted;
            const statusClass = isCompleted ? "is-completed" : isActive ? "is-active" : "is-upcoming";
            const durationHtml = step.duration ? `<span class="node-duration"><i data-lucide="clock"></i> ${escapeHtml(step.duration)}</span>` : "";
            
            let footerHtml = "";
            if (isCompleted) {
                footerHtml = `<a class="node-jump-btn completed" href="/roadmap/jump/${idx}"><i data-lucide="check-circle-2"></i> Review (Completed ≥70%)</a>`;
            } else if (isActive) {
                footerHtml = `<a class="node-jump-btn active" href="/roadmap/jump/${idx}"><i data-lucide="sparkles"></i> Continue Deep Learning</a>`;
            } else {
                footerHtml = `<a class="node-jump-btn" href="/roadmap/jump/${idx}"><i data-lucide="compass"></i> Start Deep Learning</a>`;
            }

            const whatWillBe = step.what_will_be_explained || [
                `Core concepts, definitions, and scope of ${step.title || "this subtopic"}`,
                "Intuitive real-world analogy and mechanism breakdown",
                "Key takeaways tested in the 70% flashcard check"
            ];
            const briefItems = Array.isArray(whatWillBe)
                ? whatWillBe.map(pt => `<li>${escapeHtml(pt)}</li>`).join("")
                : `<li>${escapeHtml(whatWillBe)}</li>`;

            const cardHtml = `
                <div class="roadmap-node-card ${statusClass}" data-step-idx="${idx}">
                    <div class="node-top-bar">
                        <span class="node-number">Milestone ${step.step || (idx + 1)}</span>
                        ${durationHtml}
                    </div>
                    <h4 class="node-title">${escapeHtml(step.title || "")}</h4>
                    <div class="node-desc-wrap">
                        <p class="node-desc">
                            ${escapeHtml(step.content || "")}
                            <button class="node-more-btn" type="button" data-step-idx="${idx}">... More</button>
                        </p>
                        <div class="node-brief-drawer" id="nodeBriefDrawer-${idx}" style="display: none;">
                            <div class="brief-drawer-title">
                                <i data-lucide="list-checks"></i> What AI will explain in this step:
                            </div>
                            <ul class="brief-points-list">
                                ${briefItems}
                            </ul>
                        </div>
                    </div>
                    <div class="node-sequence-flow">
                        <span class="flow-pill"><i data-lucide="book-open"></i> Deep Lesson</span>
                        <i data-lucide="arrow-right" class="flow-arrow"></i>
                        <span class="flow-pill flow-quiz"><i data-lucide="cards"></i> Quiz (≥70% to pass)</span>
                    </div>
                    <div class="node-action-footer">
                        ${footerHtml}
                    </div>
                </div>
            `;

            const connectorHtml = idx < steps.length - 1 ? `
                <div class="roadmap-connector">
                    <div class="connector-line"></div>
                    <div class="connector-checkpoint" title="Flashcard Checkpoint">
                        <i data-lucide="cards"></i>
                    </div>
                    <div class="connector-line"></div>
                </div>
            ` : "";

            return cardHtml + connectorHtml;
        }).join("");

        setupRoadmapListeners();
        setupRoadmapArrows();
        lucide.createIcons();

        if (hasActive) {
            const activeCard = container.querySelector(".roadmap-node-card.is-active");
            if (activeCard) {
                activeCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }
    }
}

function setupRoadmapArrows() {
    const scroller = document.querySelector("#roadmapMapScroller");
    const leftBtn = document.querySelector("#roadmapScrollLeft");
    const rightBtn = document.querySelector("#roadmapScrollRight");
    if (!scroller || !leftBtn || !rightBtn) return;

    function updateArrowStates() {
        const tolerance = 6;
        const atStart = scroller.scrollLeft <= tolerance;
        const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - tolerance;
        const canScroll = scroller.scrollWidth > scroller.clientWidth + tolerance;

        if (!canScroll) {
            leftBtn.disabled = true;
            rightBtn.disabled = true;
            leftBtn.classList.add("is-disabled");
            rightBtn.classList.add("is-disabled");
        } else {
            leftBtn.disabled = atStart;
            rightBtn.disabled = atEnd;
            leftBtn.classList.toggle("is-disabled", atStart);
            rightBtn.classList.toggle("is-disabled", atEnd);
        }
    }

    if (!leftBtn.dataset.bound) {
        leftBtn.dataset.bound = "true";
        leftBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const scrollDist = Math.max(scroller.clientWidth * 0.75, 280);
            scroller.scrollBy({ left: -scrollDist, behavior: "smooth" });
        });
    }

    if (!rightBtn.dataset.bound) {
        rightBtn.dataset.bound = "true";
        rightBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const scrollDist = Math.max(scroller.clientWidth * 0.75, 280);
            scroller.scrollBy({ left: scrollDist, behavior: "smooth" });
        });
    }

    if (!scroller.dataset.arrowsBound) {
        scroller.dataset.arrowsBound = "true";
        scroller.addEventListener("scroll", updateArrowStates, { passive: true });
        window.addEventListener("resize", updateArrowStates, { passive: true });
    }

    setTimeout(updateArrowStates, 100);
    setTimeout(updateArrowStates, 350);
}

function showDeepLearningTransition(milestoneTitle) {
    if (document.querySelector("#dlTransitionOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "dlTransitionOverlay";
    overlay.className = "dl-transition-overlay";
    overlay.innerHTML = `
        <div class="dl-transition-card">
            <div class="dl-transition-spinner"><i data-lucide="sparkles"></i></div>
            <h3>Entering Deep Learning Mode</h3>
            <p>Prashiksha is opening your comprehensive masterclass lesson on:</p>
            <strong>${escapeHtml(milestoneTitle)}</strong>
        </div>
    `;
    document.body.appendChild(overlay);
    lucide.createIcons();
}

function setupRoadmapListeners() {
    const cards = document.querySelectorAll(".roadmap-node-card");
    cards.forEach((card) => {
        if (card.dataset.listenerBound) return;
        card.dataset.listenerBound = "true";
        card.addEventListener("click", (e) => {
            if (e.target.closest(".node-more-btn") || e.target.closest(".node-brief-drawer")) return;
            const stepIdx = parseInt(card.dataset.stepIdx, 10);
            if (isNaN(stepIdx)) return;
            const title = card.querySelector(".node-title")?.textContent?.trim() || `Milestone ${stepIdx + 1}`;
            showDeepLearningTransition(title);
            window.location.href = `/roadmap/jump/${stepIdx}`;
        });
    });

    document.querySelectorAll(".node-more-btn").forEach((btn) => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "true";
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const stepIdx = btn.dataset.stepIdx;
            const drawer = document.querySelector(`#nodeBriefDrawer-${stepIdx}`);
            if (!drawer) return;
            const isShown = drawer.style.display !== "none";
            drawer.style.display = isShown ? "none" : "block";
            btn.textContent = isShown ? "... More" : "... Less";
            lucide.createIcons();
        });
    });

    const toggleBtn = document.querySelector("#toggleMapBtn");
    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = "true";
        toggleBtn.addEventListener("click", () => {
            const scroller = document.querySelector("#roadmapMapScroller");
            const textSpan = document.querySelector("#toggleMapText");
            const icon = document.querySelector("#toggleMapIcon");
            if (!scroller) return;
            const isHidden = scroller.classList.toggle("is-collapsed");
            if (textSpan) textSpan.textContent = isHidden ? "Show Map" : "Hide Map";
            if (icon) {
                icon.setAttribute("data-lucide", isHidden ? "chevron-down" : "chevron-up");
                lucide.createIcons();
            }
            if (!isHidden) {
                setTimeout(() => {
                    setupRoadmapArrows();
                }, 60);
            }
        });
    }

    setupRoadmapArrows();
}

async function advanceRoadmap() {
    const completeBtn = document.querySelector("#completeRoadmap");
    if (completeBtn) completeBtn.disabled = true;
    try {
        const res = await fetch("/api/roadmap/complete", { method: "POST" });
        const data = await res.json();
        if (data.messages) renderMessages(data.messages, true);
        if (data.roadmap_data) renderRoadmap(data.roadmap_data, data.current_roadmap_step);
    } catch (err) {
        console.error("Failed to advance roadmap", err);
    } finally {
        if (completeBtn) completeBtn.disabled = false;
    }
}

function setupQaChips() {
    const chips = document.querySelectorAll(".qa-prompt-chip");
    chips.forEach((chip) => {
        if (chip.dataset.bound) return;
        chip.dataset.bound = "true";
        chip.addEventListener("click", () => {
            const question = chip.dataset.q;
            if (!question || !chatInput || !chatForm) return;
            chatInput.value = question;
            chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
        });
    });
}

function setupSelectionNotes() {
    // Deprecated in favor of setupTextSelectionNote
}

function setupHeaderScrollHide() {
    // Header remains permanently visible and stable without vertical shrinkage
    return;
}

/* ─── Top Floating Dock & Flyout Panels (Notifications + Quick Notes Drawer) ── */
function setupTopDockAndPanels() {
    const notifBtn = document.querySelector("#notificationsFabBtn");
    const notifPanel = document.querySelector("#notificationsPanel");
    const closeNotifBtn = document.querySelector("#closeNotifPanel");
    const markAllReadBtn = document.querySelector("#markAllReadBtn");
    const notifBadge = document.querySelector("#notifBadge");
    const panelNotifCount = document.querySelector("#panelNotifCount");

    const notesBtn = document.querySelector("#notesFabBtn");
    const notesDrawer = document.querySelector("#notesDrawer");
    const notesBackdrop = document.querySelector("#notesDrawerBackdrop");
    const closeNotesBtn = document.querySelector("#closeNotesDrawer");
    const drawerForm = document.querySelector("#drawerQuickNoteForm");
    const drawerNotesSearch = document.querySelector("#drawerNotesSearch");
    const drawerNotesList = document.querySelector("#drawerNotesList");
    const drawerNotesCount = document.querySelector("#drawerNotesCount");
    const notesBadge = document.querySelector("#notesBadge");

    // Notifications Toggle
    notifBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!notifPanel) return;
        const isHidden = notifPanel.getAttribute("aria-hidden") === "true";
        if (isHidden) {
            notifPanel.setAttribute("aria-hidden", "false");
            // If notes drawer open, close it
            closeNotesDrawerAction();
        } else {
            notifPanel.setAttribute("aria-hidden", "true");
        }
        lucide.createIcons();
    });

    closeNotifBtn?.addEventListener("click", () => {
        notifPanel?.setAttribute("aria-hidden", "true");
    });

    // Mark all notifications as read
    markAllReadBtn?.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            document.querySelectorAll(".notif-item").forEach(item => item.classList.remove("is-unread"));
            if (notifBadge) notifBadge.classList.add("is-hidden");
            if (panelNotifCount) panelNotifCount.textContent = "0 new";
        } catch (err) {
            console.error("Failed to mark notifications read:", err);
        }
    });

    // Dismiss single notification
    document.querySelectorAll(".notif-dismiss-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-dismiss");
            const item = btn.closest(".notif-item");
            if (item) {
                item.style.opacity = "0";
                item.style.transform = "translateX(20px)";
                setTimeout(() => item.remove(), 200);
            }
            try {
                const res = await fetch("/api/notifications/dismiss", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                });
                const data = await res.json();
                if (notifBadge) {
                    if (data.unread_count > 0) {
                        notifBadge.textContent = data.unread_count;
                        notifBadge.classList.remove("is-hidden");
                    } else {
                        notifBadge.classList.add("is-hidden");
                    }
                }
                if (panelNotifCount) {
                    panelNotifCount.textContent = `${data.unread_count} new`;
                }
            } catch (err) {
                console.error("Failed to dismiss notification:", err);
            }
        });
    });

    // Real-Time Notes Sync & Drawer State
    let drawerPollInterval = null;

    async function loadDrawerNotesRealtime(showLoading = false) {
        if (!drawerNotesList) return;
        const refreshBtn = document.querySelector("#refreshNotesDrawerBtn");
        if (showLoading && refreshBtn) refreshBtn.classList.add("is-spinning");

        try {
            const res = await fetch("/api/notes");
            if (!res.ok) return;
            const data = await res.json();
            const notes = data.notes || [];
            const count = data.count !== undefined ? data.count : notes.length;

            if (notesBadge) notesBadge.textContent = count;
            if (drawerNotesCount) drawerNotesCount.textContent = count;
            const pageBadge = document.querySelector("#pageNotesCountBadge");
            if (pageBadge) pageBadge.textContent = `${count} notes`;

            renderDrawerNotes(notes);
        } catch (err) {
            console.error("Failed to load real-time notes:", err);
        } finally {
            if (refreshBtn) refreshBtn.classList.remove("is-spinning");
        }
    }

    function renderDrawerNotes(notes) {
        if (!drawerNotesList) return;
        if (!notes || notes.length === 0) {
            drawerNotesList.innerHTML = `
                <div class="empty-panel-state" id="drawerEmptyState">
                    <i data-lucide="notebook-tabs"></i>
                    <p>No notes saved yet.<br><small>Write above, click "Save to Notes" on lessons, or highlight any text.</small></p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const query = (drawerNotesSearch?.value || "").trim().toLowerCase();
        drawerNotesList.innerHTML = notes.map((note) => {
            const title = (note.title || "").toLowerCase();
            const topic = (note.topic || "").toLowerCase();
            const content = (note.content || "").toLowerCase();
            const isMatch = !query || title.includes(query) || topic.includes(query) || content.includes(query);

            return `
                <div class="drawer-note-item" style="display: ${isMatch ? 'flex' : 'none'};" data-id="${note.id}" data-topic="${escapeHtml(note.topic || '')}" data-title="${escapeHtml(title)}" data-content="${escapeHtml(content)}">
                    <div class="drawer-note-header">
                        <span class="drawer-note-topic">${escapeHtml(note.topic || 'General')}</span>
                        <span class="drawer-note-cat">${escapeHtml(note.category || 'Concept')}</span>
                        <small class="drawer-note-time">${escapeHtml(note.created_at || 'Just now')}</small>
                    </div>
                    <h4 class="drawer-note-title">${escapeHtml(note.title)}</h4>
                    <p class="drawer-note-text">${escapeHtml(note.content)}</p>
                    <div class="drawer-note-actions">
                        <button type="button" class="drawer-copy-btn" title="Copy text" data-copy="${escapeHtml(note.content)}"><i data-lucide="copy"></i> Copy</button>
                        <button type="button" class="drawer-del-btn" title="Delete note" data-del="${note.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;
        }).join("");

        drawerNotesList.querySelectorAll(".drawer-note-item").forEach(bindDrawerItemActions);
        lucide.createIcons();
    }

    function startDrawerRealtimePolling() {
        stopDrawerRealtimePolling();
        loadDrawerNotesRealtime(false);
        drawerPollInterval = setInterval(() => {
            if (notesDrawer?.classList.contains("is-active")) {
                loadDrawerNotesRealtime(false);
            }
        }, 3500);
    }

    function stopDrawerRealtimePolling() {
        if (drawerPollInterval) {
            clearInterval(drawerPollInterval);
            drawerPollInterval = null;
        }
    }

    // Notes Drawer Toggle
    function openNotesDrawerAction() {
        notesDrawer?.classList.add("is-active");
        notesBackdrop?.classList.add("is-active");
        notesDrawer?.setAttribute("aria-hidden", "false");
        notifPanel?.setAttribute("aria-hidden", "true");
        document.querySelector("#drawerNoteTitle")?.focus();
        loadDrawerNotesRealtime(true);
        startDrawerRealtimePolling();
        lucide.createIcons();
    }

    function closeNotesDrawerAction() {
        notesDrawer?.classList.remove("is-active");
        notesBackdrop?.classList.remove("is-active");
        notesDrawer?.setAttribute("aria-hidden", "true");
        stopDrawerRealtimePolling();
    }

    notesBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (notesDrawer?.classList.contains("is-active")) {
            closeNotesDrawerAction();
        } else {
            openNotesDrawerAction();
        }
    });

    closeNotesBtn?.addEventListener("click", closeNotesDrawerAction);
    notesBackdrop?.addEventListener("click", closeNotesDrawerAction);
    document.querySelector("#refreshNotesDrawerBtn")?.addEventListener("click", () => {
        loadDrawerNotesRealtime(true);
    });

    // Global close on click outside or Escape
    document.addEventListener("click", (e) => {
        if (notifPanel && notifPanel.getAttribute("aria-hidden") === "false") {
            if (!notifPanel.contains(e.target) && !notifBtn?.contains(e.target)) {
                notifPanel.setAttribute("aria-hidden", "true");
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            notifPanel?.setAttribute("aria-hidden", "true");
            closeNotesDrawerAction();
        }
    });

    // Drawer category chips selection
    document.querySelectorAll(".drawer-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".drawer-chip").forEach(c => c.classList.remove("is-active"));
            chip.classList.add("is-active");
            const cat = chip.getAttribute("data-cat") || "Concept";
            const hidden = document.querySelector("#drawerNoteCategory");
            if (hidden) hidden.value = cat;
        });
    });

    // Drawer Quick Note submission
    drawerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const titleInput = document.querySelector("#drawerNoteTitle");
        const contentInput = document.querySelector("#drawerNoteContent");
        const categoryInput = document.querySelector("#drawerNoteCategory");
        const submitBtn = document.querySelector("#drawerSubmitBtn");

        const title = titleInput?.value.trim() || "Quick Note";
        const content = contentInput?.value.trim() || "";
        const category = categoryInput?.value.trim() || "Concept";

        if (!content) return;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader"></i> Saving...';
            lucide.createIcons();
        }

        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, category }),
            });
            const data = await res.json();
            if (data.note) {
                if (contentInput) contentInput.value = "";
                await loadDrawerNotesRealtime(false);
                showNoteToast("✓ Saved note to Quick Notes!");
            }
        } catch (err) {
            console.error("Failed to add note from drawer:", err);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="plus" style="width: 15px; height: 15px;"></i><span>Save Note</span>';
                lucide.createIcons();
            }
        }
    });

    // Drawer textarea Ctrl+Enter to submit
    document.querySelector("#drawerNoteContent")?.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            drawerForm?.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    });

    // Drawer search filter in real-time
    drawerNotesSearch?.addEventListener("input", () => {
        const query = drawerNotesSearch.value.trim().toLowerCase();
        document.querySelectorAll(".drawer-note-item").forEach(item => {
            const title = (item.getAttribute("data-title") || "").toLowerCase();
            const topic = (item.getAttribute("data-topic") || "").toLowerCase();
            const text = (item.getAttribute("data-content") || "").toLowerCase();
            if (!query || title.includes(query) || topic.includes(query) || text.includes(query)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    });

    function bindDrawerItemActions(item) {
        const copyBtn = item.querySelector(".drawer-copy-btn");
        copyBtn?.addEventListener("click", () => {
            const text = copyBtn.getAttribute("data-copy") || "";
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
            lucide.createIcons();
            setTimeout(() => {
                copyBtn.innerHTML = '<i data-lucide="copy"></i> Copy';
                lucide.createIcons();
            }, 1400);
        });

        const delBtn = item.querySelector(".drawer-del-btn");
        delBtn?.addEventListener("click", async () => {
            if (!confirm("Delete this note?")) return;
            const id = delBtn.getAttribute("data-del");
            item.remove();
            try {
                const res = await fetch(`/notes/${id}/delete`, {
                    method: "POST",
                    headers: { "Accept": "application/json" }
                });
                const data = await res.json();
                if (data.count !== undefined) {
                    if (notesBadge) notesBadge.textContent = data.count;
                    if (drawerNotesCount) drawerNotesCount.textContent = data.count;
                    if (data.count === 0) {
                        renderDrawerNotes([]);
                    }
                }
            } catch (err) {
                console.error("Failed to delete note:", err);
            }
        });
    }

    // Helper: direct note creation from lesson interactions
    window.createNoteDirect = async function({ title, content, category }) {
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, category }),
            });
            const data = await res.json();
            if (data.note) {
                showNoteToast("✓ Saved to Quick Notes!");
                await loadDrawerNotesRealtime(false);
            }
        } catch (err) {
            console.error("Failed to save note directly:", err);
        }
    };

    // Helper: Toast notification feedback
    window.showNoteToast = function(message) {
        document.querySelectorAll(".note-saved-toast").forEach(t => t.remove());
        const toast = document.createElement("div");
        toast.className = "note-saved-toast";
        toast.innerHTML = `<i data-lucide="check-circle-2"></i><span>${escapeHtml(message)}</span>`;
        document.body.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    };

    // Text selection to note highlight feature
    setupTextSelectionNote();

    // Initial real-time notes fetch on page load
    loadDrawerNotesRealtime(false);
}

function setupTextSelectionNote() {
    const popup = document.querySelector("#selectionNotePopup");
    const saveBtn = document.querySelector("#selectionNoteBtn");
    if (!popup || !saveBtn) return;

    let currentSelectionText = "";

    function checkAndShowPopup() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            popup.style.display = "none";
            currentSelectionText = "";
            return;
        }
        const text = sel.toString().trim();
        if (text.length < 3) {
            popup.style.display = "none";
            currentSelectionText = "";
            return;
        }

        const anchor = sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
        if (!anchor) return;
        if (anchor.closest("#notesDrawer") || anchor.closest("#notificationsPanel") || anchor.closest("input, textarea, button, form")) {
            popup.style.display = "none";
            currentSelectionText = "";
            return;
        }

        currentSelectionText = text;
        try {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                popup.style.top = `${scrollY + rect.top - 12}px`;
                popup.style.left = `${scrollX + rect.left + rect.width / 2}px`;
                popup.style.display = "flex";
                lucide.createIcons();
            }
        } catch (_) {
            popup.style.display = "none";
        }
    }

    document.addEventListener("mouseup", (e) => {
        if (popup.contains(e.target)) return;
        setTimeout(checkAndShowPopup, 30);
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "Shift" || e.key.includes("Arrow")) {
            setTimeout(checkAndShowPopup, 30);
        }
    });

    document.addEventListener("mousedown", (e) => {
        if (popup.contains(e.target)) return;
        popup.style.display = "none";
    });

    saveBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentSelectionText) return;

        const textToSave = currentSelectionText;
        // Take current topic name as title
        const topicHeading = document.querySelector(".head-left h1")?.innerText.trim();
        const activeTopic = topicHeading || document.querySelector("#drawerNoteTitle")?.value.trim() || "Deep Learning";

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-lucide="check"></i> <span>Saved to Notes!</span>';
        lucide.createIcons();

        if (typeof window.createNoteDirect === "function") {
            await window.createNoteDirect({
                title: activeTopic,
                content: textToSave,
                category: "Concept",
            });
        } else {
            await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: activeTopic,
                    content: textToSave,
                    category: "Concept",
                    topic: activeTopic
                }),
            });
        }

        setTimeout(() => {
            popup.style.display = "none";
            window.getSelection()?.removeAllRanges();
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="notebook-pen" style="width: 13px; height: 13px;"></i> <span>Save to Notes</span>';
            lucide.createIcons();
        }, 800);
    });
}

// Assistant message Quick Note click listener
document.addEventListener("click", async (e) => {
    const saveMsgBtn = e.target.closest(".msg-save-note-btn");
    if (!saveMsgBtn) return;
    e.stopPropagation();

    const msgArticle = saveMsgBtn.closest(".message.assistant");
    if (!msgArticle) return;

    const tutorContent = msgArticle.querySelector(".tutor-content");
    const text = tutorContent ? tutorContent.innerText.trim() : msgArticle.innerText.trim();
    if (!text) return;

    saveMsgBtn.disabled = true;
    saveMsgBtn.innerHTML = '<i data-lucide="loader"></i> Saving...';
    lucide.createIcons();

    const activeTopic = document.querySelector("#drawerNoteTitle")?.value.trim() || "Lesson Key Concept";
    await window.createNoteDirect({
        title: activeTopic,
        content: text,
        category: "Concept",
    });

    saveMsgBtn.disabled = false;
    saveMsgBtn.innerHTML = '<i data-lucide="check"></i> Saved!';
    lucide.createIcons();
    setTimeout(() => {
        saveMsgBtn.innerHTML = '<i data-lucide="bookmark-plus"></i> Save to Notes';
        lucide.createIcons();
    }, 2000);
});

/* ─── Full Notes Page (notes.html) Interactivity ──────────────────────────── */
function setupFullNotesPage() {
    const composer = document.querySelector("#mainNoteComposer");
    if (!composer) return;

    // Focus composer button
    document.querySelector("#focusComposerBtn")?.addEventListener("click", () => {
        const titleInput = document.querySelector("#composerTitle");
        titleInput?.scrollIntoView({ behavior: "smooth", block: "center" });
        titleInput?.focus();
    });

    // Category chips selection
    document.querySelectorAll(".category-chips-selector .cat-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".category-chips-selector .cat-chip").forEach(c => c.classList.remove("is-active"));
            chip.classList.add("is-active");
            const cat = chip.getAttribute("data-cat") || "Concept";
            const hidden = document.querySelector("#composerCategoryInput");
            if (hidden) hidden.value = cat;
        });
    });

    // Markdown formatting buttons
    const contentTextarea = document.querySelector("#composerContent");
    document.querySelectorAll(".composer-toolbar .fmt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const fmt = btn.getAttribute("data-fmt");
            applyMarkdownFormat(contentTextarea, fmt);
            updateWordCount();
        });
    });

    function applyMarkdownFormat(textarea, format) {
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        let before = "";
        let after = "";
        let placeholder = selected;

        switch (format) {
            case "bold":
                before = "**";
                after = "**";
                if (!selected) placeholder = "bold text";
                break;
            case "italic":
                before = "*";
                after = "*";
                if (!selected) placeholder = "italic text";
                break;
            case "heading":
                before = "\n### ";
                after = "\n";
                if (!selected) placeholder = "Heading";
                break;
            case "bullet":
                before = "\n- ";
                if (!selected) placeholder = "List item";
                break;
            case "code":
                before = "`";
                after = "`";
                if (!selected) placeholder = "code";
                break;
            case "quote":
                before = "\n> ";
                if (!selected) placeholder = "Quote";
                break;
        }

        textarea.value = text.substring(0, start) + before + placeholder + after + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    }

    // Word counter
    function updateWordCount() {
        const counterEl = document.querySelector("#composerWordCount");
        if (!contentTextarea || !counterEl) return;
        const words = contentTextarea.value.trim() ? contentTextarea.value.trim().split(/\s+/).length : 0;
        counterEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
    }

    contentTextarea?.addEventListener("input", updateWordCount);

    // Ctrl + Enter shortcut to save
    contentTextarea?.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            composer.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    });

    // Live search and filter on cards grid
    const searchInput = document.querySelector("#notesSearchInput");
    const clearSearchBtn = document.querySelector("#clearNotesSearch");
    let activeFilter = "all";

    function filterCards() {
        const query = searchInput?.value.trim().toLowerCase() || "";
        if (clearSearchBtn) {
            clearSearchBtn.style.display = query ? "block" : "none";
        }

        let visibleCount = 0;
        document.querySelectorAll(".modern-note-card").forEach(card => {
            const title = (card.getAttribute("data-title") || "").toLowerCase();
            const topic = (card.getAttribute("data-topic") || "").toLowerCase();
            const content = (card.getAttribute("data-content") || "").toLowerCase();
            const category = card.getAttribute("data-category") || "Concept";

            const matchesQuery = !query || title.includes(query) || topic.includes(query) || content.includes(query);
            const matchesFilter = (activeFilter === "all") || (category.toLowerCase() === activeFilter.toLowerCase());

            if (matchesQuery && matchesFilter) {
                card.style.display = "flex";
                visibleCount++;
            } else {
                card.style.display = "none";
            }
        });
    }

    searchInput?.addEventListener("input", filterCards);
    clearSearchBtn?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        filterCards();
        searchInput?.focus();
    });

    // Category filter pills
    document.querySelectorAll(".notes-category-filters .filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".notes-category-filters .filter-pill").forEach(p => p.classList.remove("is-active"));
            pill.classList.add("is-active");
            activeFilter = pill.getAttribute("data-filter") || "all";
            filterCards();
        });
    });

    // Copy note text
    document.querySelectorAll(".copy-note-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const text = btn.getAttribute("data-copy") || "";
            navigator.clipboard.writeText(text);
            btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: #10b981;"></i>';
            lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i>';
                lucide.createIcons();
            }, 1400);
        });
    });

    // Toggle card inline edit mode
    document.querySelectorAll(".edit-note-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".modern-note-card");
            if (!card) return;
            const viewMode = card.querySelector(".note-card-view-mode");
            const editForm = card.querySelector(".note-card-edit-form");
            if (viewMode && editForm) {
                viewMode.style.display = "none";
                editForm.style.display = "flex";
                editForm.querySelector(".edit-input-title")?.focus();
            }
        });
    });

    document.querySelectorAll(".cancel-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".modern-note-card");
            if (!card) return;
            const viewMode = card.querySelector(".note-card-view-mode");
            const editForm = card.querySelector(".note-card-edit-form");
            if (viewMode && editForm) {
                editForm.style.display = "none";
                viewMode.style.display = "flex";
            }
        });
    });
}

// Initialize top dock and full notes page on load
setupTopDockAndPanels();
setupFullNotesPage();
lucide.createIcons();

