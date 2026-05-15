import React from 'react';
// Central reactive store using React Context.
// All cross-cutting state (schools, tasks, chats, notifications) lives here.

const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  const [schools, setSchools]     = React.useState(() => ALL_SCHOOLS);
  const [tasks, setTasks]         = React.useState(() => TASKS);
  const [chats, setChats]         = React.useState(() => PRE_CHATS);
  const [notifs, setNotifs]       = React.useState(() => SAMPLE_NOTIFS);
  const [people]                  = React.useState(() => PEOPLE);
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
    return proj;
  };
  const updateProject = (id, patch) => setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  const deleteProject = (id) => setProjects(ps => ps.filter(p => p.id !== id));

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
    // Notify assignee
    if (task.assigneeId) {
      pushNotif({
        kind: 'task',
        text: `New task assigned: ${task.title}`,
        target: { kind: 'task', id },
      });
    }
    return task;
  };

  const updateTask = (id, patch) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const sendTaskMessage = (taskId, msg) => {
    setTasks(ts => ts.map(t => t.id === taskId
      ? { ...t, messages: [...t.messages, { id: `tm${Date.now()}`, ...msg, when: new Date().toISOString() }] }
      : t));
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
    setChats(c => ({
      ...c,
      [schoolId]: [...(c[schoolId] || []), {
        id: `m${Date.now()}`,
        userId: msg.userId,
        text: msg.text,
        when: new Date().toISOString(),
        mentions: msg.mentions || [],
      }],
    }));
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
    setSchools(ss => ss.map(s => {
      if (s.id !== schoolId) return s;
      const stages = s.stages.slice();
      stages[stageIndex] = { ...stages[stageIndex], ...payload };
      const lastUpdate = { by: payload.by, when: payload.date };
      return { ...s, stages, lastUpdate };
    }));
    pushNotif({
      kind: 'stage',
      text: `Stage "${SCHOOL_STAGES[stageIndex]}" updated for school`,
      target: { kind: 'school', id: schoolId },
    });
  };

  const updateSchoolRemark = (schoolId, remark) => {
    setSchools(ss => ss.map(s => s.id === schoolId ? { ...s, remark } : s));
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

  const baseValue = {
    schools, tasks, chats, notifs, people, projects,
    addTask, updateTask, sendTaskMessage, sendTaskReminder,
    sendChatMessage,
    updateSchoolStage, updateSchoolRemark, addSchoolPhoto,
    pushNotif, markNotifRead, markAllNotifsRead,
    addProject, updateProject, deleteProject,
    _setSchools: setSchools,
  };
  const r2 = (typeof useStoreR2 === 'function') ? useStoreR2(baseValue) : {};
  const value = { ...baseValue, ...r2 };
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
