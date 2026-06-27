<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Enterprise AML Performance Dashboard 2026</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
            extend: {
                colors: {
                'nusantara-blue': '#0857C3',
                'cakrawala-blue': '#307FE2',
                'mentari-blue': '#71C5E8',
                }
            }
            }
        }
    </script>
        <script src="assets/libs/chart.min.js"></script>
        <link rel="stylesheet" href="assets/libs/fa-all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        :root {
            --primary: #065f46;
            --primary-light: #71C5E8;
            --bg-main: #f1f5f9;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-main);
            font-size: 14px; 
        }

        .dashboard-container {
            max-width: 1320px;
            margin: 0 auto;
        }

        .chart-container {
            position: relative;
            width: 100%;
            height: 280px; 
        }

        @media (max-width: 767px) {
            .chart-container { height: 200px; }
        }

        .timeline-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
        .timeline-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .timeline-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .week-btn-planned { background-color: #f8fafc; border: 1px solid #e2e8f0; color: #94a3b8; }
        .week-btn-completed { background-color: #71C5E8; border: 1px solid #059669; color: white !important; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); }
        
        .card-shadow { box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05); }
        .glass-sidebar { background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); }

        /* Tooltip style */
        .program-hover-cell {
            position: relative;
            cursor: help;
        }

        .removing {
            transform: scale(0.95);
            opacity: 0;
            transition: all 0.3s ease;
        }

        /* Styling for the KPI hover hint */
        .kpi-card-hoverable {
            cursor: help;
            transition: all 0.2s ease;
        }
        .kpi-card-hoverable:hover {
            transform: translateY(-4px);
            border-color: #f59e0b;
        }
        #alert-chevron { transition: transform 0.3s ease; }
        #alert-details { animation: slideDown 0.3s ease-out; }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        #alert-details ul li {
            border-bottom: 1px solid rgba(241, 245, 249, 0.5);
        }
        #alert-details ul li:last-child { border-bottom: none; }

        /* Mobile safe area (notch / gesture bar) */
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

        /* Bottom nav active state */
        .bottom-nav-btn.active {
            color: #307FE2;
        }
        .bottom-nav-btn.active i {
            transform: scale(1.15);
        }

        /* Mobile sidebar transition */
        #mobile-sidebar-drawer.open {
            transform: translateX(0);
        }

        /* Responsive font size untuk Fold layar luar */
        @media (max-width: 480px) {
            body { font-size: 14px; }
            .dashboard-container { padding: 0; }
        }

        /* ── Responsive Timeline ── */

        /* Mobile: card wrap scrollable, full height minus header+nav+filter */
        @media (max-width: 767px) {
            #timeline-table-wrap { display: none !important; }
            #timeline-card-wrap  { display: block !important; max-height: calc(100vh - 230px); overflow-y: auto; }

            /* Filter selects: stack nicely on small screens */
            #timeline-view .flex.flex-wrap.gap-2 select {
                font-size: 11px;
                padding: 6px 10px;
            }

            /* KPI cards: 2-column grid on mobile */
            .grid.grid-cols-1.md\\:grid-cols-3.lg\\:grid-cols-5 {
                grid-template-columns: repeat(2, 1fr);
            }

            /* Progress Update list: tighter on mobile */
            #update-list li {
                padding-left: 12px;
                padding-right: 12px;
            }
        }

        /* Small mobile (< 400px) */
        @media (max-width: 400px) {
            #timeline-card-wrap { max-height: calc(100vh - 250px); }
            .grid.grid-cols-1.md\\:grid-cols-3.lg\\:grid-cols-5 {
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }
        }

        /* Desktop/tablet: always show table, hide card wrap */
        @media (min-width: 768px) {
            #timeline-table-wrap { display: flex !important; }
            #timeline-card-wrap  { display: none !important; }
        }

        /* Timeline card styles */
        #timeline-card-wrap .timeline-card {
            transition: box-shadow 0.2s ease;
        }
        #timeline-card-wrap .timeline-card:active {
            box-shadow: 0 0 0 2px #307FE2;
        }
    </style>
    <script>
        // Harus inline agar tersedia sebelum app.js load
        function toggleMobileSidebar() {
            var drawer  = document.getElementById('mobile-sidebar-drawer');
            var overlay = document.getElementById('mobile-sidebar-overlay');
            if (!drawer) return;
            var isOpen = drawer.classList.contains('open');
            drawer.classList.toggle('open', !isOpen);
            overlay.classList.toggle('hidden', isOpen);
            document.body.style.overflow = isOpen ? '' : 'hidden';
        }
    </script>
