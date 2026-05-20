import React from 'react';
// Central reactive store using React Context.
// All cross-cutting state (schools, tasks, chats, notifications) lives here.

const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  const [schools, setSchools]     = React.useState(() => ALL_SCHOOLS);
  const [tasks, setTasks]         = React.useState(() => TASKS);
  const [chats, setChats]         = React.useState(() => PRE_CHATS);
  const [notifs, setNotifs]       = React.useState(() => SAMPLE_NOTIFS);
  // R30.2 — people is now mutable so the boot orchestrator can replace it
  // with Supabase-fetched profiles (was read-only in R29).
  const [people, setPeople]       = React.useState(() => PEOPLE);
  const [projects, setProjects]   = React.useState(() => PROJECTS);

  // Project CRUD
  const addProject = (data) => {
    const id = data.id || ('p-' + Date.now());
    const proj = {
      id,
      tag: data.tag || id.toUpperCase(),
      name: data.name || 'Untitled program',
      type: data.type || 'School Program',
      region: data.region || '',
      city: data.city || '',
      value: +data.value || 0,
      start: data.start || new Date().toISOString().slice(0, 10),
      target: data.target || '2027-12-31',
      status: data.status || 'On Track',
      pmId: data.pmId || null,
      contractorId: data.contractorId || null,
      sites: 0,
      progress: 0,
      schoolDist: STAGE_KEYS.map(() => 0),
      currentStage: 0,
    };
    setProjects(ps => [...ps, proj]);
    if (window.bgInsert) window.bgInsert('projects', window.toDbProject(proj), 'project');
    return proj;
  };
  const updateProject = (id, patch) => {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    if (window.bgUpdate) window.bgUpdate('projects', id, window.toDbProjectPatch(patch), 'project');
  };
  const deleteProject = (id) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    if (window.bgDelete) window.bgDelete('projects', id, 'project');
  };
  // R31 — Manager-only mutator: flip status to 'completed' regardless of progress %.
  // Per client: project closure is an administrative decision (not an auto-flip at 100%).
  const markProjectComplete = (id, actor) => {
    let before = null;
    setProjects(ps => ps.map(p => {
      if (p.id !== id) return p;
      before = p.status;
      return { ...p, status: 'completed' };
    }));
    if (window.bgUpdate) window.bgUpdate('projects', id, { status: 'completed', updated_at: new Date().toISOString() }, 'project mark complete');
    // Audit log (logAudit lives on the r2 store; fire via window if available)
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('project-marked-complete', { detail: { projectId: id, by: actor?.id, before } }));
    }
  };
  const markProjectReopen = (id, actor) => {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, status: 'In Progress' } : p));
    if (window.bgUpdate) window.bgUpdate('projects', id, { status: 'in_progress', updated_at: new Date().toISOString() }, 'project reopen');
  };

  // ----- Tasks -----
  const addTask = (t) => {
    const id = `t${Date.now()}`;
    const task = {
      id,
      title: t.title || 'Untitled task',
      description: t.description || '',
      assigneeId: t.assigneeId,
      createdById: t.createdById || 'u1',
      createdAt: new Date().toISOString().slice(0, 10),
      due: t.due,
      priority: t.priority || 'Medium',
      status: 'Open',
      projectId: t.projectId || null,
      schoolId: t.schoolId || null,
      stageIndex: t.stageIndex == null ? null : t.stageIndex,
      messages: [],
    };
    setTasks(ts => [task, ...ts]);
    if (window.bgInsert) window.bgInsert('tasks', window.toDbTask(task), 'task');
    // Notify assignee
    if (task.assigneeId) {
      pushNotif({
        kind: 'task',
        text: `New task assigned: ${task.title}`,
        target: { kind: 'task', id },
      });
    }
    // R30.5 — send email notification (fire-and-forget, no await)
    if (typeof window !== 'undefined' && window.notifyEmail && task.assigneeId && task.assigneeId !== task.createdById) {
      try { window.notifyEmail('task_assigned', task, task.assigneeId, task.createdById); } catch (_) {}
    }
    return task;
  };

  const updateTask = (id, patch) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    if (window.bgUpdate) window.bgUpdate('tasks', id, window.toDbTaskPatch(patch), 'task');
  };

  const sendTaskMessage = (taskId, msg) => {
    setTasks(ts => ts.map(t => t.id === taskId
      ? { ...t, messages: [...t.messages, { id: `tm${Date.now()}`, ...msg, when: new Date().toISOString() }] }
      : t));
    if (window.bgInsert && window.userUuid && window.userUuid(msg.userId)) {
      window.bgInsert('task_messages', {
        task_id: taskId,
        author_id: window.userUuid(msg.userId),
        body: msg.text || '',
        created_at: new Date().toISOString(),
      }, 'task message');
    }
    const task = tasks.find(t => t.id === taskId);
    if (task && task.assigneeId !== msg.userId) {
      pushNotif({ kind: 'reminder', text: `Message on task: ${task.title}`, target: { kind: 'task', id: taskId } });
    }
  };

  const sendTaskReminder = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    pushNotif({
      kind: 'reminder',
      text: `Reminder: ${task.title}`,
      target: { kind: 'task', id: taskId },
    });
  };

  // ----- Chats -----
  const sendChatMessage = (schoolId, msg) => {
    const id = `m${Date.now()}`;
    const entry = {
      id, userId: msg.userId, text: msg.text,
      when: new Date().toISOString(), mentions: msg.mentions || [],
    };
    setChats(c => ({ ...c, [schoolId]: [...(c[schoolId] || []), entry] }));
    // R33.3 — persist to chat_messages table
    if (typeof window !== 'undefined' && window.supabase && window.USE_SUPABASE) {
      const userUuid = (typeof window.userUuid === 'function') ? window.userUuid(msg.userId) : null;
      window.supabase.from('chat_messages').insert({
        id, school_id: schoolId, user_id: userUuid, user_label: msg.userId,
        text: msg.text, mentions: msg.mentions || [],
      }).then(({ error }) => {
        if (error) console.error('[supabase insert chat_message]', error);
      });
    }
    // Mention notifications
    (msg.mentions || []).forEach(uid => {
      const sender = people.find(p => p.id === msg.userId);
      pushNotif({
        kind: 'mention',
        text: `${sender?.name || 'Someone'} mentioned you in a school chat`,
        target: { kind: 'school', id: schoolId },
      });
    });
  };

  // ----- Schools -----
  const updateSchoolStage = (schoolId, stageIndex, payload) => {
    let nextStages = null;
    setSchools(ss => ss.map(s => {
      if (s.id !== schoolId) return s;
      const stages = s.stages.slice();
      stages[stageIndex] = { ...stages[stageIndex], ...payload };
      nextStages = stages;
      const lastUpdate = { by: payload.by, when: payload.date };
      return { ...s, stages, lastUpdate };
    }));
    if (window.bgUpdate && nextStages) window.bgUpdate('schools', schoolId, { stages: nextStages }, 'school stage');
    pushNotif({
      kind: 'stage',
      text: `Stage "${SCHOOL_STAGES[stageIndex]}" updated for school`,
      target: { kind: 'school', id: schoolId },
    });
  };

  const updateSchoolRemark = (schoolId, remark) => {
    setSchools(ss => ss.map(s => s.id === schoolId ? { ...s, remark } : s));
    if (window.bgUpdate) window.bgUpdate('schools', schoolId, window.toDbSchoolPatch({ remark }), 'school remark');
  };

  const addSchoolPhoto = (schoolId, stageIndex, label) => {
    setSchools(ss => ss.map(s => {
      if (s.id !== schoolId) return s;
      const photos = { ...s.photos };
      photos[stageIndex] = [...(photos[stageIndex] || []), { id: `ph${Date.now()}`, label, when: new Date().toISOString() }];
      return { ...s, photos };
    }));
  };

  // ----- Notifications -----
  const pushNotif = (n) => {
    setNotifs(ns => [{
      id: `n${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      when: 'just now',
      read: false,
      ...n,
    }, ...ns]);
  };

  const markNotifRead = (id) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotifsRead = () => {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  };

  // R30.4 BUG #2 — setter wrappers that also splice the window-level legacy
  // array so non-store readers (e.g. countEnergized(ALL_SCHOOLS), search in
  // shell.jsx, audit-log seed) see fresh data. Without this, window.TASKS
  // stayed at 26 after a hard reload + R30.2 boot fetched 27 from DB.
  const _syncArray = (globalArr, rows) => {
    if (Array.isArray(globalArr) && Array.isArray(rows)) {
      globalArr.length = 0;
      globalArr.push(...rows);
    }
  };
  const baseValue = {
    schools, tasks, chats, notifs, people, projects,
    addTask, updateTask, sendTaskMessage, sendTaskReminder,
    sendChatMessage,
    updateSchoolStage, updateSchoolRemark, addSchoolPhoto,
    pushNotif, markNotifRead, markAllNotifsRead,
    addProject, updateProject, deleteProject, markProjectComplete, markProjectReopen,
    // R30.2/R30.4 — internal setters exposed for the boot orchestrator (read side).
    // Each setter also syncs the corresponding window-level legacy array.
    _setSchools: (rows) => { _syncArray(typeof window !== 'undefined' && window.ALL_SCHOOLS, rows); setSchools(rows); },
    _setTasks:   (rows) => { _syncArray(typeof window !== 'undefined' && window.TASKS,       rows); setTasks(rows); },
    _setProjects:(rows) => { _syncArray(typeof window !== 'undefined' && window.PROJECTS,    rows); setProjects(rows); },
    _setPeople:  (rows) => { _syncArray(typeof window !== 'undefined' && window.PEOPLE,      rows); setPeople(rows); },
    _setNotifs:  setNotifs,  // notifs has no window-level legacy array
    _setChats:   setChats,   // R33.3 — boot orchestrator seeds school chat history
    setChats,                // R33.3 — also exposed for realtime refresher
  };
  const r2 = (typeof useStoreR2 === 'function') ? useStoreR2(baseValue) : {};
  const value = { ...baseValue, ...r2 };
  // R31 — expose latest store value to non-React callers (e.g. canViewFinancials in data.jsx)
  if (typeof window !== 'undefined') window.__lastStoreValue = value;
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

const useStore = () => React.useContext(StoreCtx);

// Helpers
const getPerson = (id) => PEOPLE.find(p => p.id === id);
const getProject = (id) => PROJECTS.find(p => p.id === id);
const isOverdue = (dueIso) => {
  const today = new Date('2026-05-04').getTime();
  return new Date(dueIso).getTime() < today;
};
const todayIso = () => '2026-05-04';

Object.assign(window, { StoreProvider, StoreCtx, useStore, getPerson, getProject, isOverdue, todayIso });
