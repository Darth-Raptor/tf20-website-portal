const STORAGE_KEY = "tf20-pms-roster-v1";
const SETTINGS_KEY = "tf20-pms-settings-v1";
const ATTENDANCE_KEY = "tf20-pms-attendance-v1";
const LOA_KEY = "tf20-pms-loa-v1";

const ranks = [
  "COL",
  "LTC",
  "MAJ",
  "CPT",
  "1LT",
  "CW3",
  "CW2",
  "CSM",
  "MSG",
  "SFC",
  "SSG",
  "SGT",
  "CPL",
  "SPC",
  "PFC",
  "RCT",
];

const squads = [
  "Command",
  "SFOD-A 201",
  "Ranger Assault",
  "Aviation Detachment",
  "Recruit Pipeline",
  "Reserve",
];

const seedMembers = [
  {
    id: "member-havoc-6",
    rank: "COL",
    callsign: "Havoc 6",
    discord: "havoc6",
    steam: "76561198000002001",
    billet: "Task Force Commander",
    squad: "Command",
    qualifications: ["Mission Command", "Zeus", "Instructor"],
    attendance: 96,
    awards: ["Distinguished Service", "Campaign Star"],
    loa: "None",
    status: "Active",
    notes: "Overall command authority and final approval for policy changes.",
    specialty: "Command",
    timezone: "CST",
    lastTraining: "2026-04-18",
    lastPromotion: "2025-12-01",
    joined: "2024-05-04",
  },
  {
    id: "member-vanguard-7",
    rank: "CSM",
    callsign: "Vanguard 7",
    discord: "vanguard7",
    steam: "76561198000002002",
    billet: "Task Force Senior Enlisted Advisor",
    squad: "Command",
    qualifications: ["Instructor", "Recruiting", "Ranger School"],
    attendance: 91,
    awards: ["Meritorious Service"],
    loa: "None",
    status: "Active",
    notes: "Maintains standards, training discipline, and NCO development.",
    specialty: "Senior Enlisted",
    timezone: "CST",
    lastTraining: "2026-04-20",
    lastPromotion: "2025-11-18",
    joined: "2024-08-11",
  },
  {
    id: "member-nomad-1",
    rank: "CPT",
    callsign: "Nomad 1",
    discord: "nomad1",
    steam: "76561198000002003",
    billet: "SFOD Element Lead",
    squad: "SFOD-A 201",
    qualifications: ["JTAC", "SERE", "Advanced Medical"],
    attendance: 88,
    awards: ["Valor Commendation"],
    loa: "None",
    status: "Active",
    notes: "Primary planner for special reconnaissance and direct action missions.",
    specialty: "Special Reconnaissance",
    timezone: "EST",
    lastTraining: "2026-04-21",
    lastPromotion: "2026-01-05",
    joined: "2025-01-18",
  },
  {
    id: "member-raptor",
    rank: "SSG",
    callsign: "Raptor",
    discord: "raptor",
    steam: "76561198000002004",
    billet: "Ranger Squad Leader",
    squad: "Ranger Assault",
    qualifications: ["Ranger School", "Breacher", "CLS"],
    attendance: 84,
    awards: ["Combat Action"],
    loa: "None",
    status: "Active",
    notes: "Runs assault rehearsals and accountability for Ranger element.",
    specialty: "Infantry Leadership",
    timezone: "MST",
    lastTraining: "2026-04-19",
    lastPromotion: "2026-02-14",
    joined: "2025-03-07",
  },
  {
    id: "member-nightmare",
    rank: "CW3",
    callsign: "Nightmare",
    discord: "nightmare",
    steam: "76561198000002005",
    billet: "Aviation Lead",
    squad: "Aviation Detachment",
    qualifications: ["Rotary Wing", "CAS", "Air Assault"],
    attendance: 79,
    awards: ["Aviation Service"],
    loa: "Pending",
    status: "LOA",
    notes: "Pending limited availability through next training cycle.",
    specialty: "Rotary Wing Pilot",
    timezone: "PST",
    lastTraining: "2026-04-10",
    lastPromotion: "2025-09-28",
    joined: "2025-05-24",
  },
  {
    id: "member-mako",
    rank: "SPC",
    callsign: "Mako",
    discord: "mako",
    steam: "76561198000002006",
    billet: "Automatic Rifleman",
    squad: "Ranger Assault",
    qualifications: ["CLS"],
    attendance: 72,
    awards: [],
    loa: "None",
    status: "Active",
    notes: "Needs updated qualification packet after next FTX.",
    specialty: "Automatic Rifleman",
    timezone: "CST",
    lastTraining: "2026-04-12",
    lastPromotion: "2026-03-02",
    joined: "2025-10-01",
  },
  {
    id: "member-newman",
    rank: "RCT",
    callsign: "Newman",
    discord: "newman",
    steam: "",
    billet: "Recruit Candidate",
    squad: "Recruit Pipeline",
    qualifications: [],
    attendance: 100,
    awards: [],
    loa: "None",
    status: "Recruit",
    notes: "Awaiting orientation and Steam ID confirmation.",
    specialty: "Candidate",
    timezone: "Unknown",
    lastTraining: "2026-04-23",
    lastPromotion: "",
    joined: "2026-04-22",
  },
];

