import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PollForm from './components/PollForm.jsx';
import PollCard from './components/PollCard.jsx';
import { useSocket } from './hooks/useSocket.js';
import { usePollState } from './hooks/usePollState.js';
import { usePollTimer } from './hooks/usePollTimer.js';
import ChatPanel from './components/ChatPanel.jsx';

function randomId() {
  return crypto.randomUUID();
}

function ToastStack({ items, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div className="toast-content">
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Close">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleSelect({ selection, onSelect, onContinue, teacherPassword, onTeacherPassword, teacherError }) {
  return (
    <div className="stage stage-tight">
      <div className="badge">Intervue Poll</div>
      <div className="stage-hero">
        <span style={{ fontWeight: 500 }}>Welcome to the </span>
        <span style={{ fontWeight: 800 }}>Live Polling System</span>
      </div>
      <div className="stage-sub">Please select the role that best describes you to begin using the live polling system.</div>
      <div className="role-grid">
        <button
          className={`role-card ${selection === 'student' ? 'active' : ''}`}
          onClick={() => onSelect('student')}
        >
          <div className="role-title">I’m a Student</div>
          <div className="role-copy">Submit answers and view live poll results in real-time.</div>
        </button>
        <button
          className={`role-card ${selection === 'teacher' ? 'active' : ''}`}
          onClick={() => onSelect('teacher')}
        >
          <div className="role-title">I’m a Teacher</div>
          <div className="role-copy">Create and manage polls with a shared live timer.</div>
        </button>
      </div>
      {selection === 'teacher' && (
        <div className="teacher-pass">
          <label className="field-label">Teacher access (password is “admin” for demo)</label>
          <input
            className="text-input"
            type="password"
            value={teacherPassword}
            onChange={e => onTeacherPassword(e.target.value)}
            placeholder="Enter password"
          />
          {teacherError && <div className="error-banner" style={{ marginTop: '8px' }}>{teacherError}</div>}
        </div>
      )}
      <button className="cta blue" onClick={onContinue} disabled={!selection}>
        Continue
      </button>
    </div>
  );
}

function NameStep({ value, onChange, onSubmit }) {
  return (
    <div className="stage stage-tight">
      <div className="badge blue">Intervue Poll</div>
      <div className="stage-hero">
        <span style={{ fontWeight: 500 }}>Let’s </span>
        <span style={{ fontWeight: 800 }}>Get Started</span>
      </div>
      <div className="stage-sub">If you’re a student, you’ll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates.</div>
      <form className="name-form" onSubmit={onSubmit}>
        <label className="field-label">Enter your Name</label>
        <input
          className="text-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Your name"
          required
        />
        <button className="cta gradient" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}

function HistoryPanel({ items }) {
  return (
    <div className="history-panel">
      <div className="panel-title">Poll History</div>
      <div className="history-scroll">
        {items.length === 0 && <div className="muted">No completed polls yet.</div>}
        {items.map(item => {
          const total = item.options?.reduce((acc, cur) => acc + (cur.votes || 0), 0) || 0;
          return (
            <div key={item._id} className="history-row">
              <div className="history-question">{item.question}</div>
              <div className="history-meta">{new Date(item.createdAt).toLocaleTimeString()} • {total} votes</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryFullView({ items, onClose }) {
  return (
    <div className="history-full">
      <div className="history-full-header">
        <div>
          <div className="badge">Intervue Poll</div>
          <div className="history-title"><span className="light">View </span><span>Poll History</span></div>
          <div className="history-sub">All past polls with final results.</div>
        </div>
        <button className="ghost-btn" onClick={onClose}>Close</button>
      </div>
      <div className="history-grid">
        {items.length === 0 && <div className="muted">No completed polls yet.</div>}
        {items.map((item, idx) => {
          const total = item.options?.reduce((acc, cur) => acc + (cur.votes || 0), 0) || 0;
          return (
            <div key={item._id} className="history-card">
              <div className="history-card-head">
                <div className="history-question-label">Question {items.length - idx}</div>
                <div className="history-meta">{new Date(item.createdAt).toLocaleTimeString()}</div>
              </div>
              <div className="history-question-text">{item.question}</div>
              <div className="option-list">
                {item.options?.map((opt, i) => {
                  const pct = total === 0 ? 0 : Math.round((opt.votes || 0) / total * 100);
                  return (
                    <div key={opt._id || i} className="option-row history">
                      <div className="option-index">{i + 1}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                        <div className="option-text">{opt.text}</div>
                      </div>
                      <div className="option-pct">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryScreen({ history, role }) {
  const navigate = useNavigate();
  const teacherView = role === 'teacher';

  useEffect(() => {
    if (role !== 'teacher') navigate('/polls', { replace: true });
  }, [role, navigate]);

  const items = history || [];

  return (
    <div className="page history-page">
      <div className="history-sticky">
        <div className="history-header-top">
          <div>
            <div className="history-title"><span className="light">View </span><span>Poll History</span></div>
            <div className="history-sub">All past polls with final results.</div>
          </div>
          <button className="pill-btn" onClick={() => navigate('/polls')}>Close</button>
        </div>
      </div>

      <div className="history-list">
        {items.length === 0 && <div className="muted">No completed polls yet.</div>}
        {items.map((item, idx) => {
          const qNumber = items.length - idx;
          return (
            <div key={item._id || idx} className="history-item">
              <div className="history-question-label">Question {qNumber}</div>
              <PollCard
                poll={item}
                hasVoted
                votedOptionId={null}
                onVote={() => {}}
                remainingSeconds={0}
                questionNumber={qNumber}
                forceResults
                isExpired
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockoutScreen({ teacherWaitSeconds, resetToStudent, retryTeacher }) {
  const formatSeconds = secs => {
    if (secs == null) return null;
    const clamped = Math.max(0, Math.floor(secs));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return `${seconds}s`;
  };

  const canRetry = !teacherWaitSeconds || teacherWaitSeconds <= 0;
  const countdown = formatSeconds(teacherWaitSeconds);
  const copy = teacherWaitSeconds != null
    ? teacherWaitSeconds > 0
      ? `Another teacher session is active. Try again in ~${teacherWaitSeconds}s or join as a student.`
      : 'Teacher slot should be free. You can retry now.'
    : 'Another teacher session is active. You can join as a student or retry later.';

  return (
    <div className="stage kicked">
      <div className="badge">Intervue Poll</div>
      <div className="stage-sub">{copy}</div>
      {countdown && (
        <div className="timer-pill" aria-live="polite" style={{ margin: '12px auto', padding: '8px 14px', borderRadius: 999, background: 'rgba(99, 102, 241, 0.08)', color: '#343347', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div className="spinner sm" aria-hidden="true" />
          <span>Unlocks in {countdown}</span>
        </div>
      )}
      <div className="inline-wait" style={{ marginTop: 16 }}>
        <div className="spinner sm" aria-label="Waiting" />
        <span className="muted">
          Only one teacher session is allowed at a time.
          {teacherWaitSeconds != null && teacherWaitSeconds > 0 ? ` Slot unlocks in about ${teacherWaitSeconds}s.` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button className="ghost-btn" onClick={resetToStudent}>Join as student</button>
        <button className="cta" onClick={retryTeacher} disabled={!canRetry}>
          {canRetry ? 'Retry as teacher' : `Retry in ${teacherWaitSeconds}s`}
        </button>
      </div>
    </div>
  );
}

function PollsScreen({
  kicked,
  initPending,
  poll,
  initError,
  connected,
  role,
  pollEnded,
  remainingSeconds,
  questionNumber,
  hasVoted,
  votedOptionId,
  vote,
  allStudentsAnswered,
  lastError,
  createPoll,
  history,
  waiting,
  chatOpen,
  setChatOpen,
  chatTab,
  setChatTab,
  chatMessages,
  sendChat,
  chatInput,
  setChatInput,
  participants,
  sessionId,
  kickParticipant,
  chatFullscreen,
  setChatFullscreen,
  pushToast
}) {
  const navigate = useNavigate();
  const { label: timerLabel, isExpired } = usePollTimer(remainingSeconds);

  const teacherView = role === 'teacher';
  const hasPoll = Boolean(poll);
  const [showBuilder, setShowBuilder] = useState(() => !hasPoll);
  const teacherCreating = teacherView && showBuilder;
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollDuration, setPollDuration] = useState(0);
  const milestones = useMemo(() => ({ half: false, quarter: false }), []);

  useEffect(() => {
    if (teacherView && !hasPoll) {
      setShowBuilder(true);
    }
  }, [teacherView, hasPoll]);

  useEffect(() => {
    if (teacherCreating && chatOpen) setChatOpen(false);
  }, [teacherCreating, chatOpen]);

  const handleCreate = async payload => {
    if (creatingPoll) return { ok: false, message: 'Already creating poll' };
    setCreatingPoll(true);
    const res = await createPoll(payload);
    if (res?.ok) setShowBuilder(false);
    setCreatingPoll(false);
    return res;
  };

  const handleGoToBuilder = () => setShowBuilder(true);
  const handleBackToLive = () => setShowBuilder(false);

  useEffect(() => {
    if (!teacherView) return;
    if (poll && (pollEnded || allStudentsAnswered)) {
      setShowBuilder(true);
    }
  }, [teacherView, poll, pollEnded, allStudentsAnswered]);

  useEffect(() => {
    // Track poll duration for student warnings.
    const total = poll?.durationSeconds || poll?.duration || 0;
    setPollDuration(total);
    milestones.half = false;
    milestones.quarter = false;
  }, [poll?._id]);

  useEffect(() => {
    if (!poll || teacherView) return;
    if (!pollDuration || remainingSeconds == null) return;
    if (pollEnded || allStudentsAnswered) return;

    const halfMark = Math.floor(pollDuration / 2);
    const quarterMark = Math.floor(pollDuration / 4);

    if (!milestones.half && remainingSeconds <= halfMark) {
      milestones.half = true;
      pushToast?.('Half the time has elapsed. Submit your answer!', 'warn');
    }
    if (!milestones.quarter && remainingSeconds <= quarterMark) {
      milestones.quarter = true;
      pushToast?.('Only a quarter of the time remains. Don’t miss it!', 'error');
    }
  }, [remainingSeconds, pollDuration, pollEnded, allStudentsAnswered, teacherView, poll, milestones, pushToast]);

  if (kicked) {
    return (
      <div className="stage kicked">
        <div className="badge">Intervue Poll</div>
        <div className="stage-hero">You’ve been Kicked out !</div>
        <div className="stage-sub">Looks like the teacher had removed you from the poll system. Please try again sometime.</div>
      </div>
    );
  }

  if (initPending && !poll) {
    return (
      <div className="stage">
        <div className="badge blue">Intervue Poll</div>
        <div className="spinner" aria-label="Joining" />
        <div className="stage-hero">Joining your session...</div>
        <div className="stage-sub">Hold on while we finalize your connection.</div>
        {initError && <div className="error-banner">{initError}</div>}
      </div>
    );
  }

  if (teacherCreating) {
    return (
      <div className="page create-page fade-card swap-screen">
        <button className="history-fab-top" onClick={() => navigate('/history')}>
          <span className="pill-icon" aria-hidden="true">👁</span>
          View Poll history
        </button>
        <div className="create-head">
          <div className="badge">Intervue Poll</div>
          <div className="create-title">
            <span style={{ fontWeight: 500 }}>Let’s </span>
            <span style={{ fontWeight: 800 }}>Get Started</span>
          </div>
          <div className="create-sub">you’ll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.</div>
        </div>
        <div className="create-top-actions">
          <div className="create-actions-left">
            {hasPoll && !pollEnded && (
              <button className="pill-btn" onClick={handleBackToLive}>Back to live poll</button>
            )}
          </div>
          <div className="create-actions-right" />
        </div>
        <div className="create-form-shell">
          <PollForm onCreate={handleCreate} disabled={false} loading={creatingPoll} onWarn={pushToast} />
        </div>
        <ChatPanel
          open={chatOpen}
          tab={chatTab}
          onTab={setChatTab}
          messages={chatMessages}
          onSend={sendChat}
          input={chatInput}
          onInput={setChatInput}
          participants={participants}
          onClose={() => {
            setChatFullscreen(false);
            setChatOpen(false);
          }}
          selfName={sessionId}
          isTeacher={role === 'teacher'}
          onKick={kickParticipant}
          fullscreen={chatFullscreen}
          onToggleFullscreen={() => setChatFullscreen(v => !v)}
        />
      </div>
    );
  }

  const teacherLive = teacherView && poll;

  return (
    <div className={`page ${teacherLive ? 'teacher-live' : 'poll-view'} swap-screen`}>

      <div className="main-stack">
        {poll && !pollEnded && (
          <div className="poll-topline">
            <div className="poll-label">Question {questionNumber || 1}</div>
            <div className="timer-row">
              <span className="timer-icon">⏱</span>
              <span className="timer-value">{timerLabel}</span>
            </div>
          </div>
        )}

        {role === 'teacher' && poll ? (
          <PollCard
            poll={poll}
            hasVoted
            votedOptionId={null}
            onVote={() => {}}
            remainingSeconds={remainingSeconds}
            questionNumber={questionNumber}
            forceResults
            isExpired={isExpired || pollEnded || allStudentsAnswered}
            footerAction={(
              <button className="back-to-create-btn" onClick={handleGoToBuilder}>
                + Ask a new question
              </button>
            )}
          />
        ) : waiting || pollEnded ? (
          <div className="waiting-card">
            <div className="badge blue">Intervue Poll</div>
            <div className="spinner" aria-label="Loading" />
            <div className="waiting-text">Wait for the teacher to ask questions..</div>
          </div>
        ) : (
          <PollCard
            poll={poll}
            hasVoted={hasVoted}
            votedOptionId={votedOptionId}
            onVote={vote}
            remainingSeconds={remainingSeconds}
            questionNumber={questionNumber}
            isExpired={isExpired || pollEnded || allStudentsAnswered}
          />
        )}

        {allStudentsAnswered && !pollEnded && (
          <div className="inline-wait">
            <div className="spinner sm" aria-label="All students answered" />
            <span className="muted">
              {role === 'teacher'
                ? 'All students have answered. Start a new poll when ready.'
                : 'All students have answered. Wait for your teacher.'}
            </span>
          </div>
        )}

        {(lastError || initError) && <div className="error-banner">{initError || lastError}</div>}

      </div>

      {!chatFullscreen && (
        <button
          className="chat-fab"
          aria-label="Support"
          onClick={() => {
            setChatOpen(prev => {
              const next = !prev;
              if (!next) setChatFullscreen(false);
              return next;
            });
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6.75A2.75 2.75 0 0 1 8.75 4h6.5A2.75 2.75 0 0 1 18 6.75v6.5A2.75 2.75 0 0 1 15.25 16H10l-2.4 2.1A.75.75 0 0 1 6 17.5z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <ChatPanel
        open={chatOpen}
        tab={chatTab}
        onTab={setChatTab}
        messages={chatMessages}
        onSend={sendChat}
        input={chatInput}
        onInput={setChatInput}
        participants={participants}
          onClose={() => {
            setChatFullscreen(false);
            setChatOpen(false);
          }}
        selfName={sessionId}
        isTeacher={role === 'teacher'}
        onKick={kickParticipant}
        fullscreen={chatFullscreen}
        onToggleFullscreen={() => setChatFullscreen(v => !v)}
      />

      {teacherView && (
        <button className="history-fab-top" onClick={() => navigate('/history')}>
          <span className="pill-icon" aria-hidden="true">👁</span>
          View Poll history
        </button>
      )}

    </div>
  );
}

function getSessionStore() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = getSessionStore();
  const [role, setRole] = useState(() => store?.getItem('poll-role'));
  const [roleSelection, setRoleSelection] = useState(() => store?.getItem('poll-role') || '');
  const [storedName, setStoredName] = useState(() => store?.getItem('poll-name') || '');
  const [nameInput, setNameInput] = useState(storedName);
  const [history, setHistory] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [kicked, setKicked] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [initPending, setInitPending] = useState(false);
  const [initError, setInitError] = useState('');
  const [initErrorCode, setInitErrorCode] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [teacherWaitSeconds, setTeacherWaitSeconds] = useState(null);
  const [toasts, setToasts] = useState([]);

  const pushToast = (message, type = 'info', duration = 3800) => {
    const id = randomId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const dismissToast = id => setToasts(prev => prev.filter(t => t.id !== id));

  const sessionId = useMemo(() => {
    const storage = getSessionStore();
    const existing = storage?.getItem('poll-session');
    if (existing) return existing;
    const newId = randomId();
    storage?.setItem('poll-session', newId);
    return newId;
  }, []);

  const { socket, connected } = useSocket(sessionId, storedName, role);
  const { poll, remainingSeconds, hasVoted, votedOptionId, createPoll, vote, requestState, lastError } =
    usePollState(socket, sessionId, storedName);

  useEffect(() => {
    if (!socket || !storedName) return;
    requestState();
  }, [socket, requestState, storedName]);

  useEffect(() => {
    // Ensure teacher always has an identity without a separate name step.
    if (role === 'teacher' && !storedName) {
      setStoredName('Teacher');
      store?.setItem('poll-name', 'Teacher');
    }
  }, [role, storedName, store]);

  useEffect(() => {
    if (!socket || !role || !storedName) return;
    setInitPending(true);
    setInitError('');
    setInitErrorCode('');
    setTeacherWaitSeconds(null);

    socket.emit('session:init', { sessionId, name: storedName, role }, ack => {
      if (ack?.ok) {
        setInitPending(false);
        setKicked(false);
        setInitErrorCode('');
        setTeacherWaitSeconds(null);
        requestState();
      } else {
        setInitPending(false);
        setInitError(ack?.message || 'Unable to join session.');
        setInitErrorCode(ack?.code || '');
        if (ack?.code === 'TEACHER_EXISTS' && typeof ack.waitSeconds === 'number') {
          setTeacherWaitSeconds(Math.max(0, Math.ceil(ack.waitSeconds)));
        }
        if (ack?.code === 'SESSION_BLOCKED') {
          setKicked(true);
        }
      }
    });
  }, [socket, role, storedName, sessionId, requestState]);

  useEffect(() => {
    if (!storedName) return;
    fetch('/api/polls/history')
      .then(res => res.json())
      .then(data => setHistory(data.items || []))
      .catch(() => setHistory([]));
  }, [poll, storedName]);

  useEffect(() => {
    if (role === 'student') {
      setKicked(false);
      setInitError('');
      setInitErrorCode('');
      setTeacherWaitSeconds(null);
    }
  }, [role]);

  useEffect(() => {
    if (!socket) return undefined;

    const onSessions = payload => setParticipants(payload?.participants || []);
    const onKicked = ({ sessionId: kickedId }) => {
      if (kickedId === sessionId) setKicked(true);
      setParticipants(prev => prev.filter(p => p.sessionId !== kickedId));
    };
    const onChat = msg =>
      setChatMessages(prev => [...prev, { ...msg, self: msg.sessionId === sessionId }]);
    const onReconnect = () => requestState();

    socket.on('sessions:update', onSessions);
    socket.on('session:kicked', onKicked);
    socket.on('chat:message', onChat);
    socket.on('connect', onReconnect);
    socket.emit('sessions:request');

    return () => {
      socket.off('sessions:update', onSessions);
      socket.off('session:kicked', onKicked);
      socket.off('chat:message', onChat);
      socket.off('connect', onReconnect);
    };
  }, [socket, sessionId, requestState]);

  const saveName = e => {
    e?.preventDefault();
    if (!nameInput.trim()) return;
    const nextName = nameInput.trim();
    setStoredName(nextName);
    store?.setItem('poll-name', nextName);
  };

  const teacherLockout = initErrorCode === 'TEACHER_EXISTS' && role === 'teacher';

  // Prevent stray kick screen flashes when in teacher lockout state.
  useEffect(() => {
    if (teacherLockout) setKicked(false);
  }, [teacherLockout]);

  const resetToStudent = () => {
    setRole('student');
    setRoleSelection('student');
    setStoredName('');
    setNameInput('');
    setTeacherPassword('');
    setTeacherError('');
    setInitError('');
    setInitErrorCode('');
    setTeacherWaitSeconds(null);
    setKicked(false);
    const storage = getSessionStore();
    storage?.setItem('poll-role', 'student');
    storage?.removeItem('poll-name');
    storage?.removeItem('teacher-pass-ok');
  };

  const retryTeacher = () => {
    setInitError('');
    setInitErrorCode('');
    setTeacherWaitSeconds(null);
    setKicked(false);
    setInitPending(true);
    if (socket && storedName && role === 'teacher') {
      socket.emit('session:init', { sessionId, name: storedName, role }, ack => {
        setInitPending(false);
        if (ack?.ok) {
          setKicked(false);
          setTeacherWaitSeconds(null);
          requestState();
        } else {
          setInitError(ack?.message || 'Unable to join session.');
          setInitErrorCode(ack?.code || '');
          if (ack?.code === 'TEACHER_EXISTS' && typeof ack.waitSeconds === 'number') {
            setTeacherWaitSeconds(Math.max(0, Math.ceil(ack.waitSeconds)));
          }
          if (ack?.code === 'SESSION_BLOCKED') setKicked(true);
        }
      });
    } else {
      setInitPending(false);
    }
  };

  useEffect(() => {
    if (teacherLockout) {
      if (location.pathname !== '/lockout') navigate('/lockout');
      return;
    }
    // No role selected: stay on landing.
    if (!role) {
      if (location.pathname !== '/') navigate('/');
      return;
    }

    // Teacher: allow polls and history routes.
    if (role === 'teacher') {
      const allowed = ['/polls', '/history'];
      if (!allowed.includes(location.pathname)) navigate('/polls');
      return;
    }

    // Student without name: go to join.
    if (!storedName) {
      if (location.pathname !== '/join') navigate('/join');
      return;
    }

    // Student with name: keep on polls.
    if (location.pathname !== '/polls') navigate('/polls');
  }, [role, storedName, teacherLockout, location.pathname, navigate]);

  useEffect(() => {
    if (!teacherLockout || !teacherWaitSeconds) return undefined;
    const id = setInterval(() => {
      setTeacherWaitSeconds(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [teacherLockout, teacherWaitSeconds]);

  const waiting = !poll;
  const questionNumber = (history?.length || 0) + (poll?.status === 'active' ? 1 : 0);
  const studentsCount = participants.filter(p => p.role === 'student').length;
  const totalVotes = poll?.options?.reduce((acc, cur) => acc + (cur.votes || 0), 0) || 0;
  const pollEnded = poll && (remainingSeconds <= 0 || poll.status === 'completed');
  const allStudentsAnswered = poll && !pollEnded && studentsCount > 0 && totalVotes >= studentsCount;

  const sendChat = e => {
    e?.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat:message', { sessionId, text: chatInput.trim() }, ack => {
      if (ack?.ok) {
        setChatInput('');
      }
    });
  };

  const kickParticipant = targetSessionId => {
    if (!socket || role !== 'teacher') return;
    socket.emit('teacher:kick', { targetSessionId, actorSessionId: sessionId });
  };


  const RoleScreen = (
    <RoleSelect
      selection={roleSelection}
      onSelect={next => {
        setTeacherError('');
        setRoleSelection(next);
      }}
      teacherPassword={teacherPassword}
      onTeacherPassword={setTeacherPassword}
      teacherError={teacherError}
      onContinue={() => {
        if (!roleSelection) return;
        if (roleSelection === 'teacher') {
          if (teacherPassword !== 'admin') {
            setTeacherError('Password is "admin" for demo access.');
            return;
          }
          setTeacherError('');
          setStoredName('Teacher');
          store?.setItem('poll-name', 'Teacher');
          store?.setItem('poll-role', 'teacher');
          store?.setItem('teacher-pass-ok', 'true');
          setRole('teacher');
          return;
        }
        setTeacherError('');
        store?.setItem('poll-role', roleSelection);
        setRole(roleSelection);
        navigate('/join');
      }}
    />
  );

  const NameScreen = <NameStep value={nameInput} onChange={setNameInput} onSubmit={saveName} />;

  return (
    <>
      <Routes>
        <Route path="/" element={RoleScreen} />
        <Route path="/join" element={role === 'teacher' ? <Navigate to="/polls" replace /> : NameScreen} />
        <Route
          path="/lockout"
          element={teacherLockout ? (
            <LockoutScreen
              teacherWaitSeconds={teacherWaitSeconds}
              resetToStudent={resetToStudent}
              retryTeacher={retryTeacher}
            />
          ) : (
            <Navigate to="/" replace />
          )}
        />
        <Route
          path="/polls"
          element={(
            <PollsScreen
              kicked={teacherLockout ? false : kicked}
              initPending={initPending}
              poll={poll}
              initError={initError}
              connected={connected}
              role={role}
              pollEnded={pollEnded}
              remainingSeconds={remainingSeconds}
              questionNumber={questionNumber}
              hasVoted={hasVoted}
              votedOptionId={votedOptionId}
              vote={vote}
              allStudentsAnswered={allStudentsAnswered}
              lastError={lastError}
              createPoll={createPoll}
              history={history}
              waiting={waiting}
              chatOpen={chatOpen}
              setChatOpen={setChatOpen}
              chatTab={chatTab}
              setChatTab={setChatTab}
              chatMessages={chatMessages}
              sendChat={sendChat}
              chatInput={chatInput}
              setChatInput={setChatInput}
              participants={participants}
              sessionId={sessionId}
              kickParticipant={kickParticipant}
              chatFullscreen={chatFullscreen}
              setChatFullscreen={setChatFullscreen}
              pushToast={pushToast}
            />
          )}
        />
        <Route
          path="/history"
          element={<HistoryScreen history={history} role={role} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastStack items={toasts} onDismiss={dismissToast} />
    </>
  );
}
