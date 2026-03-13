/* ═══════════════════════════════════════
   DATA.JS - Firebase-integrasjon
   ═══════════════════════════════════════

   Bruker Firebase Realtime Database.
   Erstatt firebaseConfig med dine egne verdier
   fra Firebase Console.
   ═══════════════════════════════════════ */

// ─── Firebase konfigurasjon ───
const firebaseConfig = {
  apiKey: "AIzaSyDDwWq049ScroAihddCr94OjysLAl2DpXs",
  authDomain: "ukeplaner-avansert.firebaseapp.com",
  databaseURL: "https://ukeplaner-avansert-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ukeplaner-avansert",
  storageBucket: "ukeplaner-avansert.firebasestorage.app",
  messagingSenderId: "196120393866",
  appId: "1:196120393866:web:2e08f5e697bc3dd7a5d573"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ═══════════════════════════════════════
   DATABASE-STRUKTUR:

   ukeplan/
   ├── school/
   │   └── name: "Lunner ungdomsskole"
   ├── classes/
   │   └── {classId}/
   │       ├── name: "8A"
   │       └── color: "#2563eb"
   ├── subjects/
   │   └── {classId}/
   │       └── {subjectId}/
   │           ├── name: "Matematikk"
   │           ├── colorIdx: 0
   │           ├── equip: "kalkulator"
   │           └── groups/
   │               └── {groupIdx}/
   │                   ├── name: "8A"
   │                   └── teachers: "Ola Nordmann"
   ├── teacherAssignments/
   │   └── {username}/
   │       └── {classId}: true
   ├── weekplans/
   │   └── {classId}/
   │       └── {weekNum}/
   │           ├── weekStart: "2026-01-05"
   │           ├── weekEnd: "2026-01-09"
   │           ├── infoText: "Viktig info..."
   │           ├── calendar/
   │           │   └── {row}_{col}: "hendelse"
   │           └── subjects/
   │               └── {subjectIdx}/
   │                   ├── equip: "..."
   │                   └── groups/
   │                       └── {groupIdx}/
   │                           ├── tema: "..."
   │                           ├── hw: "..."
   │                           └── day: "Mandag"
   ├── timetables/
   │   └── {classId}/
   │       └── {rowIdx}/
   │           └── slots/
   │               └── {dayName}/
   │                   ├── timeFrom: "08:30"
   │                   ├── timeTo: "09:15"
   │                   ├── subjectName: "Matematikk"
   │                   └── teacher: "Ola Nordmann"
   └── studentAssignments/
       └── {username}/
           └── {classId}: true
   ═══════════════════════════════════════ */

// Hjelpefunksjon: Firebase-nøkler kan ikke inneholde . # $ / [ ]
// Konverterer brukernavn til trygg nøkkel
function safeKey(str) {
  return str.replace(/\./g, '_dot_').replace(/#/g, '_hash_').replace(/\$/g, '_dollar_').replace(/\//g, '_slash_').replace(/\[/g, '_lb_').replace(/\]/g, '_rb_');
}

// ─── Skole ───
const DataService = {

  // Skolenavn
  async getSchoolName() {
    const snap = await db.ref('ukeplan/school/name').once('value');
    return snap.val() || '';
  },

  async setSchoolName(name) {
    await db.ref('ukeplan/school/name').set(name);
  },

  // ─── Klasser ───
  async getClasses() {
    const snap = await db.ref('ukeplan/classes').once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.entries(data).map(([id, cls]) => ({ id, ...cls }));
  },

  async addClass(cls) {
    await db.ref('ukeplan/classes/' + cls.id).set({
      name: cls.name,
      color: cls.color
    });
  },

  async updateClass(classId, updates) {
    await db.ref('ukeplan/classes/' + classId).update(updates);
  },

  async deleteClass(classId) {
    await db.ref('ukeplan/classes/' + classId).remove();
    await db.ref('ukeplan/subjects/' + classId).remove();
    await db.ref('ukeplan/weekplans/' + classId).remove();
    await db.ref('ukeplan/timetables/' + classId).remove();
  },

  // ─── Fag ───
  async getSubjects(classId) {
    const snap = await db.ref('ukeplan/subjects/' + classId).once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.entries(data).map(([id, subj]) => {
      // Konverter groups fra objekt til array hvis nødvendig
      let groups = subj.groups || [];
      if (!Array.isArray(groups)) {
        groups = Object.values(groups);
      }
      return { id, ...subj, groups };
    });
  },

  async getAllSubjects() {
    const snap = await db.ref('ukeplan/subjects').once('value');
    const data = snap.val();
    if (!data) return {};
    const result = {};
    Object.entries(data).forEach(([classId, subjects]) => {
      result[classId] = Object.entries(subjects).map(([id, subj]) => {
        let groups = subj.groups || [];
        if (!Array.isArray(groups)) groups = Object.values(groups);
        return { id, ...subj, groups };
      });
    });
    return result;
  },

  async setSubjects(classId, subjects) {
    const data = {};
    subjects.forEach(subj => {
      data[subj.id] = {
        name: subj.name,
        colorIdx: subj.colorIdx,
        equip: subj.equip || '',
        groups: subj.groups || []
      };
    });
    await db.ref('ukeplan/subjects/' + classId).set(data);
  },

  async deleteSubject(classId, subjectId) {
    await db.ref('ukeplan/subjects/' + classId + '/' + subjectId).remove();
  },

  // ─── Lærertildelinger ───
  async getTeacherAssignments(username) {
    const snap = await db.ref('ukeplan/teacherAssignments/' + safeKey(username)).once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.keys(data).filter(k => data[k] === true);
  },

  async setTeacherAssignment(username, classId, assigned) {
    if (assigned) {
      await db.ref('ukeplan/teacherAssignments/' + safeKey(username) + '/' + classId).set(true);
    } else {
      await db.ref('ukeplan/teacherAssignments/' + safeKey(username) + '/' + classId).remove();
    }
  },

  async getAllTeacherAssignments() {
    const snap = await db.ref('ukeplan/teacherAssignments').once('value');
    return snap.val() || {};
  },

  // ─── Elevtildelinger (støtter flere klasser) ───
  // Returnerer alltid en array av classId-er (bakoverkompatibel med gammelt format)
  async getStudentAssignments(username) {
    const snap = await db.ref('ukeplan/studentAssignments/' + safeKey(username)).once('value');
    const data = snap.val();
    if (!data) return [];
    // Gammelt format: { classId: "cls-123" } → konverter til nytt
    if (data.classId) return [data.classId];
    // Nytt format: { "cls-123": true, "cls-456": true }
    return Object.keys(data).filter(k => data[k] === true);
  },

  // Gammelt API: returner første tildelte klasse (brukes av student.html)
  async getStudentAssignment(username) {
    const assignments = await this.getStudentAssignments(username);
    return assignments.length > 0 ? assignments[0] : null;
  },

  async setStudentAssignment(username, classId, assigned) {
    if (assigned === false) {
      // Fjern en spesifikk klasse
      await db.ref('ukeplan/studentAssignments/' + safeKey(username) + '/' + classId).remove();
    } else {
      // Legg til klasse (nytt format)
      await db.ref('ukeplan/studentAssignments/' + safeKey(username) + '/' + classId).set(true);
    }
  },

  // Migrer gammel single-class data til nytt format
  async migrateStudentAssignment(username) {
    const snap = await db.ref('ukeplan/studentAssignments/' + safeKey(username)).once('value');
    const data = snap.val();
    if (data && data.classId) {
      // Gammelt format → konverter
      await db.ref('ukeplan/studentAssignments/' + safeKey(username)).set({ [data.classId]: true });
    }
  },

  // ─── Ukeplaner ───
  async getWeekplan(classId, weekNum) {
    const snap = await db.ref('ukeplan/weekplans/' + classId + '/' + weekNum).once('value');
    return snap.val() || null;
  },

  async saveWeekplan(classId, weekNum, data) {
    await db.ref('ukeplan/weekplans/' + classId + '/' + weekNum).set(data);
  },

  // ─── Kalender (Ukeoversikt fremover) ───
  // Lagres separat med absolutte ukenummer slik at data bevares på tvers av uker
  async getCalendar(classId) {
    const snap = await db.ref('ukeplan/calendar/' + classId).once('value');
    return snap.val() || {};
  },

  async saveCalendarEntries(classId, entries) {
    await db.ref('ukeplan/calendar/' + classId).update(entries);
  },

  // ─── Lytt på endringer (realtime) ───
  onClassesChange(callback) {
    db.ref('ukeplan/classes').on('value', snap => {
      const data = snap.val();
      if (!data) { callback([]); return; }
      const classes = Object.entries(data).map(([id, cls]) => ({ id, ...cls }));
      callback(classes);
    });
  },

  onSubjectsChange(classId, callback) {
    db.ref('ukeplan/subjects/' + classId).on('value', snap => {
      const data = snap.val();
      if (!data) { callback([]); return; }
      const subjects = Object.entries(data).map(([id, subj]) => {
        let groups = subj.groups || [];
        if (!Array.isArray(groups)) groups = Object.values(groups);
        return { id, ...subj, groups };
      });
      callback(subjects);
    });
  },

  // ─── Brukere ───
  async getUsers() {
    const snap = await db.ref('ukeplan/users').once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.entries(data).map(([id, u]) => ({ id, ...u }));
  },

  async getUsersByRole(role) {
    const users = await this.getUsers();
    return users.filter(u => u.role === role);
  },

  async addUser(user) {
    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    await db.ref('ukeplan/users/' + id).set({
      username: user.username,
      password: user.password,
      role: user.role,
      displayName: user.displayName || user.username
    });
    return id;
  },

  async updateUser(userId, updates) {
    await db.ref('ukeplan/users/' + userId).update(updates);
  },

  async deleteUser(userId) {
    // Hent brukerinfo først for å rydde opp tildelinger
    const snap = await db.ref('ukeplan/users/' + userId).once('value');
    const user = snap.val();
    if (user) {
      if (user.role === 'teacher') {
        await db.ref('ukeplan/teacherAssignments/' + safeKey(user.username)).remove();
      } else if (user.role === 'student') {
        await db.ref('ukeplan/studentAssignments/' + safeKey(user.username)).remove();
      }
    }
    await db.ref('ukeplan/users/' + userId).remove();
  },

  async addMultipleUsers(users) {
    const updates = {};
    const baseTime = Date.now();
    users.forEach((user, index) => {
      const id = 'user-' + (baseTime + index) + '-' + Math.random().toString(36).substr(2, 8);
      updates['ukeplan/users/' + id] = {
        username: user.username,
        password: user.password,
        role: user.role,
        displayName: user.displayName || user.username
      };
    });
    await db.ref().update(updates);
  },

  // ─── Timeplan ───
  async getTimetable(classId) {
    const snap = await db.ref('ukeplan/timetables/' + classId).once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.values(data).map(row => {
      let slots = row.slots || {};
      if (Array.isArray(slots)) {
        const obj = {};
        slots.forEach((s, i) => { if (s) obj[i] = s; });
        slots = obj;
      }
      // Konverter entries fra objekt til array (Firebase kan konvertere arrays)
      Object.keys(slots).forEach(day => {
        const slot = slots[day];
        if (slot && slot.entries && !Array.isArray(slot.entries)) {
          slot.entries = Object.values(slot.entries);
        }
      });
      return { slots };
    });
  },

  async saveTimetable(classId, rows) {
    await db.ref('ukeplan/timetables/' + classId).set(rows);
  },

  // Stopp lytting
  offClassesChange() {
    db.ref('ukeplan/classes').off();
  },

  offSubjectsChange(classId) {
    db.ref('ukeplan/subjects/' + classId).off();
  }
};
