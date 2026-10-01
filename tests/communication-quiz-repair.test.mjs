import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { repairCommunicationQuizSource } from "../communication-quiz-source-repair-v1.js";

test("legacy answer styling renders both feedback states without an empty DOM token", () => {
  const source = `buttons.forEach((b, i) => b.classList.add(i === correct ? 'correct' : i === chosen ? 'wrong' : '')); feedback = chosen === correct ? 'Correcto' : 'Revisar';`;
  for (const chosen of [0, 2]) {
    const buttons = Array.from({ length: 4 }, () => ({
      tokens: [],
      classList: { add(...tokens) {
        if (tokens.some(token => token === "")) throw new DOMException("Empty token", "SyntaxError");
        this.record.push(...tokens);
      }, record: [] },
    }));
    const context = { buttons, chosen, correct: 2, feedback: null };
    vm.runInNewContext(repairCommunicationQuizSource(source, "comunicacion-clinica"), context);
    assert.equal(context.feedback, chosen === 2 ? "Correcto" : "Revisar");
    assert.deepEqual(buttons[2].classList.record, ["correct"]);
    assert.deepEqual(buttons[1].classList.record, []);
    if (chosen === 0) assert.deepEqual(buttons[0].classList.record, ["wrong"]);
  }
});

test("other courses retain their exact protected source", () => {
  const source = `b.classList.add(i ? 'correct' : '')`;
  assert.equal(repairCommunicationQuizSource(source, "traumatologia-ortopedia-clinica"), source);
});