const publicEvents = [
  {
    title: "Operation Broken Compass",
    date: "Saturday 1900 CST",
    detail: "Joint recon-to-raid package with SFOD lead and Ranger QRF.",
  },
  {
    title: "Aviation Currency Night",
    date: "Wednesday 2000 CST",
    detail: "Lift rehearsals, landing zone procedures, and CAS deconfliction.",
  },
  {
    title: "Recruit Orientation",
    date: "Sunday 1800 CST",
    detail: "Discord onboarding, modpack check, and baseline movement drills.",
  },
];

const seedAttendanceEvents = [
  {
    id: "event-broken-compass",
    title: "Operation Broken Compass",
    type: "Operation",
    date: "2026-04-25",
    owner: "Command Staff",
    detail: "Joint recon-to-raid package with SFOD lead and Ranger QRF.",
    attendance: {
      "member-havoc-6": "Present",
      "member-vanguard-7": "Present",
      "member-nomad-1": "Present",
      "member-raptor": "Present",
      "member-nightmare": "Excused",
      "member-mako": "Absent",
      "member-newman": "Present",
    },
  },
  {
    id: "event-aviation-currency",
    title: "Aviation Currency Night",
    type: "Training",
    date: "2026-04-22",
    owner: "Aviation Detachment",
    detail: "Lift rehearsals, landing zone procedures, and CAS deconfliction.",
    attendance: {
      "member-havoc-6": "Excused",
      "member-vanguard-7": "Present",
      "member-nomad-1": "Present",
      "member-raptor": "Present",
      "member-nightmare": "Present",
      "member-mako": "Present",
      "member-newman": "Present",
    },
  },
  {
    id: "event-recruit-orientation",
    title: "Recruit Orientation",
    type: "Recruiting",
    date: "2026-04-21",
    owner: "Recruiting Staff",
    detail: "Discord onboarding, modpack check, and baseline movement drills.",
    attendance: {
      "member-vanguard-7": "Present",
      "member-newman": "Present",
    },
  },
];

const seedLoaRequests = [
  {
    id: "loa-nightmare-april",
    memberId: "member-nightmare",
    type: "Reduced Availability",
    start: "2026-04-20",
    end: "2026-05-04",
    reason: "Reduced flight availability during the current training cycle.",
    status: "Pending",
    submitted: "2026-04-19",
  },
];

let roster = loadRoster();
let selectedId = roster[0]?.id;
let selfServiceId = roster.find((member) => member.callsign === "Mako")?.id || roster[0]?.id;
let accessLevel = loadSettings().accessLevel;
let attendanceEvents = loadAttendanceEvents();
let selectedEventId = attendanceEvents[0]?.id;
let loaRequests = loadLoaRequests();

