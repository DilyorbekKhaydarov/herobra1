        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, onSnapshot, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        const ADMIN_EMAILS = ['dilyorbekxaydarov78@gmail.com', 'ilyosbekhaydarov28@gmail.com'];

        let app, auth, db, currentUser = null;
        let currentAppUserId = null; // Maxsus avtorizatsiya uchun

        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            initAuth();
        } catch (e) {
            console.error("Firebase init failed", e);
        }

        async function initAuth() {
            try {
                await auth.authStateReady();
                if (!auth.currentUser) {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                }
                currentUser = auth.currentUser;
                
                // Qurilma sessiyasini (LocalStorage orqali ishonchliroq) tiklash
                const storedUserId = localStorage.getItem('es_app_user_id');
                if (storedUserId) {
                    currentAppUserId = storedUserId;
                    setupPresence();
                } else {
                    const deviceSessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'device_sessions', currentUser.uid);
                    const sessionSnap = await getDoc(deviceSessionRef);
                    if (sessionSnap.exists() && sessionSnap.data().activeUserId) {
                        currentAppUserId = sessionSnap.data().activeUserId;
                        localStorage.setItem('es_app_user_id', currentAppUserId);
                        setupPresence();
                    }
                }

                // Foydalanuvchilar ro'yxatini kuzatishni boshlash
                listenToCommunity();
            } catch(e) {
                console.error("Auth error", e);
            }
        }

        function setupPresence() {
            if (!currentAppUserId) return;
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentAppUserId);
            
            // Dasturga kirganda Onlayn qilish
            updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }).catch(() => {});

            // Saytdan chiqib ketayotganda Oflayn qilish
            window.addEventListener('beforeunload', () => {
                updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
            });
        }

        window.handleAuth = async function(e) {
            e.preventDefault();
            const btn = document.getElementById('auth-submit-btn');
            const msgBox = document.getElementById('auth-message');
            const originalText = btn.innerHTML;
            
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Kuting...';
            btn.disabled = true;
            msgBox.classList.add('hidden');
            
            const showMsg = (msg, isError = false) => {
                msgBox.innerHTML = msg;
                msgBox.className = `p-3 rounded-lg border text-sm mt-4 text-center ${isError ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-green-900/20 border-green-500/50 text-green-400'}`;
                msgBox.classList.remove('hidden');
            };

            try {
                // Pochtani Firestore uchun xavfsiz ID formatiga o'tkazish
                const safeUserId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', safeUserId);
                const deviceSessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'device_sessions', currentUser.uid);

                if (isLoginMode) {
                    // Simulyatsiya qilingan Login jarayoni
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists() && docSnap.data().password === password) {
                        btn.innerHTML = '<i class="ph ph-check-circle text-xl"></i> Muvaffaqiyatli!';
                        currentAppUserId = safeUserId;
                        localStorage.setItem('es_app_user_id', safeUserId);
                        await setDoc(deviceSessionRef, { activeUserId: safeUserId }); // Sessiyani saqlash
                        setupPresence();
                        await updateDoc(userRef, { isOnline: true });
                        
                        setTimeout(() => {
                            switchView('community');
                            document.getElementById('reg-password').value = '';
                        }, 1000);
                    } else {
                        showMsg("Pochta yoki parol noto'g'ri.", true);
                    }
                } else {
                    // Simulyatsiya qilingan Registratsiya jarayoni
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        showMsg("Bu pochta allaqachon ro'yxatdan o'tgan. Iltimos, Tizimga kiring.", true);
                    } else {
                        btn.innerHTML = '<i class="ph ph-envelope text-xl"></i> Tasdiqlanmoqda...';
                        
                        await setDoc(userRef, {
                            name: name,
                            email: email.toLowerCase(),
                            password: password, // Demo uchun bazada saqlanadi
                            role: 'student',
                            score: 0,
                            isOnline: true,
                            joinedAt: serverTimestamp(),
                            lastSeen: serverTimestamp()
                        });
                        
                        currentAppUserId = safeUserId;
                        localStorage.setItem('es_app_user_id', safeUserId);
                        await setDoc(deviceSessionRef, { activeUserId: safeUserId }); // Sessiyani saqlash
                        setupPresence();
                        
                        showMsg("Hisob muvaffaqiyatli yaratildi! Tizimga kirdingiz.");
                        btn.innerHTML = '<i class="ph ph-check-circle text-xl"></i> Tayyor!';
                        
                        setTimeout(() => {
                            switchView('community');
                            document.getElementById('reg-password').value = '';
                        }, 1500);
                    }
                }
            } catch (err) {
                console.error(err);
                showMsg("Xatolik yuz berdi: " + err.message, true);
            } finally {
                if (msgBox.classList.contains('bg-red-900/20')) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        };

        window.updateUserScore = async function(pointsToAdd) {
            if (!currentAppUserId) return;
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentAppUserId);
            try {
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    const currentScore = docSnap.data().score || 0;
                    await updateDoc(userRef, { score: currentScore + pointsToAdd });
                }
            } catch(e) { console.error(e); }
        };

        function listenToCommunity() {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            onSnapshot(usersRef, (snapshot) => {
                const users = [];
                snapshot.forEach(doc => {
                    users.push({ id: doc.id, ...doc.data() });
                });
                
                // Joriy foydalanuvchining adminligini tekshirish va UI ni yangilash
                if (currentAppUserId) {
                    const myUserData = users.find(u => u.id === currentAppUserId);
                    if (myUserData) {
                        window.updateNavAuthUI(myUserData);
                        if (ADMIN_EMAILS.includes(myUserData.email) || myUserData.role === 'admin') {
                            window.setAdminStatus(true);
                        } else {
                            window.setAdminStatus(false);
                        }
                    } else {
                        window.updateNavAuthUI(null);
                        window.setAdminStatus(false);
                    }
                } else {
                    window.updateNavAuthUI(null);
                    window.setAdminStatus(false);
                }
                
                renderCommunityUI(users);
                renderLeaderboardUI(users);
                renderAdminUI(users);
            }, (error) => {
                console.error("Firestore error:", error);
            });
        }

        function renderCommunityUI(users) {
            const container = document.getElementById('community-list');
            if (!container) return;
            container.innerHTML = '';
            
            const validUsers = users.filter(u => u.name && u.role);

            if (validUsers.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Hali hech kim ro\'yxatdan o\'tmagan. Registratsiya orqali birinchi bo\'ling!</div>';
                return;
            }

            validUsers.forEach(u => {
                const isOnline = u.isOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-500';
                const statusText = u.isOnline ? 'Onlayn' : 'Oflayn';
                
                let roleBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                let roleText = "O'quvchi";
                if (u.role === 'teacher') {
                    roleBadge = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                    roleText = "O'qituvchi";
                } else if (u.role === 'admin') {
                    roleBadge = 'bg-red-500/20 text-red-400 border-red-500/30';
                    roleText = "Admin";
                }

                container.innerHTML += `
                    <div class="bg-dark-800 p-5 rounded-xl border border-dark-700 hover:border-gold-500/30 transition flex items-center gap-4">
                        <div class="relative">
                            <div class="w-12 h-12 bg-dark-900 rounded-full flex items-center justify-center border border-gold-500/50 text-gold-500 font-bold text-xl uppercase shadow-inner">
                                ${u.name.charAt(0)}
                            </div>
                            <div class="absolute bottom-0 right-0 w-3.5 h-3.5 ${isOnline} rounded-full border-2 border-dark-800 transition-colors duration-500"></div>
                        </div>
                        <div class="flex-grow">
                            <h4 class="text-white font-bold text-lg truncate w-32 sm:w-48">${u.name}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs px-2 py-0.5 rounded border ${roleBadge}">${roleText}</span>
                                <span class="text-xs text-gray-500">${statusText}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        function renderLeaderboardUI(users) {
            const container = document.getElementById('leaderboard-list');
            if (!container) return;
            
            const validUsers = users.filter(u => u.name && u.role);
            const sorted = [...validUsers].sort((a, b) => (b.score || 0) - (a.score || 0));
            
            container.innerHTML = '';
            
            if (sorted.length === 0) {
                container.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-6">Reyting bo\'sh</td></tr>';
                return;
            }

            sorted.forEach((u, index) => {
                let rankBadge = `<span class="text-gray-400 font-bold">${index + 1}</span>`;
                if (index === 0) rankBadge = `<i class="ph ph-medal text-2xl text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"></i>`;
                else if (index === 1) rankBadge = `<i class="ph ph-medal text-2xl text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]"></i>`;
                else if (index === 2) rankBadge = `<i class="ph ph-medal text-2xl text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]"></i>`;

                const roleText = u.role === 'teacher' ? "O'qituvchi" : "O'quvchi";

                container.innerHTML += `
                    <tr class="hover:bg-dark-800/50 transition border-b border-dark-700/50 last:border-0">
                        <td class="p-4 w-16 text-center">${rankBadge}</td>
                        <td class="p-4 text-white font-medium flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-dark-900 flex items-center justify-center text-xs text-gold-500 border border-dark-700 uppercase shadow-inner">
                                ${u.name.charAt(0)}
                            </div>
                            <span class="truncate w-24 sm:w-auto">${u.name}</span>
                        </td>
                        <td class="p-4 text-gray-400 text-sm hidden sm:table-cell">${roleText}</td>
                        <td class="p-4 text-right">
                            <span class="bg-gold-500/10 text-gold-400 border border-gold-500/30 px-3 py-1 rounded-full font-bold shadow-[0_0_10px_rgba(212,175,55,0.1)]">
                                ${u.score || 0}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }

        function renderAdminUI(users) {
            const container = document.getElementById('admin-users-list');
            if (!container) return;
            
            const validUsers = users.filter(u => u.name);
            container.innerHTML = '';
            
            if (validUsers.length === 0) {
                container.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-6">Foydalanuvchilar topilmadi</td></tr>';
                return;
            }

            validUsers.forEach(u => {
                const isAdmin = u.role === 'admin';
                const isTeacher = u.role === 'teacher';
                
                let roleText = "O'quvchi";
                let roleBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                if (isTeacher) { roleText = "O'qituvchi"; roleBadge = 'bg-purple-500/20 text-purple-400 border-purple-500/30'; }
                if (isAdmin) { roleText = "Admin"; roleBadge = 'bg-red-500/20 text-red-400 border-red-500/30'; }
                
                container.innerHTML += `
                    <tr class="hover:bg-dark-800/50 transition border-b border-dark-700/50 last:border-0">
                        <td class="p-4 text-white font-medium flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-dark-900 flex items-center justify-center text-sm text-gold-500 border border-dark-700 uppercase">
                                ${u.name.charAt(0)}
                            </div>
                            <span class="truncate w-32 sm:w-auto font-bold">${u.name}</span>
                        </td>
                        <td class="p-4 text-gray-400 text-sm truncate max-w-[150px]">${u.email || 'Kiritilmagan'}</td>
                        <td class="p-4">
                            <span class="text-xs px-2 py-1 rounded border ${roleBadge}">${roleText}</span>
                        </td>
                        <td class="p-4 text-right space-x-2">
                            ${!isAdmin && isTeacher 
                                ? `<button onclick="changeUserRole('${u.id}', 'student')" class="px-3 py-1.5 bg-dark-900 border border-dark-700 text-gray-400 hover:text-white hover:border-gray-500 rounded text-xs transition mb-1">O'quvchi qilish</button>`
                                : ''
                            }
                            ${!isAdmin && !isTeacher 
                                ? `<button onclick="changeUserRole('${u.id}', 'teacher')" class="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 hover:bg-gold-500 hover:text-dark-900 rounded text-xs transition font-medium mb-1">O'qituvchi qilish</button>`
                                : ''
                            }
                            ${!isAdmin
                                ? `<button onclick="changeUserRole('${u.id}', 'admin')" class="px-3 py-1.5 bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white rounded text-xs transition font-medium mb-1">Admin qilish</button>`
                                : `<span class="px-3 py-1.5 text-xs text-gray-500">Asosiy Admin</span>`
                            }
                        </td>
                    </tr>
                `;
            });
        }

        window.changeUserRole = async function(userId, newRole) {
            if (!currentUser) return;
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
            try {
                // UI changes automatically due to real-time snapshot
                await updateDoc(userRef, { role: newRole });
            } catch(e) {
                console.error("Rolni o'zgartirishda xatolik:", e);
            }
        }

        window.logout = async function() {
            if (!currentAppUserId || !currentUser) return;
            const deviceSessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'device_sessions', currentUser.uid);
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentAppUserId);
            
            try {
                // Bazadan sessiyani o'chirish va oflayn qilish
                await deleteDoc(deviceSessionRef);
                await updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
                localStorage.removeItem('es_app_user_id'); // LocalStorage'dan tozalash
            } catch(e) {
                console.error(e);
            }
            
            currentAppUserId = null;
            window.setAdminStatus(false);
            window.updateNavAuthUI(null);
            switchView('home');
        };