</head>
<body class="text-slate-800 h-screen flex overflow-hidden">

    <!-- Sidebar Optimized -->
    <aside class="w-60 glass-sidebar text-white flex-shrink-0 hidden md:flex flex-col shadow-2xl z-30">
        <div class="p-5 border-b border-slate-700/50">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-cakrawala-blue rounded-xl flex items-center justify-center shadow-lg shadow-cakrawala-blue/20">
                    <i class="fas fa-shield text-white text-xl"></i>
                </div>
                <div>
                    <h1 class="text-xl font-extrabold tracking-tight text-white">AML<span class="text-mentari-blue">CORE</span></h1>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Management Suite</p>
                </div>
            </div>
        </div>
        
        <nav class="flex-1 overflow-y-auto py-8">
            <ul class="space-y-2 px-4">
                <li>
                    <button onclick="switchView('dashboard')" class="nav-item w-full flex items-center p-3 rounded-xl hover:bg-slate-800/50 text-mentari-blue bg-cakrawala-blue/10 transition-all group" data-target="dashboard">
                        <i class="fas fa-th-large w-5 text-base flex-shrink-0"></i>
                        <span class="ml-3 font-bold text-xs whitespace-nowrap">Executive Dashboard</span>
                    </button>
                </li>
                <li>
                    <button onclick="switchView('timeline')" class="nav-item w-full flex items-center p-3 rounded-xl hover:bg-slate-800/50 text-slate-400 transition-all group" data-target="timeline">
                        <i class="fas fa-stream w-5 text-base flex-shrink-0"></i>
                        <span class="ml-3 font-bold text-xs whitespace-nowrap">Timeline</span>
                    </button>
                </li>
                <li>
                    <button onclick="switchView('input')" class="nav-item w-full flex items-center p-3 rounded-xl hover:bg-slate-800/50 text-slate-400 transition-all group" data-target="input">
                        <i class="fas fa-check-double w-5 text-base flex-shrink-0"></i>
                        <span class="ml-3 font-bold text-xs whitespace-nowrap m3nU">Programs</span>
                    </button>
                </li>
                <?php if ($currentUser['role']==='super_admin' || $currentUser['can_add']): ?>
                <li class="pt-8 pb-4">
                    <span class="px-6 text-[10px] uppercase font-black text-slate-500 tracking-[0.3em]">
                        <?php echo $currentUser['role']==='super_admin' ? 'Administrator' : 'Program'; ?>
                    </span>
                </li>
                <li>
                    <button onclick="initAddProgram()" class="nav-item w-full flex items-center p-3 rounded-xl hover:bg-slate-800/50 text-slate-400 transition-all group" data-target="add-program">
                        <i class="fas fa-plus-circle w-5 text-base flex-shrink-0"></i>
                        <span class="ml-3 font-bold text-xs whitespace-nowrap">Tambah Program</span>
                    </button>
                </li>
                <?php endif; ?>
                <?php if ($currentUser['role']==='super_admin'): ?>
                <li>
                    <button onclick="openUserManager()" class="nav-item w-full flex items-center p-3 rounded-xl hover:bg-slate-800/50 text-slate-400 transition-all group">
                        <i class="fas fa-users-gear w-5 text-base flex-shrink-0"></i>
                        <span class="ml-3 font-bold text-xs whitespace-nowrap">Kelola User</span>
                    </button>
                </li>
                <li>
                    <div class="px-4 py-6 mt-6 mx-2 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <p class="text-[9px] text-slate-500 font-black uppercase mb-3 tracking-widest text-center">Data Persistence</p>
                        <div class="flex justify-center">
                            <button onclick="exportToHarddisk()" class="flex flex-col items-center justify-center p-3 bg-slate-800 rounded-xl hover:bg-nusantara-blue transition-all border border-slate-700 group w-full">
                                <i class="fas fa-download mb-1.5 group-hover:scale-110 transition text-sm"></i>
                                <span class="text-[9px] font-bold">Export Backup</span>
                            </button>
                        </div>
                    </div>
                </li>
                <?php endif; ?>
            </ul>
        </nav>

        <div class="p-6 border-t border-slate-700/50 bg-slate-900/50">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cakrawala-blue to-teal-600 flex items-center justify-center text-white font-black shadow-lg flex-shrink-0">
                    <?php echo strtoupper(substr($currentUser['full_name'],0,2)); ?>
                </div>
                <div class="overflow-hidden flex-1 min-w-0">
                    <p class="text-sm font-bold text-white truncate"><?php echo htmlspecialchars($currentUser['full_name']); ?></p>
                    <p class="text-[10px] font-bold uppercase <?php echo $currentUser['role']==='super_admin'?'text-amber-400':'text-mentari-blue'; ?>">
                        <?php echo $currentUser['role']==='super_admin'?'Super Admin':'Staff User'; ?>
                    </p>
                </div>
                <button onclick="doLogout()" title="Logout"
                        class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <i class="fas fa-right-from-bracket text-sm"></i>
                </button>
            </div>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        
        <!-- Header -->
        <header class="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 flex-shrink-0 z-20">
            <div class="flex items-center space-x-3">
                <!-- Hamburger: mobile only -->
                <button onclick="toggleMobileSidebar()" class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                    <i class="fas fa-bars text-sm"></i>
                </button>
                <div>
                    <h2 class="text-base md:text-xl font-extrabold text-slate-800 tracking-tight" id="view-title">Executive Dashboard</h2>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block" id="last-update-tag">Timeline Week | Loading...</p>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest md:hidden" id="last-update-tag-mobile"></p>
            </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 timeline-scroll">
            <div class="dashboard-container space-y-10">
                
                <!-- VIEW: DASHBOARD -->
                <div id="dashboard-view" class="space-y-10 fade-in">
                    <!-- Top Metrics Grid -->
                     <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 class="text-2xl font-black text-slate-800">Performance Overview</h2>
                            <p class="text-slate-500 shadow-sm">Monitoring program kerja berdasarkan periode.</p>
                        </div>
                        
                        <div class="relative min-w-[200px] hidden">
                            <select id="month-filter" class="w-full bg-white border-2 border-slate-100 rounded-2xl p-3 px-5 text-slate-700 font-bold focus:ring-4 focus:ring-cakrawala-blue/10 focus:border-cakrawala-blue transition-all outline-none appearance-none cursor-pointer shadow-sm">
                                <option value="all">📅 Semua Bulan (Default)</option>
                                <option value="1">Januari</option>
                                <option value="2">Februari</option>
                                <option value="3">Maret</option>
                                <option value="4">April</option>
                                <option value="5">Mei</option>
                                <option value="6">Juni</option>
                                <option value="7">Juli</option>
                                <option value="8">Agustus</option>
                                <option value="9">September</option>
                                <option value="10">Oktober</option>
                                <option value="11">November</option>
                                <option value="12">Desember</option>
                            </select>
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <i class="fas fa-chevron-down text-xs"></i>
                            </div>
                        </div>
                    </div>
                    