const elements = {
  tabs: document.querySelectorAll(".dash-tab"),
  views: document.querySelectorAll("[data-view-panel]"),
  dashTitle: document.querySelector("#dashTitle"),
  metricGrid: document.querySelector("#metricGrid"),
  readinessList: document.querySelector("#readinessList"),
  eventList: document.querySelector("#eventList"),
  attentionQueue: document.querySelector("#attentionQueue"),
  rosterBody: document.querySelector("#rosterBody"),
  searchInput: document.querySelector("#searchInput"),
  squadFilter: document.querySelector("#squadFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  accessLevel: document.querySelector("#accessLevel"),
  accessNote: document.querySelector("#accessNote"),
  profileSummary: document.querySelector("#profileSummary"),
  memberForm: document.querySelector("#memberForm"),
  editStateLabel: document.querySelector("#editStateLabel"),
  addMemberButton: document.querySelector("#addMemberButton"),
  memberDialog: document.querySelector("#memberDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  newMemberForm: document.querySelector("#newMemberForm"),
  exportJson: document.querySelector("#exportJson"),
  exportCsv: document.querySelector("#exportCsv"),
  copySchema: document.querySelector("#copySchema"),
  resetDemo: document.querySelector("#resetDemo"),
  deleteMember: document.querySelector("#deleteMember"),
  attendanceEventSelect: document.querySelector("#attendanceEventSelect"),
  attendanceAccessLabel: document.querySelector("#attendanceAccessLabel"),
  attendanceEventSummary: document.querySelector("#attendanceEventSummary"),
  attendanceBody: document.querySelector("#attendanceBody"),
  markAllPresent: document.querySelector("#markAllPresent"),
  eventForm: document.querySelector("#eventForm"),
  loaForm: document.querySelector("#loaForm"),
  loaMemberSelect: document.querySelector("#loaMemberSelect"),
  loaAccessLabel: document.querySelector("#loaAccessLabel"),
  loaQueue: document.querySelector("#loaQueue"),
  csvInput: document.querySelector("#csvInput"),
  importCsv: document.querySelector("#importCsv"),
  loadSampleCsv: document.querySelector("#loadSampleCsv"),
  toast: document.querySelector("#toast"),
};

initialize();

function initialize() {
  populateSelects();
  bindEvents();
  elements.accessLevel.value = accessLevel;
  renderAll();
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  [elements.searchInput, elements.squadFilter, elements.statusFilter].forEach((control) => {
    control.addEventListener("input", renderRoster);
  });

  elements.attendanceEventSelect.addEventListener("change", (event) => {
    selectedEventId = event.target.value;
    renderAttendance();
  });

  elements.accessLevel.addEventListener("change", (event) => {
    accessLevel = event.target.value;
    saveSettings();
    renderProfile();
    renderAttendance();
    renderLoa();
    renderAccessNote();
  });

  elements.memberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSelectedMember(new FormData(elements.memberForm));
  });

  elements.addMemberButton.addEventListener("click", () => {
    if (!canCreateMembers()) {
      showToast("Only command staff can add members in this prototype.");
      return;
    }
    elements.memberDialog.showModal();
  });

  elements.closeDialog.addEventListener("click", () => elements.memberDialog.close());

  elements.newMemberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addMember(new FormData(elements.newMemberForm));
  });

  elements.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addAttendanceEvent(new FormData(elements.eventForm));
  });

  elements.markAllPresent.addEventListener("click", markAllPresent);

  elements.loaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitLoaRequest(new FormData(elements.loaForm));
  });

  elements.exportJson.addEventListener("click", () => {
    downloadFile("tf20-personnel.json", JSON.stringify(roster, null, 2), "application/json");
    showToast("Roster exported as JSON.");
  });

  elements.exportCsv.addEventListener("click", () => {
    downloadFile("tf20-personnel.csv", toCsv(roster), "text/csv");
    showToast("Roster exported as CSV.");
  });

  elements.copySchema.addEventListener("click", async () => {
    const schema =
      "rank,callsign,discord,steam,billet,specialty,squad,timezone,qualifications,attendance,awards,loa,status,notes,lastTraining,lastPromotion,joined";
    try {
      await navigator.clipboard.writeText(schema);
      showToast("Field schema copied.");
    } catch {
      elements.csvInput.value = schema;
      setView("airtable");
      showToast("Clipboard unavailable. Schema placed in the Airtable box.");
    }
  });

  elements.resetDemo.addEventListener("click", () => {
    if (!window.confirm("Reset the local demo roster to the original sample data?")) return;
    roster = cloneRoster(seedMembers);
    selectedId = roster[0].id;
    selfServiceId = roster.find((member) => member.callsign === "Mako")?.id || roster[0].id;
    attendanceEvents = cloneRoster(seedAttendanceEvents);
    selectedEventId = attendanceEvents[0]?.id;
    loaRequests = cloneRoster(seedLoaRequests);
    saveRoster();
    saveAttendanceEvents();
    saveLoaRequests();
    renderAll();
    showToast("Demo roster reset.");
  });

  elements.deleteMember.addEventListener("click", () => {
    if (!canDeleteMembers()) {
      showToast("Only command staff can delete members.");
      return;
    }
    if (roster.length <= 1) {
      showToast("Keep at least one member in the roster.");
      return;
    }
    if (!window.confirm("Delete this local personnel record from the demo roster?")) return;
    roster = roster.filter((member) => member.id !== selectedId);
    attendanceEvents = attendanceEvents.map((event) => {
      const nextAttendance = { ...(event.attendance || {}) };
      delete nextAttendance[selectedId];
      return { ...event, attendance: nextAttendance };
    });
    loaRequests = loaRequests.filter((request) => request.memberId !== selectedId);
    selectedId = roster[0].id;
    if (!roster.some((member) => member.id === selfServiceId)) {
      selfServiceId = roster[0].id;
    }
    saveRoster();
    saveAttendanceEvents();
    saveLoaRequests();
    renderAll();
    showToast("Member deleted.");
  });

  elements.loadSampleCsv.addEventListener("click", () => {
    elements.csvInput.value = toCsv(seedMembers.slice(0, 3));
  });

  elements.importCsv.addEventListener("click", () => {
    const imported = parseCsv(elements.csvInput.value);
    if (!imported.length) {
      showToast("No valid CSV rows found.");
      return;
    }
    roster = imported.map(normalizeImportedMember);
    selectedId = roster[0].id;
    selfServiceId = roster[0].id;
    attendanceEvents = [];
    selectedEventId = undefined;
    loaRequests = [];
    saveRoster();
    saveAttendanceEvents();
    saveLoaRequests();
    renderAll();
    showToast(`${roster.length} Airtable CSV rows imported.`);
  });
}

function setView(viewName) {
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  elements.views.forEach((view) => view.classList.toggle("active", view.dataset.viewPanel === viewName));
  elements.dashTitle.textContent = titleCase(viewName);
}

