/**
 * AML Core Management Suite 2026
 * public/assets/app.js
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STATE
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'aml_enterprise_db_2026';
const API         = 'api/programs';

let programs          = [];
let lagNames          = [];
let onProgressNames   = [];
let doneNames         = [];
let notStartNames     = [];

const monthsLong = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

const PILLAR_ORDER = [
    'Pilar 1: Pengawasan Aktif',
    'Pilar 2: Kebijakan & Prosedur',
    'Pilar 3: Pengendalian Intern',
    'Pilar 4: SIM & Pelaporan',
    'Pilar 5: Sumber Daya Manusia',
    'Reporting'
];
const pillars = [...PILLAR_ORDER];

let charts            = {};
let currentModalId    = null;
let tempCompletedState = [];
let subProgramCounter = 0;
let savedInputFilterState = null;   // persists Programs filter across actions
let pendingChangeConfirm  = null;   // callback waiting for change-reason modal

// ─────────────────────────────────────────────────────────────────────────────
// ID UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a unique numeric ID safe for JS MAX_SAFE_INTEGER & MySQL bigint(20).
 *  Uses Date.now() (13 digits) + random 0–9999 → still 13-digit range.
 *  Loops if it accidentally collides with an existing program ID in memory. */
function generateId() {
    let id;
    do {
        // Date.now() + random 4-digit suffix stays well within MAX_SAFE_INTEGER
        id = Date.now() + Math.floor(Math.random() * 10000);
    } while (programs.some(p => sameId(p.id, id)));
    return id;
}

/** Normalise any ID value to a trimmed string for safe comparison */
function sid(v) { return String(v ?? '').trim(); }

/** True only when both sides refer to the same program ID */
function sameId(a, b) { return sid(a) === sid(b) && sid(a) !== ''; }

// Lebar kolom Program — 240px: cukup lebar untuk teks penuh, tidak memakan ruang timeline
const COL_W = '300px';


// ─────────────────────────────────────────────────────────────────────────────
// DATA LAYER
// ─────────────────────────────────────────────────────────────────────────────

async function loadFromDatabase() {
    // Tampilkan loading indicator
    var kpiEl = document.getElementById('kpi-total');
    if (kpiEl) kpiEl.innerText = '...';

    try {
        // Timeout 10 detik — penting untuk InfinityFree yang lambat
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = controller ? setTimeout(function() { controller.abort(); }, 10000) : null;

        var fetchOpts = controller ? { signal: controller.signal } : {};
        var res  = await fetch(API, fetchOpts);
        if (timer) clearTimeout(timer);

        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var data = await res.json();
        programs.length = 0;
        // Deduplicate by ID on frontend as safety net (PHP already deduplicates,
        // but this guards against any edge cases from cached/stale responses)
        var seenFront = {};
        data.forEach(function(p) {
            var key = sid(p.id);
            if (!seenFront[key]) { seenFront[key] = true; programs.push(p); }
        });
    } catch (e) {
        // Fallback: localStorage atau seed data
        var stored = localStorage.getItem(STORAGE_KEY);
        programs.length = 0;
        (stored ? JSON.parse(stored) : getSeedData()).forEach(function(p) { programs.push(p); });

        // Tampilkan notif jika bukan abort biasa
        if (e && e.name !== 'AbortError') {
            showToast('Koneksi lambat — menampilkan data terakhir yang tersimpan.');
        }
    }
    renderAll();
}

// Simpan SATU program ke server (upsert). Tidak ada TRUNCATE.
async function saveOneProgram(p) {
    try {
        var ctrl2 = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var t2 = ctrl2 ? setTimeout(function() { ctrl2.abort(); }, 8000) : null;
        var saveOpts = {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(p)
        };
        if (ctrl2) saveOpts.signal = ctrl2.signal;
        await fetch(API, saveOpts);
        if (t2) clearTimeout(t2);
    } catch (e) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
    }
    const now      = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const syncText = 'Last Sync: Today, ' + now;
    localStorage.setItem('lastSyncTime', syncText);
    updateWeekIndicator();
}

// Alias — tidak dipakai lagi untuk bulk save
function saveToDatabase() {}

function saveToLocalStorage() { saveToDatabase(); }
function loadFromLocalStorage() { loadFromDatabase(); }

function getSeedData() {
    return [{
        id: 1,
        pillar: 'Pilar 1: Pengawasan Aktif',
        program: 'Penetapan struktur AML Officer yang terstandardisasi',
        deliverables: 'Tersedia SK Organisasi & Job Desk AML Officer',
        pic: 'ATL',
        comment: 'Draft awal sedang dalam proses review direksi.',
        subPrograms: [{
            name: 'Finalisasi Draft SK Struktur Management',
            timeline: [1,1,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
                       0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
            completed: [0, 1]
        }]
    }];
}


// ─────────────────────────────────────────────────────────────────────────────
// CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

function calculateProgress(p, limitWeek = 48) {
    let totalP = 0, totalD = 0;
    if (!p.subPrograms) return 0;
    p.subPrograms.forEach(sub => {
        sub.timeline.forEach((v, i) => {
            if (i < limitWeek && v === 1) {
                totalP++;
                if (sub.completed && sub.completed.includes(i)) totalD++;
            }
        });
    });
    return totalP === 0 ? 0 : Math.round((totalD / totalP) * 100);
}

function getUnifiedTimeline(p) {
    const combined = Array(48).fill(0);
    if (!p.subPrograms) return combined;
    p.subPrograms.forEach(sub =>
        sub.timeline.forEach((v, i) => { if (i < 48 && v === 1) combined[i] = 1; })
    );
    return combined;
}

function getLastFridayOfMonthJS(year, monthIndex) {
    let lastDay = new Date(year, monthIndex + 1, 0);
    let dayOfWeek = lastDay.getDay();
    let diffToFriday = (dayOfWeek - 5 + 7) % 7;
    let lastFriday = new Date(year, monthIndex, lastDay.getDate() - diffToFriday);
    lastFriday.setHours(0, 0, 0, 0);
    return lastFriday;
}

function getTimelineWeekInfo() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastFridayCurrent = getLastFridayOfMonthJS(y, m);
    let assignedMonthIndex, assignedYear, week1Start;
    if (now >= lastFridayCurrent) {
        assignedMonthIndex = (m + 1) % 12;
        assignedYear = (m === 11) ? y + 1 : y;
        week1Start = new Date(lastFridayCurrent.getTime());
    } else {
        assignedMonthIndex = m;
        assignedYear = y;
        let prevM = (m - 1 + 12) % 12;
        let prevY = (m === 0) ? y - 1 : y;
        week1Start = getLastFridayOfMonthJS(prevY, prevM);
    }
    let diffMillis = now.getTime() - week1Start.getTime();
    let diffDays = Math.round(diffMillis / (1000 * 60 * 60 * 24));
    let weekNumber = Math.floor(diffDays / 7) + 1;
    let globalWeekIndex = (assignedMonthIndex * 4) + Math.min(weekNumber - 1, 3);
    return { week: weekNumber, month: monthsLong[assignedMonthIndex], year: assignedYear, globalWeekIndex };
}

function updateWeekIndicator() {
    const { week, month, year } = getTimelineWeekInfo();
    const text = `Timeline Week ${week} | ${month} ${year}`;
    const tag = document.getElementById('last-update-tag');
    if (tag) tag.innerText = text;
    const mobileTag = document.getElementById('last-update-tag-mobile');
    if (mobileTag) mobileTag.innerText = text;
}


// ─────────────────────────────────────────────────────────────────────────────
// VIEW SWITCHING
// ─────────────────────────────────────────────────────────────────────────────

function updateBottomNav(v) {
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-nav') === v);
    });
}

