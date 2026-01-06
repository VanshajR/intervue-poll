export default function Results({ options = [], totalVotes = 0, highlightId }) {
  return (
    <div className="results">
      <div className="results-title">Live results</div>
      {options.map(opt => {
        const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
        const highlighted = highlightId === opt._id;
        return (
          <div key={opt._id} className="result-row">
            <div className="result-label">
              <span>{opt.text}</span>
              <span className="result-count">{opt.votes} votes</span>
            </div>
            <div className="bar-shell">
              <div className={`bar ${highlighted ? 'bar-highlight' : ''}`} style={{ width: `${pct}%` }} />
              <span className="bar-value">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