function renderAll() {
  reconcileAttendancePercentages();
  renderMetrics();
  renderReadiness();
  renderEvents();
  renderAttentionQueue();
  renderRoster();
  renderProfile();
  renderAttendance();
  renderLoa();
  renderAccessNote();
}

function renderMetrics() {
  const total = roster.length;
  const active = roster.filter((member) => member.status === "Active").length;
  const loa = roster.filter((member) => member.status === "LOA" || member.loa !== "None").length;
  const avgAttendance = Math.round(roster.reduce((sum, member) => sum + Number(member.attendance || 0), 0) / total) || 0;
  const qualified = roster.filter((member) => member.qualifications.length > 0).length;

  const metrics = [
    { label: "Total Personnel", value: total, detail: "All roster records" },
    { label: "Active Members", value: active, detail: `${loa} LOA or pending` },
    { label: "Avg Attendance", value: `${avgAttendance}%`, detail: "Across all elements" },
    { label: "Qualified", value: qualified, detail: "Members with qualification tags" },
  ];

  elements.metricGrid.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric">
          <span>${metric.label}</span>
          <strong>${metric.value}</strong>
          <small>${metric.detail}</small>
        </article>
      `,
    )
    .join("");
}

function renderReadiness() {
  const grouped = squads
    .map((squad) => {
      const members = roster.filter((member) => member.squad === squad);
      const attendance = Math.round(
        members.reduce((sum, member) => sum + Number(member.attendance || 0), 0) / Math.max(members.length, 1),
      );
      return { squad, attendance, count: members.length };
    })
    .filter((item) => item.count > 0);

  elements.readinessList.innerHTML = grouped
    .map(
      (item) => `
        <div class="readiness-row">
          <header><span>${item.squad}</span><span>${item.attendance}%</span></header>
          <div class="bar" aria-label="${item.squad} attendance ${item.attendance}%">
            <span style="width: ${item.attendance}%"></span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderEvents() {
  elements.eventList.innerHTML = publicEvents
    .map(
      (event) => `
        <article class="event-card">
          <header><span>${event.title}</span><span>${event.date}</span></header>
          <p>${event.detail}</p>
        </article>
      `,
    )
    .join("");
}

function renderAttentionQueue() {
  const lowAttendance = roster
    .filter((member) => Number(member.attendance) < 75 && member.status !== "Reserve")
    .map((member) => ({
      label: `${member.callsign} attendance`,
      value: `${member.attendance}%`,
      detail: `${member.squad} needs a check-in or attendance review.`,
    }));

  const pendingLoa = loaRequests
    .filter((request) => request.status === "Pending")
    .map((request) => {
      const member = roster.find((item) => item.id === request.memberId);
      return {
        label: `${member?.callsign || "Unknown"} LOA`,
        value: "Pending",
        detail: `${formatDate(request.start)} to ${formatDate(request.end)} awaiting staff action.`,
      };
    });

  const missingSteam = roster
    .filter((member) => !member.steam)
    .map((member) => ({
      label: `${member.callsign} Steam ID`,
      value: "Missing",
      detail: `${member.billet || "Personnel file"} needs a Steam ID before full processing.`,
    }));

  const queue = [...pendingLoa, ...lowAttendance, ...missingSteam].slice(0, 6);

  elements.attentionQueue.innerHTML = queue.length
    ? queue
        .map(
          (item) => `
            <article class="attention-card">
              <header><span>${item.label}</span><span>${item.value}</span></header>
              <p>${item.detail}</p>
            </article>
          `,
        )
        .join("")
    : `<article class="attention-card"><p>No immediate personnel actions are queued.</p></article>`;
}

function renderRoster() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const squad = elements.squadFilter.value;
  const status = elements.statusFilter.value;

  const filtered = roster.filter((member) => {
    const searchable = [
      member.rank,
      member.callsign,
      member.discord,
      member.steam,
      member.billet,
      member.squad,
      member.status,
      member.qualifications.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (squad === "all" || member.squad === squad) &&
      (status === "all" || member.status === status)
    );
  });

  elements.rosterBody.innerHTML = filtered
    .map(
      (member) => `
        <tr data-member-id="${member.id}" class="${member.id === selectedId ? "selected" : ""}">
          <td>${member.rank}</td>
          <td><strong>${member.callsign}</strong><br><span class="muted">${member.discord || "No Discord ID"}</span></td>
          <td>${member.billet || "Unassigned"}</td>
          <td>${member.squad}</td>
          <td>
            <div class="bar" aria-label="${member.callsign} attendance ${member.attendance}%">
              <span style="width: ${member.attendance}%"></span>
            </div>
          </td>
          <td>${statusPill(member.status)}</td>
        </tr>
      `,
    )
    .join("");

  elements.rosterBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      selectedId = row.dataset.memberId;
      renderRoster();
      renderProfile();
      setView("profile");
    });
  });
}