<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
    <div class="bg-white p-6 rounded-3xl card-shadow border border-slate-100 relative overflow-hidden group">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">All Programs</p>
        <h3 class="text-4xl font-black text-slate-800 mt-1 relative z-10" id="kpi-total">0</h3>
        <div class="mt-3 text-sm font-bold text-cakrawala-blue"><i class="fas fa-layer-group"></i> Total Work Plan</div>
    </div>

    <div class="bg-white p-5 rounded-2xl card-shadow border border-slate-100 relative overflow-hidden">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10 text-green-500">Done</p>
        <h3 class="text-4xl font-black text-emerald-600 mt-1 relative z-10" id="kpi-done-count">0</h3>
        <div class="mt-3 text-sm font-bold text-emerald-600"><i class="fas fa-check-double"></i> Completed</div>
    </div>

    <div class="bg-white p-5 rounded-2xl card-shadow border border-slate-100 relative overflow-hidden">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10 text-blue-500">On Progress</p>
        <h3 class="text-4xl font-black text-blue-600 mt-1 relative z-10" id="kpi-ongoing-count">0</h3>
        <div class="mt-3 text-sm font-bold text-blue-600"><i class="fas fa-spinner fa-spin"></i> In Execution</div>
    </div>

    <div class="bg-white p-5 rounded-2xl card-shadow border border-red-100 relative overflow-hidden">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10 text-red-500">Lag</p>
        <h3 class="text-4xl font-black text-red-500 mt-1 relative z-10" id="kpi-lag-count">0</h3>
        <div class="mt-3 text-sm font-bold text-red-500"><i class="fas fa-exclamation-triangle"></i> Need Attention</div>
    </div>

    <div class="bg-white p-5 rounded-2xl card-shadow border border-slate-100 relative overflow-hidden">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10 text-slate-400">Not Start</p>
        <h3 class="text-4xl font-black text-slate-400 mt-1 relative z-10" id="kpi-notstart-count">0</h3>
        <div class="mt-3 text-sm font-bold text-slate-400"><i class="fas fa-clock"></i> Dependencies</div>
    </div>
</div>

                    
<!--
<div class="flex justify-center mb-8">
    <button onclick="toggleProgramLists()" class="group bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-3 shadow-lg">
        <i class="fas fa-list-ul text-mentari-blue"></i>
        <span>LIHAT DETAIL DAFTAR PROGRAM</span>
        <i id="dropdown-icon" class="fas fa-chevron-down transition-transform duration-300"></i>
    </button>
</div>

<div id="program-lists-panel" class="hidden animate-in fade-in zoom-in duration-300 mb-10">
    <div class="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8 border border-white shadow-xl">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div class="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
                <h4 class="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4">Completed</h4>
                <ul id="ul-done" class="space-y-2 text-sm text-slate-700"></ul>
            </div>

            <div class="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                <h4 class="text-xs font-black text-blue-700 uppercase tracking-widest mb-4">On Progress</h4>
                <ul id="ul-ongoing" class="space-y-2 text-sm text-slate-700"></ul>
            </div>
            <div class="bg-red-50/50 p-5 rounded-3xl border border-red-100">
                <h4 class="text-xs font-black text-red-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Lag Programs
                </h4>
                <ul id="ul-overdue" class="space-y-2 text-sm text-red-900/80"></ul>
            </div>

            <div class="bg-slate-50/50 p-5 rounded-3xl border border-slate-200">
                <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Not Started</h4>
                <ul id="ul-notstart" class="space-y-2 text-sm text-slate-500"></ul>
            </div>
        </div>
    </div>
