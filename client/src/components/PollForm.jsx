import { useState } from 'react';

const defaultOptions = [
  { text: 'Option 1', isCorrect: false },
  { text: 'Option 2', isCorrect: false }
];

export default function PollForm({ onCreate, disabled, loading, onWarn }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(defaultOptions);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState(null);

  const updateOption = (index, key, value) => {
    setOptions(prev =>
      prev.map((opt, idx) => (idx === index ? { ...opt, [key]: value } : opt))
    );
  };

  const addOption = () =>
    setOptions(prev => [...prev, { text: `Option ${prev.length + 1}`, isCorrect: false }]);

  const removeOption = index => {
    setOptions(prev => {
      if (prev.length <= 2) {
        onWarn?.('Poll must have at least 2 options.');
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    const cleanedOptions = options
      .map(o => ({ text: o.text.trim(), isCorrect: Boolean(o.isCorrect) }))
      .filter(o => o.text.length > 0);

    const payload = {
      question: question.trim(),
      options: cleanedOptions,
      durationSeconds: Number(duration)
    };

    if (payload.options.length < 2) {
      setError('Provide at least two options.');
      onWarn?.('Poll must have at least 2 options.');
      return;
    }

    const result = await onCreate(payload);
    if (!result?.ok) {
      setError(result?.message || 'Unable to create poll.');
    } else {
      setQuestion('');
      setOptions(defaultOptions);
      setDuration(60);
    }
  };

  const busy = disabled || loading;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="field">
        <div className="field-row">
          <span>Enter your question</span>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={busy}>
            <option value={30}>30 seconds</option>
            <option value={45}>45 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
        </div>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Type your question here"
          required
          disabled={busy}
          maxLength={100}
        />
        <div className="hint muted align-end">{question.length}/100</div>
      </div>

      <div className="field">
        <div className="field-row option-header">
          <span>Edit Options</span>
          <span className="muted">Is it Correct?</span>
        </div>

        {options.map((opt, idx) => (
          <div className="option-compose graded" key={idx}>
            <div className="option-index">{idx + 1}</div>
            <input
              type="text"
              value={opt.text}
              onChange={e => updateOption(idx, 'text', e.target.value)}
              required
              disabled={busy}
            />
            <div className="option-correct">
              <label>
                <input
                  type="radio"
                  name={`opt-${idx}-correct`}
                  checked={opt.isCorrect === true}
                  onChange={() => updateOption(idx, 'isCorrect', true)}
                  disabled={busy}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name={`opt-${idx}-correct`}
                  checked={opt.isCorrect === false}
                  onChange={() => updateOption(idx, 'isCorrect', false)}
                  disabled={busy}
                />
                No
              </label>
            </div>
            <button
              type="button"
              className="pill-btn ghost delete-opt"
              onClick={() => removeOption(idx)}
              disabled={busy}
              aria-label={`Delete option ${idx + 1}`}
            >
              ✕
            </button>
          </div>
        ))}

        <button type="button" onClick={addOption} disabled={busy} className="link-btn add-option-btn">
          + Add More option
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="form-divider" aria-hidden="true" />

      <div className="cta-row">
        <button type="submit" className="primary" disabled={busy}>
          {loading ? 'Creating…' : 'Ask Question'}
        </button>
      </div>

      {loading && (
        <div className="inline-wait" style={{ marginTop: 8 }}>
          <div className="spinner sm" aria-hidden="true" />
          <span className="muted">Creating poll…</span>
        </div>
      )}
    </form>
  );
}