function renderProfile() {
  const member = getSelectedMember();
  if (!member) return;

  elements.profileSummary.innerHTML = `
    <div class="profile-badge">
      <img src="assets/tf20-logo.png" alt="" />
      <div>
        <span class="tag">${member.rank}</span>
        <strong>${member.callsign}</strong>
        <small>${member.billet || "Unassigned"}${member.specialty ? ` / ${member.specialty}` : ""}</small>
      </div>
    </div>
    <div class="profile-meta">
      <div><span>Squad</span><strong>${member.squad}</strong></div>
      <div><span>Status</span><strong>${member.status}</strong></div>
      <div><span>Attendance</span><strong>${member.attendance}%</strong></div>
      <div><span>Timezone</span><strong>${member.timezone || "Unknown"}</strong></div>
      <div><span>LOA</span><strong>${member.loa}</strong></div>
      <div><span>Joined</span><strong>${formatDate(member.joined)}</strong></div>
    </div>
  `;

  const form = elements.memberForm;
  setSelectValue(form.rank, member.rank);
  form.callsign.value = member.callsign;
  form.discord.value = member.discord;
  form.steam.value = member.steam;
  form.billet.value = member.billet;
  form.specialty.value = member.specialty || "";
  setSelectValue(form.squad, member.squad);
  form.timezone.value = member.timezone || "";
  form.attendance.value = member.attendance;
  form.loa.value = member.loa;
  form.status.value = member.status;
  form.qualifications.value = member.qualifications.join(", ");
  form.awards.value = member.awards.join(", ");
  form.lastTraining.value = member.lastTraining;
  form.lastPromotion.value = member.lastPromotion || "";
  form.notes.value = member.notes;

  const canEditMemberFields = canEditMember(member);
  const canEditStaffFields = canEditStaff(member);
  form.querySelectorAll("[data-field]").forEach((field) => {
    const requiredAccess = field.dataset.field;
    field.disabled = requiredAccess === "staff" ? !canEditStaffFields : !canEditMemberFields;
  });
  form.querySelector("button[type='submit']").disabled = !canEditMemberFields && !canEditStaffFields;
  elements.deleteMember.disabled = !canDeleteMembers();
  elements.editStateLabel.textContent = canEditStaffFields
    ? "Full edit"
    : canEditMemberFields
      ? "Self-service fields"
      : "Read-only";
}

