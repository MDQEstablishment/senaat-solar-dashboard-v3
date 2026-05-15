import React from 'react';
// School chat panel — Zamil Round 5
// Improvements: file attach (placeholder), unread indicator, updated mention regex for new user IDs

function ChatPanel({ schoolId, messages, currentUserId, onSend }) {
  const [text, setText] = React.useState('');
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerQ, setPickerQ] = React.useState('');
  const [attachments, setAttachments] = React.useState([]); // { name, kind }
  const inputRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length]);

  const onChange = (v) => {
    setText(v);
    const at = v.lastIndexOf('@');
    if (at >= 0 && (at === 0 || /\s/.test(v[at - 1]))) {
      const after = v.slice(at + 1);
      if (!/\s/.test(after)) {
        setShowPicker(true); setPickerQ(after);
        return;
      }
    }
    setShowPicker(false);
  };

  const insertMention = (user) => {
    const at = text.lastIndexOf('@');
    const newText = text.slice(0, at) + `@${user.id} `;
    setText(newText); setShowPicker(false);
    inputRef.current?.focus();
  };

  const send = () => {
    if (!text.trim() && attachments.length === 0) return;
    // Mention regex accepts new user IDs (u-pgm, u-pm1, u-mat etc.)
    const mentions = [...text.matchAll(/@([a-z][a-z0-9-]+)/gi)].map(m => m[1]);
    const fullText = attachments.length
      ? text + (text ? '\n' : '') + attachments.map(a => `📎 ${a.name}`).join('  ')
      : text;
    onSend({ userId: currentUserId, text: fullText, mentions, attachments });
    setText(''); setAttachments([]);
  };

  const onPickFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, kind: f.type || 'file', size: f.size }))]);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const renderText = (str) => {
    const parts = str.split(/(@[a-z][a-z0-9-]+)/gi);
    return parts.map((p, i) => {
      const m = p.match(/^@([a-z][a-z0-9-]+)$/i);
      if (m) {
        const u = getPerson(m[1]);
        if (u) return <span key={i} className="text-accent font-medium bg-accent-soft px-1 rounded">@{u.name.split(' ')[0]}</span>;
      }
      return <span key={i}>{p}</span>;
    });
  };

  // Mention picker — filter people by query
  const filteredPeople = PEOPLE.filter(p =>
    !pickerQ || p.name.toLowerCase().includes(pickerQ.toLowerCase()) || (p.role || '').toLowerCase().includes(pickerQ.toLowerCase())
  ).slice(0, 8);

  // Unread count = messages newer than my last seen. For demo: count mentions of currentUserId.
  const myUnread = (messages || []).filter(m => (m.mentions || []).includes(currentUserId) && m.userId !== currentUserId).length;

  return (
    <div className="flex flex-col h-full">
      {myUnread > 0 && (
        <div className="bg-accent-soft border-b border-accent px-3 py-1.5 text-[11px] text-ink-700 flex items-center gap-1">
          <Icon name="mail" size={12} /> <strong>{myUnread}</strong> mention{myUnread > 1 ? 's' : ''} of you
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 surface-2 scrollbar-thin">
        {(!messages || messages.length === 0) && (
          <div className="text-center text-xs text-ink-500 py-8">
            <Icon name="mail" size={24} className="mx-auto mb-2 opacity-40" />
            No messages yet. Start the conversation — type @ to mention someone, or attach a file.
          </div>
        )}
        {(messages || []).map(m => {
          const u = getPerson(m.userId);
          const isMe = m.userId === currentUserId;
          const mentionsMe = (m.mentions || []).includes(currentUserId);
          return (
            <div key={m.id} className={cls('flex gap-2', isMe && 'flex-row-reverse')}>
              <Avatar initials={u?.initials || '??'} size={28} />
              <div className={cls('max-w-[75%]', isMe && 'text-right')}>
                <div className="text-[10px] text-ink-500 mb-0.5">
                  <span className="font-semibold text-ink-700">{u?.name}</span> · {u?.role}
                  {mentionsMe && !isMe && <span className="ml-1 text-accent font-semibold">· mentioned you</span>}
                </div>
                <div className={cls('text-xs px-3 py-2 rounded-lg inline-block text-left whitespace-pre-wrap',
                  isMe ? 'bg-navy-900 text-white' : mentionsMe ? 'bg-amber-50 border border-amber-300' : 'bg-white border border-ink-200')}>
                  {renderText(m.text)}
                </div>
                <div className="text-[10px] text-ink-500 mt-0.5">{new Date(m.when).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative border-t border-soft p-2 surface">
        {showPicker && (
          <div className="absolute bottom-full left-2 mb-1 surface border border-soft rounded-md shadow-pop overflow-hidden w-80 z-20">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 px-3 py-1.5 bg-ink-50 border-b border-soft">Mention someone</div>
            {filteredPeople.length === 0 && <div className="px-3 py-2 text-xs text-ink-500 italic">No matches.</div>}
            {filteredPeople.map(u => (
              <button key={u.id} onClick={() => insertMention(u)}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-ink-50 text-xs">
                <Avatar initials={u.initials} size={22} />
                <div className="flex-1">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-[10px] text-ink-500">{u.role}</div>
                </div>
                <Pill tone="soft">@{u.id}</Pill>
              </button>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 rounded-md px-2 py-1">
                <Icon name="file-text" size={11} /> {a.name}
                <button onClick={() => setAttachments(att => att.filter((_, j) => j !== i))} className="text-ink-500 hover:text-red-600 ml-1"><Icon name="x" size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input type="file" multiple ref={fileInputRef} onChange={onPickFile} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-ink-100 text-ink-700" title="Attach file">
            <Icon name="upload" size={14} />
          </button>
          <input ref={inputRef} value={text} onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type message — @ to mention, click 📎 to attach…"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
          <Button variant="accent" icon="check" onClick={send}>Send</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatPanel });
