import { useMemo, useRef, useEffect } from 'react';

export default function ChatPanel({
  open,
  tab,
  onTab,
  messages,
  onSend,
  input,
  onInput,
  participants,
  onClose,
  selfName,
  isTeacher,
  onKick,
  fullscreen,
  onToggleFullscreen
}) {
  if (!open) return null;

  const participantList = useMemo(() => participants || [], [participants]);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={panelRef} className={`chat-panel ${fullscreen ? 'full' : ''}`} role="dialog" aria-label="Chat panel">
      <div className="chat-header">
        <div className="chat-tabs">
          <button className={tab === 'chat' ? 'active' : ''} onClick={() => onTab('chat')}>Chat</button>
          <button className={tab === 'participants' ? 'active' : ''} onClick={() => onTab('participants')}>
            Participants
          </button>
        </div>
        <div className="chat-actions">
          <button className="chat-toggle icon" onClick={onToggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {fullscreen ? '🗗' : '⤢'}
          </button>
          <button className="chat-close" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </div>
      </div>

      {tab === 'chat' && (
        <div className="chat-body">
          <div className="chat-scroll">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-row ${msg.self ? 'self' : ''}`}>
                <div className="chat-name">{msg.sender}</div>
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}
          </div>
          <form className="chat-input" onSubmit={onSend}>
            <input
              value={input}
              onChange={e => onInput(e.target.value)}
              placeholder="Type a message"
              aria-label="Chat message"
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}

      {tab === 'participants' && (
        <div className="chat-body participants">
          <div className="participant-head">
            <span>Name</span>
            {isTeacher && <span className="muted">Action</span>}
          </div>
          <div className="participant-list">
            {participantList.map((p, idx) => (
              <div key={idx} className="participant-row">
                <span className="participant-name">{p.name || p}</span>
                {isTeacher && (
                  <button
                    className="link-btn"
                    type="button"
                    disabled={p.sessionId === selfName}
                    onClick={() => onKick?.(p.sessionId)}
                  >
                    Kick out
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