function renderAttendance() {
  if (!selectedEventId && attendanceEvents[0]) selectedEventId = attendanceEvents[0].id;
  const selectedEvent = getSelectedEvent();
  const canManage = canManageAttendance();

  elements.attendanceEventSelect.innerHTML = attendanceEvents.length
    ? attendanceEvents
        .map((event) => `<option value="${event.id}">${event.date} / ${event.title}</option>`)
        .join("")
    : `<option value="">No attendance events</option>`;
  elements.attendanceEventSelect.value = selectedEvent?.id || "";
  elements.attendanceEventSelect.disabled = !attendanceEvents.length;
  elements.markAllPresent.disabled = !selectedEvent || !canManage;
  elements.eventForm.querySelectorAll("input, select, textarea, button").forEach((field) => {
    field.disabled = !canManage;
  });
  elements.attendanceAccessLabel.textContent = canManage ? "Staff editable" : "Read-only";

  if (!selectedEvent) {
    elements.attendanceEventSummary.innerHTML = `<p>Create an event to begin tracking attendance.</p>`;
    elements.attendanceBody.innerHTML = "";
    return;
  }

  const stats = attendanceSummary(selectedEvent);
  elements.attendanceEventSummary.innerHTML = `
    <strong>${selectedEvent.title}</strong>
    <p>${selectedEvent.type} / ${formatDate(selectedEvent.date)} / ${selectedEvent.owner || "Unassigned"} / ${stats.present} present, ${stats.excused} excused, ${stats.absent} absent</p>
  `;

  elements.attendanceBody.innerHTML = roster
    .map((member) => {
      const current = selectedEvent.attendance?.[member.id] || "No Report";
      const disabled = canManage ? "" : "disabled";
      return `
        <tr>
          <td><strong>${member.rank} ${member.callsign}</strong><br><span class="muted">${member.billet || "Unassigned"}</span></td>
          <td>${member.squad}</td>
          <td>${member.attendance}%</td>
          <td>
            <select class="attendance-status" data-member-id="${member.id}" ${disabled}>
              ${["No Report", "Present", "Excused", "Absent"].map(
                (status) => `<option value="${status}" ${status === current ? "selected" : ""}>${status}</option>`,
              ).join("")}
            </select>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.attendanceBody.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      updateAttendance(selectedEvent.id, select.dataset.memberId, select.value);
    });
  });
}

function renderLoa() {
  const canApprove = canEditStaff();
  const editableMembers = accessLevel === "member" ? roster.filter((member) => member.id === selfServiceId) : roster;
  elements.loaAccessLabel.textContent = canApprove ? "Staff can submit and approve" : "Member self-service";
  elements.loaMemberSelect.innerHTML = editableMembers
    .map((member) => `<option value="${member.id}">${member.rank} ${member.callsign}</option>`)
    .join("");
  if (editableMembers.some((member) => member.id === selectedId)) {
    elements.loaMemberSelect.value = selectedId;
  }

  const sortedRequests = [...loaRequests].sort((a, b) => {
    const statusWeight = { Pending: 0, Approved: 1, Denied: 2 };
    return (statusWeight[a.status] ?? 3) - (statusWeight[b.status] ?? 3) || b.submitted.localeCompare(a.submitted);
  });

  elements.loaQueue.innerHTML = sortedRequests.length
    ? sortedRequests
        .map((request) => {
          const member = roster.find((item) => item.id === request.memberId);
          const actions =
            canApprove && request.status === "Pending"
              ? `<footer>
                  <button class="button compact" type="button" data-loa-action="approve" data-request-id="${request.id}">Approve</button>
                  <button class="button danger compact" type="button" data-loa-action="deny" data-request-id="${request.id}">Deny</button>
                </footer>`
              : "";
          return `
            <article class="loa-card ${request.status.toLowerCase()}">
              <header>
                <span>${member ? `${member.rank} ${member.callsign}` : "Unknown Member"}</span>
                <span>${request.status}</span>
              </header>
              <p>${request.type} / ${formatDate(request.start)} to ${formatDate(request.end)}</p>
              <p>${request.reason}</p>
              ${actions}
            </article>
          `;
        })
        .join("")
    : `<article class="loa-card"><p>No LOA requests have been submitted.</p></article>`;

  elements.loaQueue.querySelectorAll("[data-loa-action]").forEach((button) => {
    button.addEventListener("click", () => updateLoaStatus(button.dataset.requestId, button.dataset.loaAction));
  });
}

function renderAccessNote() {
  const notes = {
    command: "Full prototype access. Intended for senior staff ranks.",
    staff: "Can edit training, billet, attendance, and readiness-style fields.",
    member: "Can edit only the assigned self-service profile in this demo.",
  };
  elements.accessNote.textContent = notes[accessLevel];
}

function populateSelects() {
  elements.squadFilter.innerHTML = `<option value="all">All squads</option>${squads
    .map((squad) => `<option value="${squad}">${squad}</option>`)
    .join("")}`;

  const rankOptions = ranks.map((rank) => `<option value="${rank}">${rank}</option>`).join("");
  const squadOptions = squads.map((squad) => `<option value="${squad}">${squad}</option>`).join("");

  document.querySelectorAll('select[name="rank"]').forEach((select) => {
    select.innerHTML = rankOptions;
  });
  document.querySelectorAll('select[name="squad"]').forEach((select) => {
    select.innerHTML = squadOptions;
  });
}

function saveSelectedMember(formData) {
  const member = getSelectedMember();
  if (!member) return;

  if (!canEditMember(member) && !canEditStaff(member)) {
    showToast("Current rank access cannot edit this file.");
    return;
  }

  const next = {
    ...member,
    callsign: getFieldValue(member, formData, "callsign", canEditMember(member)),
    discord: getFieldValue(member, formData, "discord", canEditMember(member)),
    steam: getFieldValue(member, formData, "steam", canEditMember(member)),
    timezone: getFieldValue(member, formData, "timezone", canEditMember(member)),
    loa: getFieldValue(member, formData, "loa", canEditMember(member)),
    notes: getFieldValue(member, formData, "notes", canEditMember(member)),
    rank: getFieldValue(member, formData, "rank", canEditStaff(member)),
    billet: getFieldValue(member, formData, "billet", canEditStaff(member)),
    specialty: getFieldValue(member, formData, "specialty", canEditStaff(member)),
    squad: getFieldValue(member, formData, "squad", canEditStaff(member)),
    attendance: Number(getFieldValue(member, formData, "attendance", canEditStaff(member))),
    status: getFieldValue(member, formData, "status", canEditStaff(member)),
    qualifications: splitList(getFieldValue(member, formData, "qualifications", canEditStaff(member))),
    awards: splitList(getFieldValue(member, formData, "awards", canEditStaff(member))),
    lastTraining: getFieldValue(member, formData, "lastTraining", canEditStaff(member)),
    lastPromotion: getFieldValue(member, formData, "lastPromotion", canEditStaff(member)),
  };

  roster = roster.map((item) => (item.id === member.id ? next : item));
  saveRoster();
  renderAll();
  showToast("Personnel file saved.");
}

function addMember(formData) {
  if (!canCreateMembers()) {
    showToast("Only command staff can add members.");
    return;
  }

  const now = new Date().toISOString().slice(0, 10);
  const member = {
    id: createId(),
    rank: formData.get("rank"),
    callsign: formData.get("callsign").trim(),
    discord: formData.get("discord").trim(),
    steam: formData.get("steam").trim(),
    billet: formData.get("billet").trim(),
    specialty: "",
    timezone: "Unknown",
    squad: formData.get("squad"),
    qualifications: [],
    attendance: 100,
    awards: [],
    loa: "None",
    status: formData.get("rank") === "RCT" ? "Recruit" : "Active",
    notes: "",
    lastTraining: now,
    lastPromotion: "",
    joined: now,
  };

  roster = [...roster, member];
  selectedId = member.id;
  saveRoster();
  elements.newMemberForm.reset();
  elements.memberDialog.close();
  renderAll();
  setView("profile");
  showToast("Member added to roster.");
}

function addAttendanceEvent(formData) {
  if (!canManageAttendance()) {
    showToast("Current rank access cannot create attendance events.");
    return;
  }

  const event = {
    id: createId(),
    title: formData.get("title").trim(),
    type: formData.get("type"),
    date: formData.get("date"),
    owner: formData.get("owner").trim(),
    detail: formData.get("detail").trim(),
    attendance: {},
  };

  attendanceEvents = [event, ...attendanceEvents];
  selectedEventId = event.id;
  saveAttendanceEvents();
  elements.eventForm.reset();
  renderAll();
  showToast("Attendance event created.");
}

function updateAttendance(eventId, memberId, status) {
  if (!canManageAttendance()) {
    showToast("Current rank access cannot edit attendance.");
    return;
  }

  attendanceEvents = attendanceEvents.map((event) => {
    if (event.id !== eventId) return event;
    const attendance = { ...(event.attendance || {}) };
    if (status === "No Report") {
      delete attendance[memberId];
    } else {
      attendance[memberId] = status;
    }
    return { ...event, attendance };
  });

  reconcileAttendancePercentages();
  saveAttendanceEvents();
  saveRoster();
  renderAll();
  showToast("Attendance updated.");
}

function markAllPresent() {
  const event = getSelectedEvent();
  if (!event || !canManageAttendance()) {
    showToast("Current rank access cannot edit attendance.");
    return;
  }

  attendanceEvents = attendanceEvents.map((item) => {
    if (item.id !== event.id) return item;
    const attendance = { ...(item.attendance || {}) };
    roster.forEach((member) => {
      attendance[member.id] = "Present";
    });
    return { ...item, attendance };
  });

  reconcileAttendancePercentages();
  saveAttendanceEvents();
  saveRoster();
  renderAll();
  showToast("All members marked present for this event.");
}

function submitLoaRequest(formData) {
  const memberId = formData.get("memberId");
  const member = roster.find((item) => item.id === memberId);
  if (!member || (!canEditStaff() && member.id !== selfServiceId)) {
    showToast("Current rank access cannot submit this LOA request.");
    return;
  }

  const request = {
    id: createId(),
    memberId,
    type: formData.get("type"),
    start: formData.get("start"),
    end: formData.get("end"),
    reason: formData.get("reason").trim(),
    status: canEditStaff() ? "Approved" : "Pending",
    submitted: new Date().toISOString().slice(0, 10),
  };

  loaRequests = [request, ...loaRequests];
  roster = roster.map((item) =>
    item.id === memberId
      ? {
          ...item,
          loa: request.status,
          status: request.status === "Approved" ? "LOA" : item.status,
          loaStart: request.start,
          loaEnd: request.end,
          loaReason: request.reason,
        }
      : item,
  );

  saveLoaRequests();
  saveRoster();
  elements.loaForm.reset();
  renderAll();
  showToast(request.status === "Approved" ? "LOA recorded." : "LOA request submitted.");
}

function updateLoaStatus(requestId, action) {
  if (!canEditStaff()) {
    showToast("Current rank access cannot approve LOA requests.");
    return;
  }

  const nextStatus = action === "approve" ? "Approved" : "Denied";
  const request = loaRequests.find((item) => item.id === requestId);
  if (!request) return;

  loaRequests = loaRequests.map((item) =>
    item.id === requestId ? { ...item, status: nextStatus, reviewed: new Date().toISOString().slice(0, 10) } : item,
  );

  roster = roster.map((member) => {
    if (member.id !== request.memberId) return member;
    return {
      ...member,
      loa: nextStatus === "Approved" ? "Approved" : "None",
      status: nextStatus === "Approved" ? "LOA" : "Active",
      loaStart: nextStatus === "Approved" ? request.start : "",
      loaEnd: nextStatus === "Approved" ? request.end : "",
      loaReason: nextStatus === "Approved" ? request.reason : "",
    };
  });

  saveLoaRequests();
  saveRoster();
  renderAll();
  showToast(`LOA request ${nextStatus.toLowerCase()}.`);
}

function canCreateMembers() {
  return accessLevel === "command";
}

function canDeleteMembers() {
  return accessLevel === "command";
}

function canEditStaff() {
  return accessLevel === "command" || accessLevel === "staff";
}

function canManageAttendance() {
  return accessLevel === "command" || accessLevel === "staff";
}

function canEditMember(member) {
  if (accessLevel === "command" || accessLevel === "staff") return true;
  return member.id === selfServiceId;
}

function getSelectedMember() {
  return roster.find((member) => member.id === selectedId) || roster[0];
}

function getSelectedEvent() {
  return attendanceEvents.find((event) => event.id === selectedEventId) || attendanceEvents[0];
}

function attendanceSummary(event) {
  const statuses = Object.values(event.attendance || {});
  return {
    present: statuses.filter((status) => status === "Present").length,
    excused: statuses.filter((status) => status === "Excused").length,
    absent: statuses.filter((status) => status === "Absent").length,
  };
}

function reconcileAttendancePercentages() {
  roster = roster.map((member) => {
    const statuses = attendanceEvents
      .map((event) => event.attendance?.[member.id])
      .filter((status) => status && status !== "No Report");
    if (!statuses.length) return normalizeMember(member);

    const score = statuses.reduce((total, status) => {
      if (status === "Present") return total + 1;
      if (status === "Excused") return total + 0.85;
      return total;
    }, 0);

    return {
      ...normalizeMember(member),
      attendance: Math.round((score / statuses.length) * 100),
    };
  });
}

function getFieldValue(member, formData, key, canEdit) {
  return canEdit ? formData.get(key) : member[key];
}

function splitList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusPill(status) {
  return `<span class="status-pill ${status.toLowerCase()}">${status}</span>`;
}

function setSelectValue(select, value) {
  if (![...select.options].some((option) => option.value === value)) {
    select.insertAdjacentHTML("beforeend", `<option value="${value}">${value}</option>`);
  }
  select.value = value;
}

function loadRoster() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const members = stored ? JSON.parse(stored) : cloneRoster(seedMembers);
    return members.map(normalizeMember);
  } catch {
    return cloneRoster(seedMembers).map(normalizeMember);
  }
}

function saveRoster() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
}

function loadAttendanceEvents() {
  try {
    const stored = localStorage.getItem(ATTENDANCE_KEY);
    return stored ? JSON.parse(stored) : cloneRoster(seedAttendanceEvents);
  } catch {
    return cloneRoster(seedAttendanceEvents);
  }
}

function saveAttendanceEvents() {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceEvents));
}

function loadLoaRequests() {
  try {
    const stored = localStorage.getItem(LOA_KEY);
    const requests = stored ? JSON.parse(stored) : cloneRoster(seedLoaRequests);
    return requests.filter((request) => roster.some((member) => member.id === request.memberId));
  } catch {
    return cloneRoster(seedLoaRequests).filter((request) => roster.some((member) => member.id === request.memberId));
  }
}

function saveLoaRequests() {
  localStorage.setItem(LOA_KEY, JSON.stringify(loaRequests));
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : { accessLevel: "command" };
  } catch {
    return { accessLevel: "command" };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ accessLevel }));
}

function normalizeMember(member) {
  return {
    id: member.id || createId(),
    rank: member.rank || "RCT",
    callsign: member.callsign || member.name || "Unnamed",
    discord: member.discord || "",
    steam: member.steam || "",
    billet: member.billet || "",
    specialty: member.specialty || "",
    timezone: member.timezone || "Unknown",
    squad: member.squad || "Recruit Pipeline",
    qualifications: splitList(member.qualifications),
    attendance: Number(member.attendance || 0),
    awards: splitList(member.awards),
    loa: member.loa || "None",
    loaStart: member.loaStart || "",
    loaEnd: member.loaEnd || "",
    loaReason: member.loaReason || "",
    status: member.status || "Recruit",
    notes: member.notes || "",
    lastTraining: member.lastTraining || "",
    lastPromotion: member.lastPromotion || "",
    joined: member.joined || new Date().toISOString().slice(0, 10),
  };
}

function normalizeImportedMember(row) {
  const now = new Date().toISOString().slice(0, 10);
  return normalizeMember({
    id: createId(),
    rank: row.rank || "RCT",
    callsign: row.callsign || row.name || "Unnamed",
    discord: row.discord || "",
    steam: row.steam || "",
    billet: row.billet || "",
    specialty: row.specialty || row.mos || "",
    timezone: row.timezone || "",
    squad: row.squad || "Recruit Pipeline",
    qualifications: splitList(row.qualifications),
    attendance: Number(row.attendance || 0),
    awards: splitList(row.awards),
    loa: row.loa || "None",
    status: row.status || "Recruit",
    notes: row.notes || "",
    lastTraining: row.lastTraining || row.last_training || now,
    lastPromotion: row.lastPromotion || row.last_promotion || "",
    joined: row.joined || now,
  });
}

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function toCsv(rows) {
  const headers = [
    "rank",
    "callsign",
    "discord",
    "steam",
    "billet",
    "specialty",
    "squad",
    "timezone",
    "qualifications",
    "attendance",
    "awards",
    "loa",
    "status",
    "notes",
    "lastTraining",
    "lastPromotion",
    "joined",
  ];

  const csvRows = rows.map((row) =>
    headers
      .map((header) => {
        const value = Array.isArray(row[header]) ? row[header].join("; ") : row[header] ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2600);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(date) {
  if (!date) return "Unknown";
  const [year, month, day] = date.split("-").map(Number);
  const localDate = year && month && day ? new Date(year, month - 1, day) : new Date(date);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(localDate);
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `tf20-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneRoster(members) {
  return JSON.parse(JSON.stringify(members));
}
