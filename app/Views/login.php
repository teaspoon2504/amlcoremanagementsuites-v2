<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Login — AML Core</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config={theme:{extend:{colors:{'nusantara-blue':'#0857C3','cakrawala-blue':'#307FE2','mentari-blue':'#71C5E8'}}}}</script>
    <link rel="stylesheet" href="assets/libs/fa-all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        body{font-family:'Plus Jakarta Sans',sans-serif;}
        .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);}
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-cakrawala-blue/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-nusantara-blue/10 rounded-full blur-3xl"></div>
    </div>
    <div class="relative w-full max-w-md">
        <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-cakrawala-blue rounded-2xl shadow-2xl shadow-cakrawala-blue/30 mb-4">
                <i class="fas fa-shield-halved text-white text-2xl"></i>
            </div>
            <h1 class="text-3xl font-extrabold text-white">AML<span class="text-mentari-blue">CORE</span></h1>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">Management Suite 2026</p>
        </div>
        <div class="glass rounded-3xl p-8 shadow-2xl">
            <h2 class="text-xl font-black text-white mb-1">Selamat Datang</h2>
            <p class="text-slate-400 text-sm mb-8">Masuk untuk melanjutkan ke dashboard</p>
            <div id="err" class="hidden mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
                <i class="fas fa-circle-exclamation text-red-400 flex-shrink-0"></i>
                <p class="text-red-300 text-sm font-bold" id="err-msg"></p>
            </div>
            <div class="space-y-5">
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Username</label>
                    <div class="relative">
                        <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                        <input type="text" id="username" placeholder="Masukkan username" onkeydown="if(event.key==='Enter')doLogin()"
                               class="w-full bg-slate-800/60 border border-slate-700 rounded-2xl py-4 pl-11 pr-4 text-white font-bold text-sm placeholder-slate-600 focus:outline-none focus:border-cakrawala-blue transition-all">
                    </div>
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                        <input type="password" id="password" placeholder="Masukkan password" onkeydown="if(event.key==='Enter')doLogin()"
                               class="w-full bg-slate-800/60 border border-slate-700 rounded-2xl py-4 pl-11 pr-12 text-white font-bold text-sm placeholder-slate-600 focus:outline-none focus:border-cakrawala-blue transition-all">
                        <button onclick="togglePass()" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            <i id="eye" class="fas fa-eye text-sm"></i>
                        </button>
                    </div>
                </div>
                <button onclick="doLogin()" id="btn"
                        class="w-full bg-cakrawala-blue hover:bg-nusantara-blue text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-cakrawala-blue/20 mt-2">
                    <i class="fas fa-right-to-bracket"></i><span>Masuk ke Dashboard</span>
                </button>
            </div>
        </div>
        <p class="text-center text-slate-600 text-xs mt-6">AML Core &copy; 2026</p>
    </div>
    <script>
        function togglePass(){const i=document.getElementById('password'),e=document.getElementById('eye');i.type=i.type==='password'?'text':'password';e.className=i.type==='password'?'fas fa-eye text-sm':'fas fa-eye-slash text-sm';}
        function showErr(m){document.getElementById('err-msg').textContent=m;document.getElementById('err').classList.remove('hidden');}
        async function doLogin(){
            const u=document.getElementById('username').value.trim(),p=document.getElementById('password').value,btn=document.getElementById('btn');
            document.getElementById('err').classList.add('hidden');
            if(!u||!p){showErr('Username dan password wajib diisi');return;}
            btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> <span>Memverifikasi...</span>';
            try{
                const res=await fetch('api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
                const d=await res.json();
                if(res.ok&&d.success){btn.innerHTML='<i class="fas fa-check"></i> <span>Berhasil!</span>';btn.classList.replace('bg-cakrawala-blue','bg-emerald-600');setTimeout(()=>window.location.href='./',600);}
                else{showErr(d.error||'Login gagal');btn.disabled=false;btn.innerHTML='<i class="fas fa-right-to-bracket"></i><span>Masuk ke Dashboard</span>';}
            }catch(e){showErr('Tidak dapat terhubung ke server');btn.disabled=false;btn.innerHTML='<i class="fas fa-right-to-bracket"></i><span>Masuk ke Dashboard</span>';}
        }
    </script>
</body>
</html>
