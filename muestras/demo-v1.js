(() => {
  "use strict";

  const quiz = document.querySelector("[data-clinical-quiz]");
  const quizFeedback = document.querySelector("[data-clinical-feedback]");
  quiz?.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = quiz.querySelector(
      'input[name="clinical-answer"]:checked',
    );
    if (!selected) {
      quizFeedback.hidden = false;
      quizFeedback.className = "quiz-feedback needs-answer";
      quizFeedback.textContent =
        "Selecciona una alternativa para recibir retroalimentación.";
      return;
    }
    const correct = selected.value === "2";
    quizFeedback.hidden = false;
    quizFeedback.className = `quiz-feedback ${correct ? "is-correct" : "is-review"}`;
    quizFeedback.innerHTML = correct
      ? "<strong>Decisión defendible.</strong> La utilidad está en combinar señales, estimar riesgo y vincular la información a una conducta proporcionada."
      : "<strong>Revisa el principio.</strong> Una señal aislada no confirma ni descarta por sí sola. El riesgo se interpreta mediante combinaciones, contexto, evolución y conducta asociada.";
  });

  const stepButtons = [...document.querySelectorAll("[data-student-step]")];
  const stepPanels = [...document.querySelectorAll("[data-student-panel]")];
  const currentStep = document.querySelector("[data-student-current]");
  function showStudentStep(step) {
    stepButtons.forEach((button) => {
      const active = button.dataset.studentStep === String(step);
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    stepPanels.forEach((panel) => {
      panel.hidden = panel.dataset.studentPanel !== String(step);
    });
    if (currentStep) currentStep.textContent = String(step);
  }
  stepButtons.forEach((button) =>
    button.addEventListener("click", () =>
      showStudentStep(button.dataset.studentStep),
    ),
  );
  document
    .querySelectorAll("[data-student-next]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showStudentStep(button.dataset.studentNext),
      ),
    );

  const reasoning = document.querySelector("#student-reasoning");
  const reasoningCount = document.querySelector("[data-student-count]");
  reasoning?.addEventListener("input", () => {
    if (reasoningCount)
      reasoningCount.textContent = String(reasoning.value.length);
  });

  const recoveryValues = { pain: 4, function: 6, sleep: 7 };
  document.querySelectorAll("[data-recovery-range]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.recoveryRange;
      recoveryValues[key] = Number(input.value);
      const output = document.querySelector(`[data-output="${key}"]`);
      if (output) output.textContent = `${input.value}/10`;
    });
  });

  const summary = document.querySelector("[data-daily-summary]");
  document
    .querySelector("[data-build-summary]")
    ?.addEventListener("click", () => {
      const completed = document.querySelector(
        "[data-exercise-check]",
      )?.checked;
      const functionPhrase =
        recoveryValues.function >= 7
          ? "buena facilidad funcional"
          : recoveryValues.function >= 4
            ? "facilidad funcional intermedia"
            : "dificultad funcional relevante";
      summary.hidden = false;
      summary.innerHTML = `<strong>Resumen demostrativo</strong><p>Molestia ${recoveryValues.pain}/10, ${functionPhrase} (${recoveryValues.function}/10), sueño ${recoveryValues.sleep}/10 y plan ${completed ? "realizado" : "no realizado"}.</p><small>Esta lectura organiza lo registrado; no determina una causa ni modifica un tratamiento.</small>`;
    });
})();