function switchView(v) {
    // Reset filter state when user navigates to a non-input/add-program menu
    if (v !== 'input' && v !== 'add-program') {
        savedInputFilterState = null;
    }
    ['dashboard', 'timeline', 'input', 'add-program'].forEach(id => {
        const view = document.getElementById(`${id}-view`);
        if (view) view.classList.toggle('hidden', id !== v);
        const btn = document.querySelector(`button[data-target="${id}"]`);
        if (btn) {
            btn.classList.toggle('text-mentari-blue',    id === v);
            btn.classList.toggle('bg-cakrawala-blue/10', id === v);
            btn.classList.toggle('text-slate-400',       id !== v);
        }
    });
    updateBottomNav(v);
    const titles = {
        'dashboard':   'Executive Dashboard',
        'timeline':    'AML, CFT & CPF Timeline',
        'input':       'Programs',
        'add-program': 'Program Entry'
    };
    const titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.innerText = titles[v] || 'Dashboard';
    if (v === 'add-program' && !document.getElementById('edit-id').value) {
        document.getElementById('form-title').innerText  = 'Program Entry';
        document.getElementById('submit-btn').innerText  = 'Add New Program';
        document.getElementById('edit-badge').classList.add('hidden');
    }

    // Lazy render: hanya render view yang relevan saat dibuka
    if (v === 'dashboard') {
        requestAnimationFrame(() => { renderCharts(); });
    }
    if (v === 'timeline') {
        requestAnimationFrame(() => { populateFilters(); applyFilters(); });
    }
    if (v === 'input') {
        requestAnimationFrame(() => {
            populateFilters();
            restoreFilterState();
            renderUpdateList();
        });
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// FILTER STATE PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

function saveFilterState() {
    const pic    = document.getElementById('update-filter-pic');
    const pillar = document.getElementById('update-filter-pillar');
    const tag    = document.getElementById('update-filter-tag');
    const search = document.getElementById('search-input');
    savedInputFilterState = {
        pic:    pic    ? pic.value    : 'all',
        pillar: pillar ? pillar.value : 'all',
        tag:    tag    ? tag.value    : 'all',
        search: search ? search.value : ''
    };
}

function restoreFilterState() {
    if (!savedInputFilterState) return;
    const pic    = document.getElementById('update-filter-pic');
    const pillar = document.getElementById('update-filter-pillar');
    const tag    = document.getElementById('update-filter-tag');
    const search = document.getElementById('search-input');
    if (pic)    pic.value    = savedInputFilterState.pic;
    if (pillar) pillar.value = savedInputFilterState.pillar;
    if (tag)    tag.value    = savedInputFilterState.tag;
    if (search) search.value = savedInputFilterState.search;
}

function isInInputView() {
    const v = document.getElementById('input-view');
    return v && !v.classList.contains('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatTs(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch(e) { return ts; }
}

function buildHistoryEntry(type, changes) {
    const user = (typeof CURRENT_USER !== 'undefined') ? (CURRENT_USER.full_name || CURRENT_USER.username || 'User') : 'User';
    return { ts: new Date().toISOString(), user, type, changes };
}



function renderAlerts() {
    const currentWeekGlobal  = getTimelineWeekInfo().globalWeekIndex;

    lagNames = []; onProgressNames = []; doneNames = []; notStartNames = [];

    programs.forEach(p => {
        let hasTimeline = false, allCompleted = true, hasStarted = false, isLag = false;
        p.subPrograms.forEach(sub => {
            const scheduled = sub.timeline.map((v, i) => v === 1 ? i : null).filter(v => v !== null);
            if (scheduled.length > 0) {
                hasTimeline = true;
                scheduled.forEach(w => {
                    const isDone = sub.completed && sub.completed.includes(w);
                    if (w <= currentWeekGlobal) hasStarted = true;
                    if (w <= currentWeekGlobal && !isDone) isLag = true;
                    if (!isDone) allCompleted = false;
                });
            }
        });
        if (!hasTimeline || !hasStarted) notStartNames.push(p);
        else if (isLag)                  lagNames.push(p);
        else if (allCompleted)           doneNames.push(p);
        else                             onProgressNames.push(p);
    });

    const renderList = (elId, names, colorClass, icon) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.innerHTML = names.length
            ? names.map(p => `
                <li class="flex items-start gap-2 py-1.5">
                    <i class="fas ${icon} mt-1 text-[10px] ${colorClass}"></i>
                    <div class="flex flex-col">
                        <span class="leading-tight font-medium">${p.program}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${p.pic}</span>
                    </div>
                </li>`).join('')
            : '<li class="text-slate-400 italic text-xs">Tidak ada program</li>';
    };
    renderList('ul-overdue',  lagNames,        'text-red-500',   'fa-circle-exclamation');
    renderList('ul-ongoing',  onProgressNames, 'text-blue-500',  'fa-spinner fa-spin');
    renderList('ul-done',     doneNames,       'text-green-500', 'fa-check-circle');
    renderList('ul-notstart', notStartNames,   'text-slate-400', 'fa-clock');

    renderTagBreakdown();
}

function renderTagBreakdown() {
    // Pisahkan program berdasarkan tag
    const hyg = programs.filter(p => (p.tag || 'Hygiene') === 'Hygiene');
    const bau = programs.filter(p => (p.tag || 'Hygiene') === 'Business As Usual');

    // Update counter header (panel breakdown)
    const hygTotal = document.getElementById('tag-hygiene-total');
    const bauTotal = document.getElementById('tag-bau-total');
    if (hygTotal) hygTotal.textContent = hyg.length + ' Program';
    if (bauTotal) bauTotal.textContent = bau.length + ' Program';

    // Update counter angka di doughnut chart card — langsung tanpa requestAnimationFrame
    // agar tidak skip di Firefox/Chrome Windows saat tab belum fokus
    const hygCount = document.getElementById('tag-hygiene-count');
    const bauCount = document.getElementById('tag-bau-count');
    if (hygCount) hygCount.textContent = hyg.length;
    if (bauCount) bauCount.textContent = bau.length;

    // Helper: tentukan status satu program (sama logika renderAlerts)
    const currentWeekGlobal = getTimelineWeekInfo().globalWeekIndex;

    function getStatus(p) {
        let hasTimeline = false, allCompleted = true, hasStarted = false, isLag = false;
        p.subPrograms.forEach(sub => {
            const scheduled = sub.timeline.map((v, i) => v === 1 ? i : null).filter(v => v !== null);
            if (scheduled.length > 0) {
                hasTimeline = true;
                scheduled.forEach(w => {
                    const isDone = sub.completed && sub.completed.includes(w);
                    if (w <= currentWeekGlobal) hasStarted = true;
                    if (w <= currentWeekGlobal && !isDone) isLag = true;
                    if (!isDone) allCompleted = false;
                });
            }
        });
        if (!hasTimeline || !hasStarted) return 'notstart';
        if (isLag)        return 'lag';
        if (allCompleted) return 'done';
        return 'ongoing';
    }

    // Helper: render list — sorted A-Z, tampilkan PIC/team
    function fillList(elId, items) {
        const el = document.getElementById(elId);
        if (!el) return;
        const sorted = [...items].sort((a, b) => a.program.localeCompare(b.program));
        el.innerHTML = sorted.length
            ? sorted.map(p => `<li class="flex items-start justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                <div class="flex items-start gap-1.5 min-w-0">
                    <span class="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-slate-300"></span>
                    <span class="leading-snug text-slate-700">${p.program}</span>
                </div>
                <span class="flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider mt-0.5">${p.pic}</span>
              </li>`).join('')
            : '<li class="text-slate-300 italic text-xs">—</li>';
    }

    // Kelompokkan per status untuk masing-masing tag
    ['hyg', 'bau'].forEach(prefix => {
        const list = prefix === 'hyg' ? hyg : bau;
        const done     = list.filter(p => getStatus(p) === 'done');
        const ongoing  = list.filter(p => getStatus(p) === 'ongoing');
        const lag      = list.filter(p => getStatus(p) === 'lag');
        const notstart = list.filter(p => getStatus(p) === 'notstart');
        fillList(`${prefix}-done`,     done);
        fillList(`${prefix}-ongoing`,  ongoing);
        fillList(`${prefix}-lag`,      lag);
        fillList(`${prefix}-notstart`, notstart);
    });
}

function renderKPIs() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('kpi-total',          programs.length);
    set('kpi-done-count',     doneNames.length);
    set('kpi-ongoing-count',  onProgressNames.length);
    set('kpi-lag-count',      lagNames.length);
    set('kpi-notstart-count', notStartNames.length);
}

function toggleProgramLists() {
    const panel = document.getElementById('program-lists-panel');
    const icon  = document.getElementById('dropdown-icon');
    if (!panel) return;
    const hidden = panel.classList.toggle('hidden');
    if (icon) icon.style.transform = hidden ? 'rotate(0deg)' : 'rotate(180deg)';
}


// ─────────────────────────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────────────────────────

function renderCharts() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Plus Jakarta Sans'";
    Chart.defaults.color       = '#94a3b8';

    // Pillar Performance: Current Week Compliance Rate
    const now1           = new Date();
    const currentWeekPil = now1.getMonth() * 4 + Math.min(Math.floor((now1.getDate() - 1) / 7), 3);

    function calcPillarCompliance(pillar) {
        let shouldBeDone = 0, actualDone = 0;
        programs.filter(p => p.pillar === pillar).forEach(p => {
            p.subPrograms.forEach(sub => {
                sub.timeline.forEach((v, weekIdx) => {
                    if (v === 1 && weekIdx <= currentWeekPil) {
                        shouldBeDone++;
                        if (sub.completed && sub.completed.includes(weekIdx)) actualDone++;
                    }
                });
            });
        });
        return shouldBeDone === 0 ? null : Math.round((actualDone / shouldBeDone) * 100);
    }

    const pillarRates  = pillars.map(pil => calcPillarCompliance(pil));
    const pillarColors = pillarRates.map(r =>
        r === null ? '#cbd5e1' : r >= 80 ? '#10b981' : r >= 50 ? '#f59e0b' : '#ef4444'
    );
    const pillarLabels = pillars.map(p => {
        const match = p.match(/^(Pilar \d+|Reporting)/);
        return match ? match[0] : p.substring(0, 16);
    });

    if (charts.pillar) charts.pillar.destroy();
    charts.pillar = new Chart(document.getElementById('pillarChart'), {
        type: 'bar',
        data: {
            labels: pillarLabels,
            datasets: [{
                label: 'Compliance Rate',
                data:  pillarRates.map(r => r === null ? 0 : r),
                backgroundColor: pillarColors,
                borderRadius: 10
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: ctx => pillars[ctx[0].dataIndex],
                        label: ctx => {
                            const r = pillarRates[ctx.dataIndex];
                            return r === null ? ' Belum ada aktivitas berjalan' : ' Compliance: ' + r + '%';
                        },
                        afterLabel: ctx => {
                            const pil = pillars[ctx.dataIndex];
                            let should = 0, done = 0;
                            const progCount = programs.filter(p => p.pillar === pil).length;
                            programs.filter(p => p.pillar === pil).forEach(p => {
                                p.subPrograms.forEach(sub => {
                                    sub.timeline.forEach((v, wi) => {
                                        if (v === 1 && wi <= currentWeekPil) {
                                            should++;
                                            if (sub.completed && sub.completed.includes(wi)) done++;
                                        }
                                    });
                                });
                            });
                            return [' ' + done + ' / ' + should + ' week tasks selesai', ' ' + progCount + ' program'];
                        }
                    }
                }
            },
            scales: {
                x: {
                    max: 100,
                    beginAtZero: true,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });
    // ── Team Accountability: Current Week Compliance Rate ────────────────────
    // Hitung: done s.d. minggu ini / seharusnya done s.d. minggu ini x 100
    // Minggu yang belum tiba & aktivitas tidak ada di periode ini = dikecualikan
    const now2           = new Date();
    const currentWeekNow = now2.getMonth() * 4 + Math.min(Math.floor((now2.getDate() - 1) / 7), 3);

    function calcComplianceRate(pic) {
        let shouldBeDone = 0, actualDone = 0;
        programs
            .filter(p => p.pic === pic)
            .forEach(p => {
                p.subPrograms.forEach(sub => {
                    sub.timeline.forEach((v, weekIdx) => {
                        if (v === 1 && weekIdx <= currentWeekNow) {
                            shouldBeDone++;
                            if (sub.completed && sub.completed.includes(weekIdx)) actualDone++;
                        }
                    });
                });
            });
        return shouldBeDone === 0 ? null : Math.round((actualDone / shouldBeDone) * 100);
    }

    const pics      = [...new Set(programs.map(p => p.pic))].sort();
    const picRates  = pics.map(pic => calcComplianceRate(pic));
    const picColors = picRates.map(r =>
        r === null ? '#cbd5e1' : '#71C5E8'
    );

    if (charts.picProgress) charts.picProgress.destroy();
    charts.picProgress = new Chart(document.getElementById('picProgressChart'), {
        type: 'bar',
        data: {
            labels: pics,
            datasets: [{
                label: 'Compliance Rate',
                data:  picRates.map(r => r === null ? 0 : r),
                backgroundColor: picColors,
                borderRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const r = picRates[ctx.dataIndex];
                            return r === null ? ' Belum ada aktivitas berjalan' : ` Compliance: ${r}%`;
                        },
                        afterLabel: ctx => {
                            const pic = pics[ctx.dataIndex];
                            let should = 0, done = 0;
                            programs.filter(p => p.pic === pic).forEach(p => {
                                p.subPrograms.forEach(sub => {
                                    sub.timeline.forEach((v, wi) => {
                                        if (v === 1 && wi <= currentWeekNow) {
                                            should++;
                                            if (sub.completed && sub.completed.includes(wi)) done++;
                                        }
                                    });
                                });
                            });
                            return ` ${done} / ${should} week tasks selesai`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    max: 100,
                    beginAtZero: true,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });

    const sData = [doneNames.length, onProgressNames.length, lagNames.length, notStartNames.length];

    // Update counter badges
    const statusDoneEl       = document.getElementById('status-done-count');
    const statusOnProgressEl = document.getElementById('status-onprogress-count');
    const statusLagEl        = document.getElementById('status-lag-count');
    const statusNotStartedEl = document.getElementById('status-notstarted-count');
    if (statusDoneEl)       statusDoneEl.textContent       = doneNames.length;
    if (statusOnProgressEl) statusOnProgressEl.textContent = onProgressNames.length;
    if (statusLagEl)        statusLagEl.textContent        = lagNames.length;
    if (statusNotStartedEl) statusNotStartedEl.textContent = notStartNames.length;

    if (charts.status) charts.status.destroy();
    charts.status = new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: ['Done', 'On Progress', 'Lag', 'Not Started'],
            datasets: [{
                data: sData,
                backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#94a3b8'],
                hoverBackgroundColor: ['#059669', '#2563eb', '#dc2626', '#64748b'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = sData.reduce((a, b) => a + b, 0);
                            const pct   = total === 0 ? 0 : Math.round((ctx.parsed / total) * 100);
                            return `  ${ctx.label}: ${ctx.parsed} program (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // ── Tag Distribution: Hygiene vs Business As Usual ────────────────────────
    const hygieneCount = programs.filter(p => (p.tag || 'Hygiene') === 'Hygiene').length;
    const bauCount     = programs.filter(p => (p.tag || 'Hygiene') === 'Business As Usual').length;

    // Update counter badges
    const hygieneEl = document.getElementById('tag-hygiene-count');
    const bauEl     = document.getElementById('tag-bau-count');
    if (hygieneEl) hygieneEl.textContent = hygieneCount;
    if (bauEl)     bauEl.textContent     = bauCount;

    const tagCanvas = document.getElementById('tagChart');
    if (tagCanvas) {
        if (charts.tag) charts.tag.destroy();
        charts.tag = new Chart(tagCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Hygiene', 'Business As Usual'],
                datasets: [{
                    data: [hygieneCount, bauCount],
                    backgroundColor: ['#8b5cf6', '#3b82f6'],
                    hoverBackgroundColor: ['#7c3aed', '#2563eb'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = hygieneCount + bauCount;
                                const pct   = total === 0 ? 0 : Math.round((ctx.parsed / total) * 100);
                                return `  ${ctx.label}: ${ctx.parsed} program (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM FORM
// ─────────────────────────────────────────────────────────────────────────────

function addSubProgramField(data = null) {
    const container = document.getElementById('sub-programs-container');
    const uniqueId  = subProgramCounter++;
    const name      = data ? data.name : '';
    const narasi    = data ? (data.createNarasi || '') : '';
    const timeline  = data ? data.timeline : Array(48).fill(0);
    const div       = document.createElement('div');
    div.className   = 'bg-white p-6 rounded-[2rem] card-shadow border-2 border-slate-100 space-y-5 fade-in sub-program-form-item';
    div.innerHTML = `
        <div class="flex items-center gap-4">
            <span class="w-11 h-11 flex items-center justify-center bg-slate-900 text-white rounded-[1.2rem] font-black text-base shadow-xl shadow-slate-900/20">#</span>
            <div class="flex-1">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sub-Program Description</label>
                <input type="text" class="sub-name-input w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-cakrawala-blue outline-none transition-all" placeholder="Enter target sub-task..." value="${name}" required>
            </div>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="w-11 h-11 mt-5 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0">
                <i class="fas fa-trash-alt text-lg"></i>
            </button>
        </div>
        <div class="space-y-1.5">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Alasan / Catatan Sub-Program Dibuat <span class="text-slate-300 normal-case font-medium">(opsional)</span></label>
            <textarea class="sub-narasi-input w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-medium focus:border-cakrawala-blue outline-none transition-all resize-none h-14 placeholder-slate-300" placeholder="Jelaskan alasan atau konteks pembuatan sub-program ini...">${escapeHtmlAttr(narasi)}</textarea>
        </div>
        <div class="space-y-3">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Schedule Mapping (Weekly Selection)</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                ${monthsLong.map((m, mIdx) => `
                    <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 group hover:border-mentari-blue/40 transition-colors">
                        <div class="text-[9px] font-black text-center text-slate-400 mb-2 border-b border-slate-200 pb-1.5 uppercase tracking-[0.2em] group-hover:text-cakrawala-blue">${m.substring(0, 3)}</div>
                        <div class="flex justify-center gap-1.5">
                            ${[1,2,3,4].map(w => {
                                const idx  = mIdx * 4 + (w - 1);
                                const elId = `chk-${uniqueId}-${idx}`;
                                const chk  = timeline[idx] === 1 ? 'checked' : '';
                                return `<div class="relative"><input type="checkbox" id="${elId}" data-week="${idx}" class="week-checkbox hidden peer" ${chk}><label for="${elId}" class="w-8 h-8 text-xs font-black flex items-center justify-center border-2 rounded-lg border-white bg-white cursor-pointer shadow-sm transition-all hover:border-cakrawala-blue hover:text-nusantara-blue peer-checked:bg-nusantara-blue peer-checked:text-white peer-checked:border-nusantara-blue peer-checked:shadow-lg peer-checked:shadow-cakrawala-blue/30">${w}</label></div>`;
                            }).join('')}
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
    container.appendChild(div);
}

function initAddProgram() {
    document.getElementById('edit-id').value = '';
    document.getElementById('add-program-form').reset();
    document.getElementById('form-title').innerText  = 'Program Entry 2026';
    document.getElementById('submit-btn').innerText  = 'Add New Program';
    document.getElementById('edit-badge').classList.add('hidden');
    document.getElementById('sub-programs-container').innerHTML = '';
    addSubProgramField();
    switchView('add-program');
}

function openEditProgramView(id) {
    if (isInInputView()) saveFilterState();
    const p = programs.find(item => sameId(item.id, id));
    if (!p) return;
    document.getElementById('edit-id').value          = p.id;
    document.getElementById('new-pillar').value        = p.pillar;
    document.getElementById('new-pic').value           = p.pic;
    document.getElementById('new-name').value          = p.program;
    document.getElementById('new-deliverables').value  = p.deliverables;
    // Restore tag radio
    const tagVal = p.tag || 'Hygiene';
    const tagRadio = document.querySelector(`input[name="program-tag"][value="${tagVal}"]`);
    if (tagRadio) tagRadio.checked = true;
    document.getElementById('form-title').innerText    = 'Edit Program Structure';
    document.getElementById('submit-btn').innerText    = 'Update Program Entry';
    document.getElementById('edit-badge').classList.remove('hidden');
    document.getElementById('sub-programs-container').innerHTML = '';
    p.subPrograms.forEach(sub => addSubProgramField(sub));
    switchView('add-program');
}

function handleNewProgram(e) {
    e.preventDefault();
    if (typeof CURRENT_USER!=='undefined' && CURRENT_USER.role==='staff_user' && !CURRENT_USER.can_add) { showToast('Akses ditolak.'); return; }
    const editId      = document.getElementById('edit-id').value;
    const subElements = document.querySelectorAll('.sub-program-form-item');
    const subPrograms = [];
    subElements.forEach(el => {
        const nameInput   = el.querySelector('.sub-name-input');
        const narasiInput = el.querySelector('.sub-narasi-input');
        const name        = nameInput   ? nameInput.value   : '';
        const narasi      = narasiInput ? narasiInput.value : '';
        const timeline    = Array(48).fill(0);
        el.querySelectorAll('.week-checkbox:checked').forEach(c => { timeline[parseInt(c.getAttribute('data-week'))] = 1; });
        if (timeline.includes(1) && name.trim() !== '') {
            let completed = [];
            if (editId) {
                const ep = programs.find(p => sameId(p.id, editId));
                const es = ep && ep.subPrograms ? ep.subPrograms.find(function(s){ return s.name === name; }) : null;
                if (es) completed = [...es.completed];
            }
            subPrograms.push({ name, timeline, completed, createNarasi: narasi });
        }
    });
    if (subPrograms.length === 0) { alert('Silakan Lengkapi Timeline Program Kerja'); return; }
    const tagEl   = document.querySelector('input[name="program-tag"]:checked');
    const programData = {
        pillar:       document.getElementById('new-pillar').value,
        pic:          document.getElementById('new-pic').value,
        program:      document.getElementById('new-name').value,
        deliverables: document.getElementById('new-deliverables').value,
        tag:          tagEl ? tagEl.value : 'Hygiene',
        subPrograms
    };

    if (editId) {
        // ── EDIT MODE: detect changes, then show reason modal ────────────────
        const oldP = programs.find(p => sameId(p.id, editId));
        const changes = [];

        // Check main fields
        const fieldLabels = { pillar: 'Pillar', pic: 'Lead PIC', program: 'Program Title', deliverables: 'Deliverables', tag: 'Tipe Program' };
        Object.keys(fieldLabels).forEach(key => {
            if ((oldP[key] || '') !== (programData[key] || '')) {
                changes.push({ subName: fieldLabels[key], detail: `"${oldP[key]||'-'}" → "${programData[key]||'-'}"`, reason: '' });
            }
        });

        // Check sub-program changes
        const oldSubs = oldP.subPrograms || [];
        subPrograms.forEach(ns => {
            const os = oldSubs.find(s => s.name === ns.name);
            if (!os) {
                changes.push({ subName: 'Sub-Program Baru', detail: `"${ns.name}" ditambahkan`, reason: ns.createNarasi || '' });
            } else {
                const tlChanged = JSON.stringify(os.timeline) !== JSON.stringify(ns.timeline);
                if (tlChanged) changes.push({ subName: ns.name, detail: 'Timeline diubah', reason: '' });
            }
        });
        oldSubs.forEach(os => {
            if (!subPrograms.find(ns => ns.name === os.name)) {
                changes.push({ subName: os.name, detail: 'Sub-program dihapus', reason: '' });
            }
        });

        if (changes.length > 0) {
            // Show change reason modal; save will happen on confirm
            showChangeReasonModal(changes, (resolvedChanges) => {
                _doSaveEdit(editId, oldP, programData, resolvedChanges);
            });
        } else {
            _doSaveEdit(editId, oldP, programData, []);
        }

    } else {
        // ── ADD MODE: create program with initial history ────────────────────
        const initChanges = subPrograms
            .filter(s => s.createNarasi && s.createNarasi.trim())
            .map(s => ({ subName: s.name, detail: 'Sub-program dibuat', reason: s.createNarasi }));
        const history = (initChanges.length > 0) ? [buildHistoryEntry('create', initChanges)] : [];
        const savedProgram = { id: generateId(), ...programData, comment: '', history };
        programs.push(savedProgram);
        saveOneProgram(savedProgram); renderAll();
        showToast('Framework entry integrated.');
        document.getElementById('add-program-form').reset();
        document.getElementById('edit-id').value = '';
        switchView('dashboard');
    }
}

function _doSaveEdit(editId, oldP, programData, resolvedChanges) {
    const idx = programs.findIndex(p => sameId(p.id, editId));
    const history = [...(programs[idx].history || [])];
    if (resolvedChanges.length > 0) {
        history.push(buildHistoryEntry('edit', resolvedChanges));
    }
    programs[idx] = { ...programs[idx], ...programData, history };
    saveOneProgram(programs[idx]); renderAll();
    showToast('Framework updated.');
    document.getElementById('add-program-form').reset();
    document.getElementById('edit-id').value = '';
    restoreFilterState();
    switchView('input');
}

async function deleteProgram(id) {
    if (typeof CURRENT_USER!=='undefined' && CURRENT_USER.role==='staff_user' && !CURRENT_USER.can_delete) { showToast('Akses ditolak.'); return; }
    const item = document.querySelector(`li[data-id="${id}"]`);
    if (item) item.classList.add('removing');
    try { await fetch(`${API}?id=${id}`, { method: 'DELETE' }); } catch (e) { /* fallback */ }
    programs = programs.filter(p => !sameId(p.id, id));
    renderAll();
    showToast('Program deleted successfully.');
}

let _deleteTargetId = null;

function openDeleteConfirm(id) {
    if (typeof CURRENT_USER!=='undefined' && CURRENT_USER.role==='staff_user' && !CURRENT_USER.can_delete) { showToast('Akses ditolak.'); return; }
    if (isInInputView()) saveFilterState();
    _deleteTargetId = id;
    const p = programs.find(x => sameId(x.id, id));
    const nameEl = document.getElementById('delete-confirm-name');
    if (nameEl && p) nameEl.textContent = p.program;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function cancelDeleteModal() {
    _deleteTargetId = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function confirmDeleteProgram() {
    if (!_deleteTargetId) return;
    const id = _deleteTargetId;
    cancelDeleteModal();
    await deleteProgram(id);
}

function cancelAddProgram() {
    const editId = document.getElementById('edit-id').value;
    document.getElementById('add-program-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('sub-programs-container').innerHTML = '';
    if (editId) {
        // Was in edit mode → restore filter and go to Programs
        switchView('input');
    } else {
        switchView('dashboard');
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW  — fixed 192px column + accordion narasi
// ─────────────────────────────────────────────────────────────────────────────

// Inline style string yang dipakai di setiap cell kolom program
const PROG_COL_STYLE = `style="width:${COL_W};min-width:${COL_W};max-width:${COL_W};overflow:hidden;"`;

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HELPERS — dipakai Timeline & Programs
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META = {
    done:     { dot: 'bg-emerald-500',           badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Completed'   },
    ongoing:  { dot: 'bg-blue-500',              badge: 'bg-blue-50 text-blue-700 border border-blue-200',          label: 'On Progress' },
    lag:      { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-50 text-red-700 border border-red-200',             label: 'Lag'         },
    notstart: { dot: 'bg-slate-300',             badge: 'bg-slate-100 text-slate-500 border border-slate-200',      label: 'Not Started' },
};

function getProgramStatus(p) {
    const currentWeekGlobal = getTimelineWeekInfo().globalWeekIndex;
    let hasTimeline = false, allCompleted = true, hasStarted = false, isLag = false;
    p.subPrograms.forEach(function(sub) {
        var scheduled = sub.timeline.map(function(v, i) { return v === 1 ? i : null; }).filter(function(v) { return v !== null; });
        if (scheduled.length > 0) {
            hasTimeline = true;
            scheduled.forEach(function(w) {
                var isDone = sub.completed && sub.completed.includes(w);
                if (w <= currentWeekGlobal) hasStarted = true;
                if (w <= currentWeekGlobal && !isDone) isLag = true;
                if (!isDone) allCompleted = false;
            });
        }
    });
    if (!hasTimeline || !hasStarted) return 'notstart';
    if (isLag)        return 'lag';
    if (allCompleted) return 'done';
    return 'ongoing';
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE MOBILE CARD VIEW  (< 768px)
// ─────────────────────────────────────────────────────────────────────────────

function renderTimelineMobile(data = programs) {
    // Hide the table elements, show the card container
    const tableWrap = document.getElementById('timeline-table-wrap');
    const cardWrap  = document.getElementById('timeline-card-wrap');
    if (tableWrap) tableWrap.classList.add('hidden');
    if (cardWrap)  cardWrap.classList.remove('hidden');
    if (!cardWrap) return;

    const currentWeekGlobal = getTimelineWeekInfo().globalWeekIndex;
    const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const sorted = [...data].sort((a, b) => a.program.localeCompare(b.program));

    cardWrap.innerHTML = sorted.map(p => {
        const prog   = calculateProgress(p);
        const status = getProgramStatus(p);
        const smeta  = STATUS_META[status];
        const unified = getUnifiedTimeline(p);

        // Build mini week bar (group by month, 4 weeks each)
        const weekBar = Array.from({length: 12}, (_, mIdx) => {
            const weeks = unified.slice(mIdx * 4, mIdx * 4 + 4);
            const hasPlan = weeks.some(v => v === 1);
            let allDone = true;
            weeks.forEach((v, wOff) => {
                if (v !== 1) return;
                const globalW = mIdx * 4 + wOff;
                let weekDone = true;
                p.subPrograms.forEach(s => {
                    if (s.timeline[globalW] === 1 && !(s.completed && s.completed.includes(globalW))) weekDone = false;
                });
                if (!weekDone) allDone = false;
            });
            if (!hasPlan) return `<div class="flex-1 h-3 rounded-sm bg-slate-100 mx-0.5"></div>`;
            return `<div class="flex-1 h-3 rounded-sm mx-0.5 ${allDone ? 'bg-cakrawala-blue' : 'bg-slate-300'}"></div>`;
        }).join('');

        const monthLabels = monthAbbr.map(m =>
            `<span class="flex-1 text-center" style="font-size:8px;">${m}</span>`
        ).join('');

        // Sub-programs list
        const subHtml = p.subPrograms.map((sub, idx) => {
            const totalPlan = sub.timeline.filter(v => v === 1).length;
            const totalDone = sub.completed ? sub.completed.length : 0;
            const subRate   = totalPlan === 0 ? 0 : Math.round((totalDone / totalPlan) * 100);
            const subUnified = sub.timeline;
            const subBar = Array.from({length: 12}, (_, mIdx) => {
                const weeks = subUnified.slice(mIdx * 4, mIdx * 4 + 4);
                const hasPlan = weeks.some(v => v === 1);
                let allDone = true;
                weeks.forEach((v, wOff) => {
                    if (v !== 1) return;
                    const gw = mIdx * 4 + wOff;
                    if (!(sub.completed && sub.completed.includes(gw))) allDone = false;
                });
                if (!hasPlan) return `<div class="flex-1 h-2 rounded-sm bg-slate-100 mx-0.5"></div>`;
                return `<div class="flex-1 h-2 rounded-sm mx-0.5 ${allDone ? 'bg-emerald-400' : 'bg-slate-200'}"></div>`;
            }).join('');
            return `
                <div class="px-3 py-2 border-t border-slate-100 bg-slate-50/70">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <div class="flex items-start gap-1.5 min-w-0 flex-1">
                            <span class="text-slate-300 text-[10px] flex-shrink-0 mt-0.5">↳</span>
                            <span class="text-slate-600 font-bold leading-snug" style="font-size:10px;">${escapeHtml(sub.name)}</span>
                        </div>
                        <span class="flex-shrink-0 font-black text-[10px] ${subRate === 100 ? 'text-emerald-500' : 'text-slate-400'}">${subRate}%</span>
                    </div>
                    <div class="flex items-center gap-0 mt-1">${subBar}</div>
                </div>`;
        }).join('');

        return `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-3">
            <!-- Program Header -->
            <div class="px-4 py-3">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1 min-w-0">
                        <span class="font-black text-slate-800 leading-snug block" style="font-size:12px;">${escapeHtml(p.program)}</span>
                        <span class="text-slate-400 font-bold mt-0.5 block leading-tight" style="font-size:10px;">${escapeHtml(p.deliverables || '')}</span>
                    </div>
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px]">${escapeHtml(p.pic)}</span>
                        <span class="font-black text-[11px] ${prog === 100 ? 'text-emerald-500' : prog > 0 ? 'text-cakrawala-blue' : 'text-slate-400'}">${prog}%</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${smeta.badge}">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${smeta.dot}"></span>
                        ${smeta.label}
                    </span>
                    ${p.tag === 'Business As Usual'
                        ? '<span class="px-2 py-0.5 bg-blue-100 text-[8px] font-black text-blue-600 rounded-full uppercase tracking-tighter">BAU</span>'
                        : '<span class="px-2 py-0.5 bg-violet-100 text-[8px] font-black text-violet-600 rounded-full uppercase tracking-tighter">Hygiene</span>'}
                </div>
                <!-- Monthly bar -->
                <div class="flex items-center gap-0 mb-0.5">${weekBar}</div>
                <div class="flex text-slate-300 font-bold">${monthLabels}</div>
            </div>
            <!-- Sub-programs toggle -->
            ${p.subPrograms.length > 0 ? `
            <div>
                <button onclick="toggleMobileSubProgram('${p.id}')"
                    class="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all">
                    <span><i class="fas fa-list-ul mr-1.5 text-[9px]"></i>${p.subPrograms.length} Sub-Program</span>
                    <i id="mob-icon-${p.id}" class="fas fa-chevron-down text-[9px] transition-transform duration-200"></i>
                </button>
                <div id="mob-sub-${p.id}" class="hidden">${subHtml}</div>
            </div>` : ''}
        </div>`;
    }).join('');
}

function toggleMobileSubProgram(id) {
    const panel = document.getElementById(`mob-sub-${id}`);
    const icon  = document.getElementById(`mob-icon-${id}`);
    if (!panel) return;
    const hidden = panel.classList.toggle('hidden');
    if (icon) icon.style.transform = hidden ? 'rotate(0deg)' : 'rotate(180deg)';
}

function renderTimeline(data = programs) {
    // On mobile (< 768px) use card view instead of wide table
    if (window.innerWidth < 768) {
        renderTimelineMobile(data);
        return;
    }

    // Show table, hide card wrap
    const tableWrap = document.getElementById('timeline-table-wrap');
    const cardWrap  = document.getElementById('timeline-card-wrap');
    if (tableWrap) tableWrap.classList.remove('hidden');
    if (cardWrap)  cardWrap.classList.add('hidden');


    const tbody   = document.getElementById('timeline-body');
    const monthTr = document.getElementById('month-headers');
    const weekTr  = document.getElementById('week-headers');
    tbody.innerHTML = '';

    // Header
    monthTr.innerHTML = `
        <th class="px-3 py-3 text-left border-b border-r sticky left-0 bg-slate-50 z-20 text-[10px] font-black uppercase tracking-widest" ${PROG_COL_STYLE} rowspan="2">Program / Sub Program</th>
        <th class="px-3 py-3 border-b border-r text-[10px] font-black uppercase tracking-widest text-center" style="width:50px;min-width:50px;" rowspan="2">Team</th>
        <th class="px-3 py-3 border-b border-r text-[10px] font-black uppercase tracking-widest text-center" style="width:50px;min-width:50px;" rowspan="2">Rate</th>`;
    weekTr.innerHTML = '';
    monthsLong.forEach(m => {
        monthTr.innerHTML += `<th colspan="4" class="border-b border-r text-center py-3 text-[10px] font-black uppercase tracking-widest" style="width:88px;min-width:88px;">${m}</th>`;
        for (let i = 1; i <= 4; i++) weekTr.innerHTML += `<th class="text-center border-b border-r border-slate-100 py-3 text-[10px] font-bold" style="width:22px;min-width:22px;">${i}</th>`;
    });

    const currentWeekGlobal = getTimelineWeekInfo().globalWeekIndex;

    // pakai global getProgramStatus & STATUS_META
    const statusMeta = STATUS_META;

    [...data].sort((a, b) => a.program.localeCompare(b.program)).forEach(p => {
        const unified   = getUnifiedTimeline(p);
        const prog      = calculateProgress(p);
        const status    = getProgramStatus(p);
        const smeta     = statusMeta[status];
        const hasNarasi  = p.comment && p.comment.trim() !== '';
        const hasHistory = p.history && p.history.length > 0;
        const hasRiwayat = hasNarasi || hasHistory;
        const colTotal  = 3 + 48;

        // ── Program row ──────────────────────────────────────────────────────
        const tr     = document.createElement('tr');
        tr.className = 'group hover:bg-slate-50/80 transition-colors duration-150';
        tr.innerHTML = `
            <td class="p-0 border-b border-r sticky left-0 bg-white group-hover:bg-slate-50/80 z-20 shadow-sm"
                ${PROG_COL_STYLE}>
                <div class="px-3 py-2">

                    <!-- Toggle sub + nama -->
                    <div class="flex items-start gap-2">
                        <button onclick="toggleSubProgram('${p.id}')"
                                class="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-colors"
                                title="Expand sub-programs">
                            <i id="icon-${p.id}" class="fas fa-chevron-right text-[8px] text-slate-400 transition-transform duration-200"></i>
                        </button>
                        <div class="min-w-0 flex-1">
                            <!-- Nama: wrap bebas, tampil penuh -->
                            <span class="font-black text-slate-800 text-[12px] leading-snug block"
                                  title="${p.program}">${p.program}</span>
                              ${p.tag === 'Business As Usual'
                                  ? '<span class=\'mt-1 inline-block px-2 py-0.5 bg-blue-100 text-[8px] font-black text-blue-600 rounded-full uppercase tracking-tighter\'>BAU</span>'
                                  : '<span class=\'mt-1 inline-block px-2 py-0.5 bg-violet-100 text-[8px] font-black text-violet-600 rounded-full uppercase tracking-tighter\'>Hygiene</span>'}
                            <!-- Deliverables: wrap bebas -->
                            <span class="text-[10px] text-slate-400 font-bold mt-0.5 block leading-tight"
                                  title="${p.deliverables}">${p.deliverables}</span>
                        </div>
                    </div>

                    <!-- Status + Riwayat button -->
                    <div class="flex items-center justify-between mt-1.5 pl-7">
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide ${smeta.badge}">
                            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${smeta.dot}"></span>
                            ${smeta.label}
                        </span>
                        <button onclick="toggleNarasi('${p.id}')"
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all duration-200
                                       ${hasRiwayat
                                           ? 'text-cakrawala-blue hover:bg-cakrawala-blue/10 border border-cakrawala-blue/30'
                                           : 'text-slate-300 hover:text-slate-500 border border-slate-200'}"
                                id="narasi-btn-${p.id}"
                                title="${hasRiwayat ? 'Lihat riwayat progress' : 'Belum ada riwayat'}">
                            <i class="fas ${hasRiwayat ? 'fa-history' : 'fa-clock'} text-[8px]"></i>
                            <span>Riwayat</span>
                            <i id="narasi-icon-${p.id}" class="fas fa-chevron-down text-[7px] transition-transform duration-200"></i>
                        </button>
                    </div>
                </div>
            </td>

            <!-- Team -->
            <td class="p-1 border-b border-r text-center" style="width:50px;">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px]">${p.pic}</span>
            </td>

            <!-- Rate -->
            <td class="p-1 border-b border-r text-center" style="width:50px;">
                <span class="font-black text-[10px] ${prog === 100 ? 'text-emerald-500' : prog > 0 ? 'text-cakrawala-blue' : 'text-slate-400'}">${prog}%</span>
            </td>

            ${unified.map((v, i) => {
                let done = null;
                p.subPrograms.forEach(s => {
                    if (s.timeline[i] === 1) {
                        if (done === null) done = true;
                        if (!s.completed || !s.completed.includes(i)) done = false;
                    }
                });
                return `<td class="p-0 border-b border-r h-14">
                    ${done === null ? '' : `<div class="h-4 mx-1 rounded-md transition-colors ${done ? 'bg-cakrawala-blue' : 'bg-slate-200'}"></div>`}
                </td>`;
            }).join('')}`;
        tbody.appendChild(tr);

        // ── Riwayat accordion row ─────────────────────────────────────────────
        const narasiTr     = document.createElement('tr');
        narasiTr.className = `narasi-row-${p.id}`;
        // Build history HTML
        const typeLabel = { progress_update: 'Update Progress', edit: 'Edit Program', create: 'Program Dibuat' };
        const typeIcon  = { progress_update: 'fa-check-circle text-cakrawala-blue', edit: 'fa-pen text-amber-500', create: 'fa-plus-circle text-emerald-500' };
        let riwayatHtml = '';
        if (p.history && p.history.length > 0) {
            riwayatHtml = [...p.history].reverse().map(entry => {
                const lbl  = typeLabel[entry.type] || entry.type;
                const icon = typeIcon[entry.type]  || 'fa-history text-slate-400';
                const ts   = formatTs(entry.ts);
                return `<div class="mb-2 last:mb-0">
                    <div class="flex items-center gap-1.5 mb-1">
                        <i class="fas ${icon} text-[9px]"></i>
                        <span class="text-[9px] font-black text-slate-600 uppercase tracking-wide">${lbl}</span>
                        <span class="ml-auto text-[9px] text-slate-400">${ts}</span>
                    </div>
                    ${(entry.changes||[]).map(ch => `
                        <div class="ml-3 flex items-start gap-1.5">
                            <span class="text-slate-300 flex-shrink-0 text-[9px] mt-0.5">↳</span>
                            <div>
                                <span class="text-[9px] font-bold text-slate-700">${escapeHtml(ch.subName)}</span>
                                <span class="text-[9px] text-slate-500 ml-1">${escapeHtml(ch.detail)}</span>
                                ${ch.reason ? `<span class="block text-[9px] text-cakrawala-blue italic">"${escapeHtml(ch.reason)}"</span>` : ''}
                            </div>
                        </div>`).join('')}
                </div>`;
            }).join('<hr class="border-slate-100 my-2">');
        } else if (hasNarasi) {
            riwayatHtml = `<p class="text-[10px] text-slate-600">${escapeHtml(p.comment)}</p>`;
        } else {
            riwayatHtml = `<p class="text-[10px] text-slate-400 italic">Belum ada riwayat. Lakukan update progress untuk memulai.</p>`;
        }
        narasiTr.innerHTML = `
            <td colspan="${colTotal}" class="p-0 border-b bg-white">
                <div id="narasi-panel-${p.id}"
                     style="max-height:0;opacity:0;overflow:hidden;transition:max-height 0.35s ease,opacity 0.3s ease;">
                    <div class="mx-4 my-2 p-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                                        ${hasRiwayat ? 'bg-cakrawala-blue/10 text-cakrawala-blue' : 'bg-slate-100 text-slate-300'}">
                                <i class="fas fa-history text-xs"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Riwayat Update Progress</p>
                                ${riwayatHtml}
                            </div>
                            <button onclick="openUpdateModal('${sid(p.id)}')"
                                    class="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-nusantara-blue text-white rounded-lg text-[9px] font-black uppercase tracking-wide transition-colors duration-200">
                                <i class="fas fa-pen text-[8px]"></i> Update
                            </button>
                        </div>
                    </div>
                </div>
            </td>`;
        tbody.appendChild(narasiTr);

        // ── Sub-program rows ─────────────────────────────────────────────────
        p.subPrograms.forEach(sub => {
            const totalPlan = sub.timeline.filter(v => v === 1).length;
            const totalDone = sub.completed ? sub.completed.length : 0;
            const subRate   = totalPlan === 0 ? 0 : Math.round((totalDone / totalPlan) * 100);
            const subTr     = document.createElement('tr');
            subTr.className = `hidden sub-${p.id} bg-slate-50/70`;
            subTr.innerHTML = `
                <td class="p-0 border-b border-r sticky left-0 bg-slate-50/70 z-20"
                    ${PROG_COL_STYLE}>
                    <div class="px-3 py-2 pl-8 flex items-center gap-1.5">
                        <span class="text-slate-300 flex-shrink-0 text-[10px]">↳</span>
                        <span class="text-slate-600 text-[10px] font-bold leading-snug"
                              title="${sub.name}">${sub.name}</span>
                    </div>
                </td>
                <td class="p-1 border-b border-r text-center text-[10px] font-bold text-slate-500" style="width:50px;">${p.pic}</td>
                <td class="p-1 border-b border-r text-center font-black text-[10px] ${subRate === 100 ? 'text-emerald-500' : 'text-slate-500'}" style="width:50px;">${subRate}%</td>
                ${sub.timeline.map((v, i) => {
                    const done = sub.completed && sub.completed.includes(i);
                    return `<td class="p-0 border-b border-r h-12">
                        ${v ? `<div class="h-3 mx-1 rounded transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-300'}"></div>` : ''}
                    </td>`;
                }).join('')}`;
            tbody.appendChild(subTr);
        });
    });
}

// ── Toggle narasi ────────────────────────────────────────────────────────────
function toggleNarasi(id) {
    const panel = document.getElementById(`narasi-panel-${id}`);
    const icon  = document.getElementById(`narasi-icon-${id}`);
    const btn   = document.getElementById(`narasi-btn-${id}`);
    if (!panel) return;
    const isOpen = panel.style.maxHeight !== '0px' && panel.style.maxHeight !== '';
    if (isOpen) {
        panel.style.maxHeight = '0';
        panel.style.opacity   = '0';
        if (icon) icon.style.transform = 'rotate(0deg)';
        if (btn)  btn.classList.remove('bg-cakrawala-blue/5');
    } else {
        panel.style.maxHeight = (panel.scrollHeight + 80) + 'px';
        panel.style.opacity   = '1';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (btn)  btn.classList.add('bg-cakrawala-blue/5');
    }
}

// ── Toggle sub-programs ──────────────────────────────────────────────────────
function toggleSubProgram(id) {
    document.querySelectorAll(`.sub-${id}`).forEach(r => r.classList.toggle('hidden'));
    const icon   = document.getElementById(`icon-${id}`);
    if (icon) {
        var _subEl = document.querySelector('.sub-' + id); var isOpen = !(_subEl && _subEl.classList.contains('hidden'));
        icon.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/\n/g,'<br>');
}
function escapeHtmlAttr(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function applyFilters() {
    const selPic    = document.getElementById('filter-pic').value;
    const selPillar = document.getElementById('filter-pillar').value;
    const selTag    = (document.getElementById('filter-tag') ? document.getElementById('filter-tag').value : 'all');
    renderTimeline(programs.filter(p =>
        (selPic    === 'all' || p.pic    === selPic)    &&
        (selPillar === 'all' || p.pillar === selPillar) &&
        (selTag    === 'all' || (p.tag || 'Hygiene') === selTag)
    ));
}


// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

function renderUpdateList() {
    const list       = document.getElementById('update-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const selPic     = document.getElementById('update-filter-pic').value;
    const selPillar  = document.getElementById('update-filter-pillar').value;
    const selTag     = (document.getElementById('update-filter-tag') ? document.getElementById('update-filter-tag').value : 'all');
    list.innerHTML   = '';
    programs
        .filter(p =>
            (p.program.toLowerCase().includes(searchTerm) || p.pic.toLowerCase().includes(searchTerm)) &&
            (selPic === 'all' || p.pic === selPic) &&
            (selPillar === 'all' || p.pillar === selPillar) &&
            (selTag === 'all' || (p.tag || 'Hygiene') === selTag)
        )
        .sort((a, b) => a.program.localeCompare(b.program, undefined, { numeric: true }))
        .forEach(p => {
            const li     = document.createElement('li');
            li.className = 'px-5 py-6 hover:bg-slate-50 flex justify-between items-center group update-item transition-all duration-300 fade-in';
            li.setAttribute('data-id', p.id);
            li.innerHTML = `
                <div class="flex-1 pr-6 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span class="px-1.5 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase tracking-tighter truncate max-w-[180px]">${p.pillar}</span>
                        ${p.tag === 'Business As Usual'
                            ? '<span class="px-1.5 py-0.5 bg-blue-100 text-[9px] font-black text-blue-600 rounded-full uppercase tracking-tighter"><i class="fas fa-briefcase mr-0.5"></i>BAU</span>'
                            : '<span class="px-1.5 py-0.5 bg-violet-100 text-[9px] font-black text-violet-600 rounded-full uppercase tracking-tighter"><i class="fas fa-shield-check mr-0.5"></i>Hygiene</span>'}
                    </div>
                    <h4 class="text-xs font-black text-slate-800 leading-snug truncate">${p.program}</h4>
                    <div class="flex items-center flex-wrap gap-1.5 mt-1">
                        <span class="text-[10px] font-bold text-cakrawala-blue uppercase tracking-widest"><i class="fas fa-user-circle mr-1"></i>${p.pic}</span>
                        ${(function(){ var s = getProgramStatus(p); var m = STATUS_META[s]; return '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ' + m.badge + '"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ' + m.dot + '"></span>' + m.label + '</span>'; })()}
                        ${(p.history && p.history.length > 0) ? `<span class="text-[9px] bg-cakrawala-blue/10 px-1.5 py-0.5 rounded text-cakrawala-blue font-bold border border-cakrawala-blue/20"><i class="fas fa-history mr-0.5"></i>${p.history.length} riwayat</span>` : ''}
                        ${p.comment ? '<span class="text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600 font-bold border border-emerald-100"><i class="fas fa-comment-dots mr-0.5"></i>Narasi</span>' : ''}
                    </div>
                </div>
                <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="text-right">
                        <div class="text-base font-black ${calculateProgress(p) === 100 ? 'text-emerald-500' : 'text-slate-800'}">${calculateProgress(p)}%</div>
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Progress</div>
                    </div>
                    <div class="flex gap-1.5">
                        <button onclick="openUpdateModal('${sid(p.id)}')" class="w-9 h-9 flex items-center justify-center bg-white border-2 border-slate-100 rounded-lg hover:border-cakrawala-blue hover:text-cakrawala-blue transition-all shadow-sm" title="Detail & Update"><i class="fas fa-check-circle text-sm"></i></button>
                        ${(typeof CURRENT_USER==='undefined'||CURRENT_USER.role==='super_admin'||CURRENT_USER.can_edit==1) ? `<button onclick="openEditProgramView('${sid(p.id)}')" class="w-9 h-9 flex items-center justify-center bg-white border-2 border-slate-100 rounded-lg hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm" title="Edit Program"><i class="fas fa-edit text-sm"></i></button>` : ''}
                        ${(typeof CURRENT_USER==='undefined'||CURRENT_USER.role==='super_admin'||CURRENT_USER.can_delete==1) ? `<button onclick="openDeleteConfirm('${sid(p.id)}')" class="w-9 h-9 flex items-center justify-center bg-white border-2 border-slate-100 rounded-lg hover:border-red-500 hover:text-red-500 transition-all shadow-sm" title="Hapus Program"><i class="fas fa-trash-alt text-sm"></i></button>` : ''}
                    </div>
                </div>`;
            list.appendChild(li);
        });
}


// ─────────────────────────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────────────────────────

function populateFilters() {
    const defaultPics = ['Domestic & Overseas', 'Konglomerasi Keuangan', 'ATL', 'DRA', 'DVA', 'PSA'];
    const picSet    = [...new Set([...defaultPics, ...programs.map(p => p.pic)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const pillarSet = [...new Set(programs.map(p => p.pillar).filter(Boolean))];
    pillarSet.sort((a, b) => PILLAR_ORDER.indexOf(a) - PILLAR_ORDER.indexOf(b));
    const picOpts    = '<option value="all">Semua Team</option>'  + picSet.map(p => `<option value="${p}">${p}</option>`).join('');
    const pillarOpts = '<option value="all">Semua Pilar</option>' + pillarSet.map(p => `<option value="${p}">${p}</option>`).join('');
    ['filter-pic',    'update-filter-pic']   .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = picOpts; });
    ['filter-pillar', 'update-filter-pillar'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = pillarOpts; });
}


// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openUpdateModal(id) {
    if (isInInputView()) saveFilterState();
    currentModalId     = sid(id);
    const p            = programs.find(item => sameId(item.id, id));
    tempCompletedState = JSON.parse(JSON.stringify(p.subPrograms));
    document.getElementById('modal-title').innerText    = p.program;
    document.getElementById('modal-subtitle').innerText = `LEAD: ${p.pic} | ${p.pillar}`;
    renderModalSubPrograms(); updateModalStats(); renderHistoryInModal(p);
    const modal = document.getElementById('update-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function renderModalSubPrograms() {
    const list = document.getElementById('modal-subprograms-list');
    list.innerHTML = '';
    tempCompletedState.forEach((sub, sIdx) => {
        const div   = document.createElement('div');
        div.className = 'space-y-3 p-4 bg-slate-50/50 rounded-[1.5rem] border-2 border-slate-100';
        let btns = '';
        sub.timeline.forEach((isP, wIdx) => {
            if (isP === 1) {
                btns += `<button onclick="toggleWeek(${sIdx}, ${wIdx})" class="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[9px] font-black transition-all shadow-md ${sub.completed.includes(wIdx) ? 'week-btn-completed' : 'week-btn-planned'}"><span>${monthsLong[Math.floor(wIdx/4)].substring(0,3)}</span><span class="text-sm">W${(wIdx%4)+1}</span></button>`;
            }
        });
        div.innerHTML = `<h5 class="text-xs font-black text-slate-800 uppercase tracking-widest">${escapeHtml(sub.name)}</h5><div class="flex flex-wrap gap-2">${btns || '<p class="text-xs italic text-slate-400">No scheduled weeks.</p>'}</div>`;
        list.appendChild(div);
    });
}

function toggleWeek(sIdx, wIdx) {
    const sub = tempCompletedState[sIdx];
    if (sub.completed.includes(wIdx)) sub.completed = sub.completed.filter(w => w !== wIdx);
    else sub.completed.push(wIdx);
    renderModalSubPrograms(); updateModalStats();
}

function updateModalStats(limitWeek = 48) {
    let totalP = 0, totalD = 0;
    tempCompletedState.forEach(sub => {
        sub.timeline.forEach((v, i) => {
            if (i < limitWeek && v === 1) { totalP++; if (sub.completed.includes(i)) totalD++; }
        });
    });
    const perc = totalP === 0 ? 0 : Math.round((totalD / totalP) * 100);
    document.getElementById('modal-progress-text').innerText = perc + '%';
    document.getElementById('modal-ratio-text').innerText    = `${totalD} / ${totalP}`;
}

function saveProgress() {
    const idx  = programs.findIndex(p => sameId(p.id, currentModalId));
    const oldP = programs[idx];
    const changes = [];

    // Detect which sub-programs had completed-state changes
    tempCompletedState.forEach((newSub, si) => {
        const oldSub = oldP.subPrograms[si];
        if (!oldSub) return;
        const added   = newSub.completed.filter(w => !oldSub.completed.includes(w));
        const removed = oldSub.completed.filter(w => !newSub.completed.includes(w));
        if (added.length > 0 || removed.length > 0) {
            let detail = '';
            if (added.length)   detail += added.map(w   => `${monthsLong[Math.floor(w/4)].substring(0,3)} W${(w%4)+1} ✓`).join(', ');
            if (removed.length) detail += (detail?'; ':'')+removed.map(w => `${monthsLong[Math.floor(w/4)].substring(0,3)} W${(w%4)+1} ✗`).join(', ');
            changes.push({ subName: newSub.name, detail, reason: '' });
        }
    });

    if (changes.length > 0) {
        showChangeReasonModal(changes, (resolvedChanges) => {
            _doSaveProgress(idx, resolvedChanges);
        });
    } else {
        _doSaveProgress(idx, []);
    }
}

function _doSaveProgress(idx, resolvedChanges) {
    const history = [...(programs[idx].history || [])];
    if (resolvedChanges.length > 0) {
        history.push(buildHistoryEntry('progress_update', resolvedChanges));
    }
    programs[idx].subPrograms = tempCompletedState;
    programs[idx].history     = history;
    saveOneProgram(programs[idx]); renderAll();
    showToast('Progress verification saved.'); closeModal();
    restoreFilterState();
    switchView('input');
}

function closeModal() {
    const modal = document.getElementById('update-modal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE REASON MODAL
// ─────────────────────────────────────────────────────────────────────────────

function showChangeReasonModal(changes, onConfirm) {
    pendingChangeConfirm = onConfirm;
    const body = document.getElementById('change-reason-body');
    body.innerHTML = '';
    changes.forEach((ch, i) => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2';
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i class="fas fa-pen text-amber-500 text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-black text-slate-800">${escapeHtml(ch.subName)}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(ch.detail)}</p>
                </div>
            </div>
            <textarea data-change-idx="${i}" class="change-reason-input w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium focus:border-cakrawala-blue outline-none transition-all resize-none h-12 placeholder-slate-300" placeholder="Alasan perubahan ini... (opsional)"></textarea>`;
        // Prefill if reason came from createNarasi
        if (ch.reason) div.querySelector('textarea').value = ch.reason;
        body.appendChild(div);
        changes[i] = ch; // keep reference
    });
    document.getElementById('change-reason-count').innerText = changes.length + ' perubahan terdeteksi';
    const modal = document.getElementById('change-reason-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    // store changes ref for confirm
    modal._changes = changes;
}

function confirmChangeReasonModal() {
    const modal   = document.getElementById('change-reason-modal');
    const changes = modal._changes || [];
    document.querySelectorAll('.change-reason-input').forEach(ta => {
        const i = parseInt(ta.getAttribute('data-change-idx'));
        if (changes[i]) changes[i].reason = ta.value.trim();
    });
    modal.classList.add('hidden'); modal.classList.remove('flex');
    if (typeof pendingChangeConfirm === 'function') {
        pendingChangeConfirm(changes);
        pendingChangeConfirm = null;
    }
}

function cancelChangeReasonModal() {
    document.getElementById('change-reason-modal').classList.add('hidden');
    document.getElementById('change-reason-modal').classList.remove('flex');
    pendingChangeConfirm = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY DISPLAY IN UPDATE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function renderHistoryInModal(p) {
    const container = document.getElementById('modal-history-container');
    if (!container) return;
    const history = p.history || [];

    // Also display old comment/narasi if exists (backward compat)
    const oldNarasi = p.comment && p.comment.trim() ? p.comment : '';

    if (history.length === 0 && !oldNarasi) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic">Belum ada riwayat perubahan.</p>';
        return;
    }

    let html = '';

    if (oldNarasi) {
        html += `<div class="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Narasi Program</p>
            <p class="text-xs text-slate-600">${escapeHtml(oldNarasi)}</p>
        </div>`;
    }

    const typeLabel = { progress_update: 'Update Progress', edit: 'Edit Program', create: 'Program Dibuat' };
    const typeIcon  = { progress_update: 'fa-check-circle text-cakrawala-blue', edit: 'fa-pen text-amber-500', create: 'fa-plus-circle text-emerald-500' };

    [...history].reverse().forEach(entry => {
        const lbl  = typeLabel[entry.type] || entry.type;
        const icon = typeIcon[entry.type]  || 'fa-history text-slate-400';
        const ts   = formatTs(entry.ts);
        const user = entry.user || 'User';
        html += `<div class="border border-slate-200 rounded-xl overflow-hidden mb-2">
            <div class="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
                <i class="fas ${icon} text-xs"></i>
                <span class="text-[10px] font-black text-slate-700 uppercase tracking-wide">${lbl}</span>
                <span class="ml-auto text-[9px] text-slate-400 font-medium">${user} · ${ts}</span>
            </div>
            <div class="p-3 space-y-2">
                ${(entry.changes || []).map(ch => `
                    <div class="flex gap-2 items-start">
                        <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></span>
                        <div class="flex-1 min-w-0">
                            <span class="text-[10px] font-black text-slate-700">${escapeHtml(ch.subName)}</span>
                            <span class="text-[10px] text-slate-500 ml-1">${escapeHtml(ch.detail)}</span>
                            ${ch.reason ? `<p class="text-[10px] text-cakrawala-blue mt-0.5 italic"><i class="fas fa-quote-left text-[7px] mr-1"></i>${escapeHtml(ch.reason)}</p>` : ''}
                        </div>
                    </div>`).join('')}
                ${(!entry.changes || entry.changes.length === 0) ? '<p class="text-[10px] text-slate-400 italic">Tidak ada detail perubahan.</p>' : ''}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}


// ─────────────────────────────────────────────────────────────────────────────
// IMPORT / EXPORT / RESET
// ─────────────────────────────────────────────────────────────────────────────

function exportToHarddisk() {
    if (typeof CURRENT_USER!=='undefined' && CURRENT_USER.role==='staff_user') { showToast('Akses ditolak.'); return; }
    const blob = new Blob([JSON.stringify(programs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `AML_BACKUP_2026_${new Date().toISOString().split('T')[0]}.json` });
    a.click();
    showToast('Backup exported successfully.');
}

function importFromHarddisk(e) {
    if (typeof CURRENT_USER!=='undefined' && CURRENT_USER.role==='staff_user') { showToast('Akses ditolak.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            programs = JSON.parse(reader.result);
            for (const p of programs) await saveOneProgram(p);
            renderAll();
            showToast('Framework imported.');
        } catch (e) { alert('Invalid file format.'); }
    };
    reader.readAsText(e.target.files[0]);
}

function confirmReset() {
    if (confirm('Refresh dan muat ulang data?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); }
}


// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    t.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => t.classList.add('translate-y-32', 'opacity-0'), 4000);
}


// ─────────────────────────────────────────────────────────────────────────────
// MASTER RENDER & BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────

function renderAll() {
    // Data layer — selalu dijalankan, ringan
    renderAlerts();
    renderKPIs();
    updateWeekIndicator();
    populateFilters();

    // Deteksi view aktif — default ke dashboard jika belum ada
    const activeView = ['dashboard','timeline','input'].find(id => {
        const el = document.getElementById(id + '-view');
        return el && !el.classList.contains('hidden');
    }) || 'dashboard';

    // Render hanya bagian yang terlihat user
    if (activeView === 'dashboard') {
        requestAnimationFrame(() => renderCharts());
    } else if (activeView === 'timeline') {
        requestAnimationFrame(() => applyFilters());
    } else if (activeView === 'input') {
        requestAnimationFrame(() => renderUpdateList());
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT — Super Admin only
// ─────────────────────────────────────────────────────────────────────────────

function permBtn(id, col, val, icon, label) {
    const on  = val == 1;
    const cls = on ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400';
    return `<button onclick="setPermission(${id},'${col}',${on?0:1})"
        title="${on?'Cabut':'Aktifkan'} izin ${label}"
        class="flex items-center gap-1.5 px-3 h-8 rounded-lg border font-black text-xs transition-all ${cls}">
        <i class="fas ${icon} text-[10px]"></i><span>${label}</span>
    </button>`;
}

async function loadUsers() {
    const list = document.getElementById('user-list');
    if (!list) return;
    list.innerHTML = '<li class="text-slate-400 text-sm p-4 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat...</li>';
    try {
        const res = await fetch('api/auth/users');
        const users = await res.json();
        if (!Array.isArray(users)) { list.innerHTML = '<li class="text-red-400 text-sm p-4 text-center">Error memuat data.</li>'; return; }
        list.innerHTML = '';
        users.forEach(u => {
            const li = document.createElement('li');
            li.className = 'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-2';
            const isStaff   = u.role === 'staff_user';
            const roleClass = isStaff ? 'bg-blue-50 text-blue-700' : 'bg-amber-100 text-amber-700';
            const initials  = u.full_name.substring(0,2).toUpperCase();
            const statusCls = u.is_active==1 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200';

            const permSection = isStaff ? `
                <div class="px-4 py-3 bg-slate-50 border-t border-slate-100">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Izin Akses Program</p>
                    <div class="flex items-center gap-2">
                        ${permBtn(u.id,'can_add',   u.can_add,   'fa-plus',     'Tambah')}
                        ${permBtn(u.id,'can_edit',  u.can_edit,  'fa-pen',      'Edit')}
                        ${permBtn(u.id,'can_delete',u.can_delete,'fa-trash-alt','Hapus')}
                    </div>
                </div>` : '';

            li.innerHTML = `
                <div class="flex items-center justify-between p-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${roleClass}">${initials}</div>
                        <div>
                            <p class="font-black text-slate-800 text-sm">${u.full_name}</p>
                            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span class="text-[9px] font-bold text-slate-400">@${u.username}</span>
                                <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${roleClass}">${u.role==='super_admin'?'Super Admin':'Staff User'}</span>
                                <span class="px-1.5 py-0.5 rounded border text-[8px] font-black uppercase ${statusCls}">${u.is_active==1?'Aktif':'Nonaktif'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="setUserActive(${u.id},${u.is_active==1?0:1})" title="${u.is_active==1?'Nonaktifkan':'Aktifkan'}"
                                class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-amber-400 hover:text-amber-500 transition-all text-slate-400">
                            <i class="fas ${u.is_active==1?'fa-user-slash':'fa-user-check'} text-xs"></i>
                        </button>
                        <button onclick="resetUserPw(${u.id})" title="Reset Password"
                                class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-cakrawala-blue hover:text-cakrawala-blue transition-all text-slate-400">
                            <i class="fas fa-key text-xs"></i>
                        </button>
                        ${u.role!=='super_admin'?`<button onclick="deleteUser(${u.id})" title="Hapus User"
                                class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-red-500 hover:text-red-500 transition-all text-slate-400">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>`:''}
                    </div>
                </div>${permSection}`;
            list.appendChild(li);
        });
    } catch(e) {
        list.innerHTML = '<li class="text-red-400 text-sm p-4 text-center">Gagal memuat data user.</li>';
    }
}

async function createUser() {
    const u=document.getElementById('new-username').value.trim();
    const n=document.getElementById('new-fullname').value.trim();
    const p=document.getElementById('new-password').value.trim();
    const r=document.getElementById('new-role').value;
    if (!u||!n||!p) { showToast('Semua field wajib diisi'); return; }
    const res=await fetch('api/auth/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,full_name:n,password:p,role:r})});
    const d=await res.json();
    if (d.success) { showToast('User berhasil ditambahkan'); ['new-username','new-fullname','new-password'].forEach(id=>document.getElementById(id).value=''); loadUsers(); }
    else showToast(d.error||'Gagal menambahkan user');
}

async function setUserActive(id, val) {
    const res=await fetch('api/auth/users?action=set_active',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,value:val})});
    const d=await res.json();
    showToast(d.success?(val?'User diaktifkan':'User dinonaktifkan'):'Gagal');
    if (d.success) loadUsers();
}

async function setPermission(id, col, val) {
    const res=await fetch('api/auth/users?action=set_permission',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,column:col,value:val})});
    const d=await res.json();
    const lbl={can_add:'Tambah',can_edit:'Edit',can_delete:'Hapus'};
    showToast(d.success?(val?`Izin ${lbl[col]} diaktifkan`:`Izin ${lbl[col]} dicabut`):'Gagal mengubah izin');
    if (d.success) loadUsers();
}

async function resetUserPw(id) {
    const p=prompt('Password baru (min. 6 karakter):');
    if (!p) return;
    if (p.length<6) { alert('Password minimal 6 karakter'); return; }
    const res=await fetch('api/auth/users?action=reset_password',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,password:p})});
    const d=await res.json();
    showToast(d.success?'Password direset':'Gagal reset password');
}

async function deleteUser(id) {
    if (!confirm('Hapus user ini?')) return;
    const res=await fetch(`api/auth/users?id=${id}`,{method:'DELETE'});
    const d=await res.json();
    if (d.success) { showToast('User dihapus'); loadUsers(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION TIMEOUT — 1 jam idle → countdown 60 detik → auto logout
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_IDLE_MS = 60 * 60 * 1000;
const COUNTDOWN_SECS  = 60;
let idleTimer=null, countdownTimer=null, countdownLeft=60, warningShowing=false;

function resetIdleTimer() {
    if (warningShowing) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showTimeoutWarning, SESSION_IDLE_MS);
}

function showTimeoutWarning() {
    warningShowing=true; countdownLeft=COUNTDOWN_SECS;
    const m=document.getElementById('session-timeout-modal');
    if (!m) return;
    m.classList.remove('hidden'); m.classList.add('flex');
    updateCountdownUI(); startCountdown();
}

function updateCountdownUI() {
    const n=document.getElementById('countdown-number');
    const c=document.getElementById('countdown-circle');
    if (!n||!c) return;
    n.textContent=countdownLeft;
    c.style.strokeDashoffset=251.2*(1-countdownLeft/COUNTDOWN_SECS);
    c.style.stroke=countdownLeft>30?'#10b981':countdownLeft>10?'#f59e0b':'#ef4444';
}

function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer=setInterval(()=>{ countdownLeft--; updateCountdownUI(); if(countdownLeft<=0){clearInterval(countdownTimer);doLogout();} },1000);
}

function sessionKeepAlive() {
    clearInterval(countdownTimer); warningShowing=false;
    const m=document.getElementById('session-timeout-modal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    fetch('api/auth/check').catch(()=>{});
    resetIdleTimer();
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTime = localStorage.getItem('lastSyncTime');
    const tag       = document.getElementById('last-update-tag');
    if (tag && savedTime) tag.innerText = savedTime;
    // switchView dulu agar view aktif sudah terset sebelum loadFromDatabase memanggil renderAll
    switchView('dashboard');
    loadFromDatabase();
    // Init session timeout
    resetIdleTimer();
    ['mousedown','mousemove','keydown','scroll','touchstart','click'].forEach(e=>document.addEventListener(e,resetIdleTimer,{passive:true}));

    // Re-render timeline on resize / orientation change (responsive switch table ↔ cards)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const timelineView = document.getElementById('timeline-view');
            if (timelineView && !timelineView.classList.contains('hidden')) {
                applyFilters();
            }
        }, 200);
    });
});