</div>
-->




                    <!-- ── TAG BREAKDOWN PANEL ── -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">

                        <!-- Hygiene Panel -->
                        <div class="bg-white rounded-[2rem] card-shadow border border-violet-100 overflow-hidden">
                            <div class="flex items-center justify-between px-8 py-5 bg-violet-50 border-b border-violet-100">
                                <div class="flex items-center gap-3">
                                    <span class="w-3 h-3 rounded-full bg-violet-500"></span>
                                    <h3 class="text-sm font-black text-violet-800 uppercase tracking-widest">Hygiene Factor</h3>
                                </div>
                                <span class="text-xs font-black text-violet-600 bg-violet-100 px-3 py-1 rounded-full" id="tag-hygiene-total">0 Program</span>
                            </div>
                            <div class="p-6 space-y-5">
                                <div>
                                    <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-check-circle"></i> Completed</p>
                                    <ul id="hyg-done" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i> On Progress</p>
                                    <ul id="hyg-ongoing" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span> Lag Programs</p>
                                    <ul id="hyg-lag" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-clock"></i> Not Started</p>
                                    <ul id="hyg-notstart" class="space-y-1 text-xs text-slate-500 pl-4"></ul>
                                </div>
                            </div>
                        </div>

                        <!-- Business As Usual Panel -->
                        <div class="bg-white rounded-[2rem] card-shadow border border-blue-100 overflow-hidden">
                            <div class="flex items-center justify-between px-8 py-5 bg-blue-50 border-b border-blue-100">
                                <div class="flex items-center gap-3">
                                    <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                                    <h3 class="text-sm font-black text-blue-800 uppercase tracking-widest">Business As Usual</h3>
                                </div>
                                <span class="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full" id="tag-bau-total">0 Program</span>
                            </div>
                            <div class="p-6 space-y-5">
                                <div>
                                    <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-check-circle"></i> Completed</p>
                                    <ul id="bau-done" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i> On Progress</p>
                                    <ul id="bau-ongoing" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span> Lag Programs</p>
                                    <ul id="bau-lag" class="space-y-1 text-xs text-slate-700 pl-4"></ul>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="fas fa-clock"></i> Not Started</p>
                                    <ul id="bau-notstart" class="space-y-1 text-xs text-slate-500 pl-4"></ul>
                                </div>
                            </div>
                        </div>

                    </div>
                    <!-- ── END TAG BREAKDOWN PANEL ── -->





                    <!-- Baris 1: Doughnut charts -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

                         <!-- Work Plan Status Distribution -->
                        <div class="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                            <div class="flex items-center justify-between mb-10">
                                <div>
                                    <h3 class="text-lg font-black text-slate-800">Work Plan Status Distribution</h3>
                                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Tracked Progress</p>
                                </div>
                                <i class="fas fa-chart-pie text-slate-200 text-3xl"></i>
                            </div>
                            <div class="chart-container flex justify-center items-center">
                                <div class="w-full max-w-[320px]">
                                    <canvas id="statusChart"></canvas>
                                </div>
                            </div>
                            <div class="mt-6 grid grid-cols-2 gap-4">
                                <div class="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div class="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Done</p>
                                        <p class="text-xl font-black text-slate-800" id="status-done-count">0</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div class="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-blue-700 uppercase tracking-widest">On Progress</p>
                                        <p class="text-xl font-black text-slate-800" id="status-onprogress-count">0</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                                    <div class="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-red-700 uppercase tracking-widest">Lag</p>
                                        <p class="text-xl font-black text-slate-800" id="status-lag-count">0</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div class="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Not Started</p>
                                        <p class="text-xl font-black text-slate-800" id="status-notstarted-count">0</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Program Type Distribution -->
                        <div class="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                            <div class="flex items-center justify-between mb-10">
                                <div>
                                    <h3 class="text-lg font-black text-slate-800">Program Type Distribution</h3>
                                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Hygiene vs Business As Usual</p>
                                </div>
                                <i class="fas fa-tags text-slate-200 text-3xl"></i>
                            </div>
                            <div class="chart-container flex justify-center items-center">
                                <div class="w-full max-w-[320px]">
                                    <canvas id="tagChart"></canvas>
                                </div>
                            </div>
                            <div class="mt-6 grid grid-cols-2 gap-4">
                                <div class="flex items-center gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
                                    <div class="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-violet-700 uppercase tracking-widest">Hygiene</p>
                                        <p class="text-xl font-black text-slate-800" id="tag-hygiene-count">0</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div class="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <div>
                                        <p class="text-[10px] font-black text-blue-700 uppercase tracking-widest">BAU</p>
                                        <p class="text-xl font-black text-slate-800" id="tag-bau-count">0</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>





                    <!-- Baris 2: Bar charts -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">

                        <!-- Pillar Performance Index -->
                        <div class="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                            <div class="flex items-center justify-between mb-10">
                                <div>
                                    <h3 class="text-lg font-black text-slate-800">Pillar Performance Index</h3>
                                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Progress mapping by Framework Pillar</p>
                                </div>
                                <i class="fas fa-layer-group text-slate-200 text-3xl"></i>
                            </div>
                            <div class="chart-container">
                                <canvas id="pillarChart"></canvas>
                            </div>
                        </div>

                        <!-- Team Accountability Matrix -->
                        <div class="bg-white p-10 rounded-3xl card-shadow border border-slate-100">
                            <div class="flex items-center justify-between mb-10">
                                <div>
                                    <h3 class="text-lg font-black text-slate-800">Team Accountability Matrix</h3>
                                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Team Performance</p>
                                </div>
                                <i class="fas fa-user-shield text-slate-200 text-3xl"></i>
                            </div>
                            <div class="chart-container">
                                <canvas id="picProgressChart"></canvas>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- VIEW: ADD / EDIT PROGRAM -->
                <div id="add-program-view" class="hidden space-y-6 fade-in">
                    <div class="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 class="text-lg font-black text-slate-800" id="form-title">ADD NEW PROGRAM</h3>
                                <p class="text-xs text-slate-400 mt-0.5 font-bold">Standardized AML Work Program Integration</p>
                            </div>
                            <div id="edit-badge" class="hidden px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Mode Edit</div>
                        </div>
                        <form id="add-program-form" onsubmit="handleNewProgram(event)" class="p-6 space-y-6">
                            <input type="hidden" id="edit-id" value="">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div class="space-y-2">
                                    <label class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Pillar Allocation</label>
                                    <select id="new-pillar" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-800 font-bold focus:ring-4 focus:ring-cakrawala-blue/10 focus:border-cakrawala-blue transition-all outline-none text-sm">
                                        <option hidden value="">Select Pillar...</option>
                                        <option value="Pilar 1: Pengawasan Aktif">Pilar 1: Pengawasan Aktif</option>
                                        <option value="Pilar 2: Kebijakan & Prosedur">Pilar 2: Kebijakan & Prosedur</option>
                                        <option value="Pilar 3: Pengendalian Intern">Pilar 3: Pengendalian Intern</option>
                                        <option value="Pilar 4: SIM & Pelaporan">Pilar 4: SIM & Pelaporan</option>
                                        <option value="Pilar 5: Sumber Daya Manusia">Pilar 5: Sumber Daya Manusia</option>
                                        <option value="Reporting">Reporting</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Lead PIC</label>
                                    <select type="text" id="new-pic" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-800 font-bold focus:ring-4 focus:ring-cakrawala-blue/10 focus:border-cakrawala-blue transition-all outline-none text-sm">
                                        <option disabled selected hidden value="">Select PIC...</option>
                                        <option value="Domestic & Overseas">Domestic & Overseas</option>
                                        <option value="Konglomerasi Keuangan">Konglomerasi Keuangan</option>
                                        <option value="ATL">ATL</option>
                                        <option value="DRA">DRA</option>
                                        <option value="DVA">DVA</option>
                                        <option value="PSA">PSA</option>
                                    </select>
                                </div>
                                <div class="md:col-span-2 space-y-2">
                                    <label class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Program Title</label>
                                    <input type="text" id="new-name" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-800 font-bold focus:ring-4 focus:ring-cakrawala-blue/10 focus:border-cakrawala-blue transition-all outline-none text-sm" placeholder="Primary Action Statement">
                                </div>
                                <div class="md:col-span-2 space-y-2">
                                    <label class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Deliverables / Success Metrics</label>
                                    <input type="text" id="new-deliverables" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-800 font-bold focus:ring-4 focus:ring-cakrawala-blue/10 focus:border-cakrawala-blue transition-all outline-none text-sm" placeholder="Specific Output Evidence">
                                </div>
                                <div class="md:col-span-2 space-y-2">
                                    <label class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tipe Program</label>
                                    <div class="flex gap-3">
                                        <label class="flex-1 cursor-pointer">
                                            <input type="radio" name="program-tag" id="tag-hygiene" value="Hygiene" required class="sr-only peer">
                                            <div class="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl peer-checked:border-violet-500 peer-checked:bg-violet-50 transition-all">
                                                <div class="w-8 h-8 rounded-lg bg-violet-100 peer-checked:bg-violet-500 flex items-center justify-center transition-all flex-shrink-0">
                                                    <i class="fas fa-shield text-violet-500 peer-checked:text-white text-xs"></i>
                                                </div>
                                                <div>
                                                    <p class="font-black text-sm text-slate-800">Hygiene</p>
                                                    <p class="text-[9px] text-slate-400 font-medium">Program kepatuhan & standar</p>
                                                </div>
                                            </div>
                                        </label>
                                        <label class="flex-1 cursor-pointer">
                                            <input type="radio" name="program-tag" id="tag-bau" value="Business As Usual" required class="sr-only peer">
                                            <div class="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                                                <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center transition-all flex-shrink-0">
                                                    <i class="fas fa-briefcase text-blue-500 text-xs"></i>
                                                </div>
                                                <div>
                                                    <p class="font-black text-sm text-slate-800">Business As Usual</p>
                                                    <p class="text-[9px] text-slate-400 font-medium">Operasional rutin harian</p>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-4 pt-5 border-t border-slate-100">
                                <div class="flex justify-between items-center">
                                    <h4 class="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Individual Sub-Tasks & Timelines</h4>
                                </div>
                                <div id="sub-programs-container" class="space-y-6"></div>
                                <button type="button" onclick="addSubProgramField()" class="px-4 py-2 bg-slate-900 text-white rounded-lg font-black text-xs hover:bg-slate-800 transition-all shadow-lg">
                                    <i class="fas fa-plus mr-1.5"></i> Add Sub-Program
                                </button>
                            </div>

                            <div class="flex justify-end space-x-3 pt-5 border-t border-slate-100">
                                <button type="button" onclick="cancelAddProgram()" class="px-6 py-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 font-bold hover:bg-slate-50 transition-all text-sm">Cancel</button>
                                <button type="submit" class="px-8 py-3 bg-nusantara-blue text-white rounded-xl font-black shadow-xl shadow-cakrawala-blue/20 hover:bg-nusantara-blue transition-all text-sm" id="submit-btn">
                                    Add New Program
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- VIEW: TIMELINE -->
                <div id="timeline-view" class="hidden space-y-5 fade-in">
                    <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                        <h2 class="text-lg font-black text-slate-800 tracking-tight">AML, CFT & CPF Timeline 2026</h2>
                        <div class="flex flex-wrap gap-2">
                            <select id="filter-pic" onchange="applyFilters()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all"></select>
                            <select id="filter-pillar" onchange="applyFilters()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all"></select>
                            <select id="filter-tag" onchange="applyFilters()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all">
                                <option value="all">Semua Tipe</option>
                                <option value="Hygiene">🛡 Hygiene</option>
                                <option value="Business As Usual">💼 Business As Usual</option>
                            </select>
                        </div>
                    </div>

                    <!-- Desktop: scrollable table -->
                    <div id="timeline-table-wrap" class="bg-white rounded-[1.5rem] card-shadow border border-slate-100 overflow-hidden h-[78vh] flex flex-col">
                        <div class="overflow-auto timeline-scroll flex-1">
                            <table class="w-full text-xs border-collapse">
                                <thead class="bg-slate-50 sticky top-0 z-10">
                                    <tr id="month-headers" class="border-b border-slate-200"></tr>
                                    <tr id="week-headers" class="text-[9px] text-slate-400 border-b border-slate-200 uppercase font-black"></tr>
                                </thead>
                                <tbody id="timeline-body" class="divide-y sticky divide-slate-100 font-medium"></tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Mobile: card list view -->
                    <div id="timeline-card-wrap" class="hidden overflow-y-auto pb-4" style="max-height:calc(100vh - 220px);">
                    </div>
                </div>

                <!-- VIEW: PROGRAMS LIST -->
                <div id="input-view" class="hidden space-y-4 fade-in">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                            <h2 class="text-lg font-black text-slate-800 tracking-tight">Progress Update</h2>
                            <p class="text-xs font-bold text-slate-400 tracking-tight">Update your program here</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <select id="update-filter-pic" onchange="renderUpdateList()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all shadow-sm"></select>
                            <select id="update-filter-pillar" onchange="renderUpdateList()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all shadow-sm"></select>
                            <select id="update-filter-tag" onchange="renderUpdateList()" class="bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:border-cakrawala-blue transition-all shadow-sm">
                                <option value="all">Semua Tipe</option>
                                <option value="Hygiene">🛡 Hygiene</option>
                                <option value="Business As Usual">💼 Business As Usual</option>
                            </select>
                        </div>
                    </div>

                    <div class="bg-white rounded-[1.5rem] card-shadow border border-slate-100 overflow-hidden">
                        <div class="p-4 bg-slate-50/50 border-b border-slate-100">
                            <div class="relative max-w-md">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                                <input type="text" id="search-input" onkeyup="renderUpdateList()" placeholder="Cari nama program..." class="w-full bg-white border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:border-cakrawala-blue transition-all outline-none">
                            </div>
                        </div>
                        <ul class="divide-y divide-slate-100" id="update-list"></ul>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Modal Update Checklist -->
    <div id="update-modal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center z-[60] backdrop-blur-md transition-all p-4">
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl mx-auto overflow-hidden flex flex-col" style="max-height:92vh;">
            <div class="p-5 border-b flex justify-between items-start bg-slate-50/50 flex-shrink-0">
                <div class="flex-1 min-w-0 pr-4">
                    <h3 class="text-base font-black text-slate-800 leading-snug" id="modal-title">Verification Hub</h3>
                    <p class="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-[0.25em]" id="modal-subtitle"></p>
                </div>
                <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center bg-white rounded-xl text-slate-300 hover:text-red-500 border border-slate-100 shadow-sm transition-all flex-shrink-0"><i class="fas fa-times text-sm"></i></button>
            </div>

            <!-- Two-column layout -->
            <div class="flex flex-1 overflow-hidden">

                <!-- LEFT: progress update -->
                <div class="flex-1 overflow-y-auto timeline-scroll p-5 space-y-5 border-r border-slate-100" style="min-width:0;">
                    <!-- Progress bar -->
                    <div class="bg-cakrawala-blue p-5 rounded-[1.5rem] text-white shadow-xl shadow-cakrawala-blue/20 flex justify-between items-center">
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-widest opacity-70">Unit Success Rate</p>
                            <h4 class="text-3xl font-black mt-1" id="modal-progress-text">0%</h4>
                        </div>
                        <div class="text-right">
                            <p class="text-[9px] font-black uppercase tracking-widest opacity-70">Weeks Cleared</p>
                            <p class="text-2xl font-black mt-1" id="modal-ratio-text">0 / 0</p>
                        </div>
                    </div>

                    <div id="modal-subprograms-list" class="space-y-4"></div>
                </div>

                <!-- RIGHT: history -->
                <div class="w-80 flex-shrink-0 overflow-y-auto timeline-scroll p-5 bg-slate-50/30" style="min-width:280px;max-width:340px;">
                    <div class="mb-3">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i class="fas fa-history text-slate-400"></i> Riwayat Perubahan
                        </p>
                        <div id="modal-history-container" class="space-y-2 text-xs">
                            <p class="text-slate-400 italic text-xs">Memuat...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100 flex-shrink-0">
                <button onclick="closeModal()" class="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-all uppercase text-xs tracking-widest">Cancel</button>
                <button onclick="saveProgress()" class="px-8 py-2.5 bg-nusantara-blue text-white rounded-[1rem] font-black shadow-xl shadow-cakrawala-blue/20 hover:bg-nusantara-blue transition-all uppercase text-xs tracking-widest">Confirm Update Sub-Program</button>
            </div>
        </div>
    </div>

    <!-- ── Delete Confirmation Modal ──────────────────────────────────── -->
    <div id="delete-confirm-modal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center z-[75] backdrop-blur-sm p-4">
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div class="p-6 text-center">
                <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-trash-alt text-red-500 text-xl"></i>
                </div>
                <h3 class="text-base font-black text-slate-800 mb-1">Hapus Program?</h3>
                <p class="text-xs text-slate-500 mb-2">Tindakan ini tidak dapat dibatalkan.</p>
                <p class="text-xs font-bold text-slate-700 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 mb-5" id="delete-confirm-name"></p>
                <div class="flex gap-3">
                    <button onclick="cancelDeleteModal()" class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all uppercase tracking-widest">
                        Batal
                    </button>
                    <button onclick="confirmDeleteProgram()" class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all uppercase tracking-widest">
                        <i class="fas fa-trash-alt mr-1.5"></i>Hapus
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- ── Change Reason Modal ─────────────────────────────────────────── -->
    <div id="change-reason-modal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center z-[70] backdrop-blur-sm p-4">
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style="max-height:88vh;">
            <div class="p-5 border-b bg-amber-50 flex items-start justify-between flex-shrink-0">
                <div class="flex items-start gap-3">
                    <div class="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-black text-slate-800">Konfirmasi Perubahan</h3>
                        <p class="text-[10px] text-amber-600 mt-0.5 font-bold uppercase tracking-widest" id="change-reason-count">0 perubahan terdeteksi</p>
                    </div>
                </div>
                <button onclick="cancelChangeReasonModal()" class="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 transition-all">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="p-5 overflow-y-auto timeline-scroll flex-1">
                <p class="text-xs text-slate-500 mb-4">Perubahan berikut terdeteksi. Tambahkan alasan perubahan jika diperlukan <span class="text-slate-400">(opsional)</span>.</p>
                <div id="change-reason-body" class="space-y-3"></div>
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
                <button onclick="cancelChangeReasonModal()" class="px-5 py-2 text-slate-400 font-bold hover:text-slate-600 transition-all text-xs uppercase tracking-widest">Batal</button>
                <button onclick="confirmChangeReasonModal()" class="px-7 py-2.5 bg-nusantara-blue text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all">
                    <i class="fas fa-save mr-1.5"></i> Simpan Perubahan
                </button>
            </div>
        </div>
    </div>

    <div id="toast" class="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-[1.2rem] shadow-2xl transform translate-y-32 opacity-0 transition-all duration-500 z-[100] flex items-center border border-slate-700">
        <i class="fas fa-database text-mentari-blue mr-4"></i>
        <span id="toast-msg" class="text-sm font-bold">System Synchronized</span>
    </div>

    <!-- App Logic -->
    <script>
        // ── User context dari PHP session ─────────────────────────────────────
        const CURRENT_USER = <?php echo json_encode($currentUser); ?>;

        async function doLogout() {
            await fetch('api/auth/logout',{method:'POST'});
            window.location.href = 'login';
        }
        function openUserManager() {
            document.getElementById('user-manager-modal').classList.remove('hidden');
            document.getElementById('user-manager-modal').classList.add('flex');
            loadUsers();
        }
        function closeUserManager() {
            document.getElementById('user-manager-modal').classList.add('hidden');
            document.getElementById('user-manager-modal').classList.remove('flex');
        }
    </script>
    <script src="assets/app.js?v=<?php echo filemtime(__DIR__ . '/../../public/assets/app.js'); ?>"></script>


    <!-- ── Kelola User Modal ─────────────────────────────────────────── -->
    <div id="user-manager-modal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center z-[70] backdrop-blur-md p-4">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div class="p-8 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
                <div>
                    <h3 class="text-xl font-black text-slate-800">Kelola User</h3>
                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">User Level Control</p>
                </div>
                <button onclick="closeUserManager()" class="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-300 hover:text-red-500 border border-slate-100 shadow-sm transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6 border-b bg-slate-50/50 flex-shrink-0">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tambah User Baru</p>
                <div class="grid grid-cols-2 gap-3">
                    <input type="text" id="new-username" placeholder="Username" class="bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-cakrawala-blue outline-none transition-all">
                    <input type="text" id="new-fullname" placeholder="Nama Lengkap" class="bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-cakrawala-blue outline-none transition-all">
                    <input type="password" id="new-password" placeholder="Password" class="bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-cakrawala-blue outline-none transition-all">
                    <select id="new-role" class="bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-cakrawala-blue outline-none transition-all">
                        <option value="staff_user">Staff User</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                </div>
                <button onclick="createUser()" class="mt-3 px-6 py-2.5 bg-slate-900 hover:bg-nusantara-blue text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    <i class="fas fa-plus mr-2"></i>Tambah User
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
                <ul id="user-list" class="space-y-2"></ul>
            </div>
        </div>
    </div>

    <!-- ── Session Timeout Modal ─────────────────────────────────────── -->
    <div id="session-timeout-modal" class="fixed inset-0 bg-slate-900/70 hidden items-center justify-center z-[999] backdrop-blur-sm">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm mx-6">
            <div class="p-8 text-center">
                <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <i class="fas fa-clock text-amber-500 text-2xl"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800 mb-2">Sesi Hampir Berakhir</h3>
                <p class="text-slate-500 text-sm mb-6">Anda tidak aktif. Sesi akan berakhir dalam</p>
                <div class="relative w-24 h-24 mx-auto mb-6">
                    <svg class="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" stroke-width="8"/>
                        <circle id="countdown-circle" cx="48" cy="48" r="40" fill="none" stroke="#10b981" stroke-width="8"
                                stroke-dasharray="251.2" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear;"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span id="countdown-number" class="text-3xl font-black text-slate-800">60</span>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="sessionKeepAlive()" class="flex-1 bg-cakrawala-blue hover:bg-nusantara-blue text-white font-black py-3 rounded-2xl transition-all">
                        <i class="fas fa-rotate-right mr-2"></i>Tetap Login
                    </button>
                    <button onclick="doLogout()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-2xl transition-all">
                        <i class="fas fa-right-from-bracket mr-2"></i>Logout
                    </button>
                </div>
            </div>
        </div>
    </div>


    <!-- Mobile Sidebar Overlay -->
    <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden" onclick="toggleMobileSidebar()"></div>

    <!-- Mobile Sidebar Drawer -->
    <div id="mobile-sidebar-drawer" class="fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 transform -translate-x-full transition-transform duration-300 md:hidden flex flex-col shadow-2xl">
        <div class="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-9 h-9 bg-cakrawala-blue rounded-xl flex items-center justify-center">
                    <i class="fas fa-shield text-white"></i>
                </div>
                <div>
                    <h1 class="text-lg font-extrabold tracking-tight text-white">AML<span class="text-mentari-blue">CORE</span></h1>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Management Suite</p>
                </div>
            </div>
            <button onclick="toggleMobileSidebar()" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            <button onclick="switchView('dashboard');toggleMobileSidebar()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm">
                <i class="fas fa-th-large w-5 text-center text-lg"></i>
                <span>Executive Dashboard</span>
            </button>
            <button onclick="switchView('timeline');toggleMobileSidebar()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm">
                <i class="fas fa-stream w-5 text-center text-lg"></i>
                <span>Timeline</span>
            </button>
            <button onclick="switchView('input');toggleMobileSidebar()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm">
                <i class="fas fa-check-double w-5 text-center text-lg"></i>
                <span>Programs</span>
            </button>
            <?php if ($currentUser['role']==='super_admin' || $currentUser['can_add']): ?>
            <div class="pt-4 pb-2 px-2">
                <span class="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                    <?php echo $currentUser['role']==='super_admin' ? 'Administrator' : 'Program'; ?>
                </span>
            </div>
            <button onclick="initAddProgram();toggleMobileSidebar()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm">
                <i class="fas fa-plus-circle w-5 text-center text-lg"></i>
                <span>Tambah Program</span>
            </button>
            <?php endif; ?>
            <?php if ($currentUser['role']==='super_admin'): ?>
            <button onclick="openUserManager();toggleMobileSidebar()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm">
                <i class="fas fa-users-gear w-5 text-center text-lg"></i>
                <span>Kelola User</span>
            </button>
            <?php endif; ?>
        </nav>
        <div class="p-4 border-t border-slate-700/50">
            <a href="?logout=1" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all font-bold text-sm">
                <i class="fas fa-sign-out-alt w-5 text-center text-lg"></i>
                <span>Logout</span>
            </a>
        </div>
    </div>

    <!-- Bottom Navigation: mobile only -->
    <nav class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-slate-200 flex items-stretch h-16 shadow-2xl safe-bottom">
        <button onclick="switchView('dashboard')" data-nav="dashboard"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 transition-all active:scale-95 bottom-nav-btn">
            <i class="fas fa-th-large text-lg"></i>
            <span class="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <button onclick="switchView('timeline')" data-nav="timeline"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 transition-all active:scale-95 bottom-nav-btn">
            <i class="fas fa-stream text-lg"></i>
            <span class="text-[9px] font-black uppercase tracking-widest">Timeline</span>
        </button>
        <button onclick="switchView('input')" data-nav="input"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 transition-all active:scale-95 bottom-nav-btn">
            <i class="fas fa-check-double text-lg"></i>
            <span class="text-[9px] font-black uppercase tracking-widest">Programs</span>
        </button>
        <?php if ($currentUser['role']==='super_admin' || $currentUser['can_add']): ?>
        <button onclick="initAddProgram()" data-nav="add-program"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 transition-all active:scale-95 bottom-nav-btn">
            <i class="fas fa-plus-circle text-lg"></i>
            <span class="text-[9px] font-black uppercase tracking-widest">Add</span>
        </button>
        <?php endif; ?>
    </nav>

</body>
</html>