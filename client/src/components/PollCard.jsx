import { useEffect, useMemo, useState } from 'react';

export default function PollCard({
  poll,
  hasVoted,
  votedOptionId,
  onVote,
  remainingSeconds,
  questionNumber,
  forceResults = false,
  isExpired = false,
  footerAction = null
}) {
  const totalVotes = useMemo(() => poll?.options?.reduce((acc, cur) => acc + (cur.votes || 0), 0) || 0, [poll]);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!poll) return null;

  const votingClosed = isExpired || poll.status === 'completed';
  const showResults = forceResults || hasVoted || votingClosed;
  const canVote = !forceResults && !hasVoted && !votingClosed;
  const showSubmit = canVote && selectedId;
  const submitStateClass = showSubmit ? 'visible' : 'hidden';

  useEffect(() => {
    // Reset selection when poll changes; keep server-confirmed choice.
    setSelectedId(votedOptionId || null);
    setSubmitting(false);
  }, [poll?._id, votedOptionId, hasVoted]);

  const handleSelect = optionId => {
    if (!canVote) return;
    setSelectedId(optionId);
  };

  const handleSubmit = async () => {
    if (!canVote || !selectedId || submitting) return;
    setSubmitting(true);
    await onVote(selectedId);
    setSubmitting(false);
  };

  return (
    <div className={`poll-card-shell ${showSubmit ? 'has-submit' : ''}`}>
      <div className="poll-card">
        <div className="poll-header gradient">
          <div className="poll-question-title">{poll.question}</div>
        </div>

        <div className="poll-body">

          <div className="option-list">
            {poll.options?.map((option, index) => {
              const pct = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
              const isChosen = selectedId === option._id;
              const locked = showResults;

              return (
                <button
                  key={option._id}
                  type="button"
                  className={`option-row ${isChosen ? 'selected' : ''} ${showResults ? 'show-results' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => handleSelect(option._id)}
                  disabled={locked && !canVote}
                >
                  <div className="bar-track" aria-hidden="true">
                    <div className="bar-fill" style={{ width: showResults ? `${pct}%` : '0%' }} />
                  </div>

                  <div className="option-index">{index + 1}</div>
                  <div className="option-text">{option.text}</div>
                  <div className="option-pct">{showResults ? `${pct}%` : ''}</div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <div className={`submit-row ${submitStateClass}`} aria-hidden={!showSubmit}>
        <button
          type="button"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!showSubmit || submitting}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {footerAction && (
        <div className="teacher-back-row">
          {footerAction}
        </div>
      )}
    </div>
  );
}
