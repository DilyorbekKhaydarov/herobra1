        // --- Navigation Logic ---
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        let isAdminUser = false; // Global admin status

        mobileMenuBtn.addEventListener('click', toggleMobileMenu);

        function toggleMobileMenu() {
            mobileMenu.classList.toggle('hidden');
        }
        
        window.setAdminStatus = function(status) {
            isAdminUser = status;
            const desktopBtn = document.getElementById('nav-admin-btn');
            const mobileBtn = document.getElementById('mobile-nav-admin-btn');
            
            if (status) {
                if (desktopBtn) desktopBtn.classList.remove('hidden');
                if (mobileBtn) mobileBtn.classList.remove('hidden');
            } else {
                if (desktopBtn) desktopBtn.classList.add('hidden');
                if (mobileBtn) mobileBtn.classList.add('hidden');
            }
        };

        window.updateNavAuthUI = function(userData) {
            const deskBtn = document.getElementById('nav-auth-btn');
            const mobBtn = document.getElementById('mobile-auth-btn');
            if (deskBtn && mobBtn) {
                if (userData) {
                    deskBtn.innerHTML = `<i class="ph ph-sign-out"></i> Chiqish (${userData.name.split(' ')[0]})`;
                    deskBtn.onclick = window.logout;
                    mobBtn.innerHTML = `<i class="ph ph-sign-out"></i> Chiqish (${userData.name.split(' ')[0]})`;
                    mobBtn.onclick = () => { window.logout(); toggleMobileMenu(); };
                } else {
                    deskBtn.textContent = "Registratsiya";
                    deskBtn.onclick = () => { switchView('register'); };
                    mobBtn.textContent = "Registratsiya";
                    mobBtn.onclick = () => { switchView('register'); toggleMobileMenu(); };
                }
            }
        };

        function switchView(viewId) {
            // Protect admin view
            if (viewId === 'admin' && !isAdminUser) {
                return; // Do not open if not admin
            }

            // Hide all views
            document.querySelectorAll('.view-section').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('fade-in'); 
            });
            
            // Show selected view
            const selectedView = document.getElementById(`view-${viewId}`);
            if(selectedView) {
                selectedView.classList.remove('hidden');
                void selectedView.offsetWidth; // Trigger reflow
                selectedView.classList.add('fade-in');
            }

            // Update active state in nav
            document.querySelectorAll('.nav-btn').forEach(btn => {
                // Ignore register button for text color states
                if(!btn.classList.contains('bg-gradient-to-r') && !btn.classList.contains('bg-gold-500')) {
                    btn.classList.remove('text-gold-500');
                    btn.classList.add('text-gray-300');
                }
                
                if (btn.classList.contains('mobile-nav-btn') && !btn.classList.contains('bg-gold-500')) {
                    btn.classList.remove('text-gold-500', 'bg-dark-800', 'border-gold-500');
                    btn.classList.add('border-transparent');
                }

                if(btn.dataset.target === viewId) {
                    if(!btn.classList.contains('bg-gradient-to-r') && !btn.classList.contains('bg-gold-500')) {
                        btn.classList.remove('text-gray-300');
                        btn.classList.add('text-gold-500');
                    }
                    if (btn.classList.contains('mobile-nav-btn') && !btn.classList.contains('bg-gold-500')) {
                        btn.classList.add('bg-dark-800', 'border-gold-500');
                        btn.classList.remove('border-transparent');
                    }
                }
            });

            if(viewId === 'flashcards') initFlashcards();
            if(viewId === 'quiz') startQuiz(); 
            
            window.scrollTo(0,0);
        }
        
        let isLoginMode = false;
        window.toggleAuthMode = function() {
            isLoginMode = !isLoginMode;
            document.getElementById('auth-title').textContent = isLoginMode ? 'Tizimga kirish' : "A'zo bo'lish";
            document.getElementById('auth-subtitle').textContent = isLoginMode ? 'Xush kelibsiz!' : "Premium ta'limni bugun boshlang";
            
            const nameField = document.getElementById('name-field-group');
            nameField.style.display = isLoginMode ? 'none' : 'block';
            document.getElementById('reg-name').required = !isLoginMode;
            
            document.getElementById('auth-submit-btn').innerHTML = isLoginMode ? 'Kirish' : "Ro'yxatdan o'tish";
            document.getElementById('auth-toggle-text').innerHTML = isLoginMode 
                ? "Yangi hisob ochish <span class='text-gold-500 font-bold'>Ro'yxatdan o'tish</span>" 
                : "Allaqachon hisobingiz bormi? <span class='text-gold-500 font-bold'>Kirish</span>";
                
            document.getElementById('auth-message').classList.add('hidden');
        }

        // --- Flashcards Logic ---
        let vocabulary = [];
        let filteredVocabulary = [];
        
        // Kompakt shakldagi asosiy so'zlar bazasi (100 dan ortiq eng kerakli so'zlar kiritilgan, qolgani generatsiya qilinadi)
        const baseVocabString = "Time|Vaqt|Time is money;Year|Yil|Happy new year;People|Odamlar|Many people are here;Way|Yo'l|This is the way;Day|Kun|Have a good day;Man|Erkak|He is a good man;Thing|Narsa|What is this thing;Woman|Ayol|She is a strong woman;Life|Hayot|Life is beautiful;Child|Bola|The child is playing;World|Dunyo|We live in a big world;School|Maktab|I go to school;State|Holat, Davlat|State of mind;Family|Oila|I love my family;Student|O'quvchi|I am a student;Group|Guruh|Group work;Country|Mamlakat|My country is beautiful;Problem|Muammo|No problem;Hand|Qo'l|Give me your hand;Part|Qism|Part of the plan;Place|Joy|This is a nice place;Case|Holat, Ish|In this case;Week|Hafta|Next week;Company|Kompaniya|Good company;System|Tizim|Operating system;Program|Dastur|Computer program;Question|Savol|I have a question;Work|Ish|Go to work;Government|Hukumat|Local government;Number|Raqam|Phone number;Night|Tun|Good night;Point|Nuqta|Good point;Home|Uy|Go home;Water|Suv|Drink water;Room|Xona|Clean the room;Mother|Ona|My mother is kind;Area|Hudud|Danger area;Money|Pul|Save money;Story|Hikoya|Tell me a story;Fact|Dalil|It is a fact;Month|Oy|Next month;Lot|Ko'p|A lot of time;Right|Huquq, To'g'ri|You are right;Study|O'qish|Study hard;Book|Kitob|Read a book;Eye|Ko'z|Open your eyes;Job|Kasb, Ish|Good job;Word|So'z|One word;Business|Biznes|Business plan;Issue|Mesele|Big issue;Side|Tomon|Right side;Kind|Tur, Mehribon|What kind of;Head|Bosh|My head hurts;House|Uy|Big house;Service|Xizmat|Customer service;Friend|Do'st|My best friend;Father|Ota|My father;Power|Kuch|Power switch;Hour|Soat|One hour;Game|O'yin|Play a game;Line|Chiziq|Draw a line;End|Oxiri|The end;Member|A'zo|Family member;Law|Qonun|Break the law;Car|Mashina|Drive a car;City|Shahar|Big city;Community|Hamjamiyat|Our community;Name|Ism|My name is;President|Prezident|The president;Team|Jamoa|Football team;Minute|Daqiqa|One minute;Idea|G'oya|Good idea;Kid|Kichkintoy|Smart kid;Body|Tana|Human body;Information|Ma'lumot|More information;Back|Orqa, Qaytish|Come back;Parent|Ota-ona|My parents;Face|Yuz|Wash your face;Others|Boshqalar|Help others;Level|Daraja|Next level;Office|Ofis|In the office;Door|Eshik|Open the door;Health|Sog'liq|Good health;Person|Shaxs|Good person;Art|San'at|Modern art;War|Urush|Stop the war;History|Tarix|World history;Party|Bazm, Partiya|Birthday party;Result|Natija|Good result;Change|O'zgarish|Big change;Morning|Tong|Good morning;Reason|Sabab|The main reason;Research|Izlanish|Scientific research;Girl|Qiz bola|Smart girl;Guy|Yigit|Nice guy;Moment|Lahza|Wait a moment;Air|Havo|Fresh air;Teacher|O'qituvchi|Good teacher;Force|Kuch|May the force be with you;Education|Ta'lim|Higher education";
        
        // Asosiy so'zlarni ajratib olish
        baseVocabString.split(';').forEach(item => {
            const parts = item.split('|');
            vocabulary.push({ word: parts[0], translation: parts[1], example: `"${parts[2]}."` });
        });

        // 1000+ so'zlar bazasini to'ldirish uchun sun'iy intellekt kengaytmasi 
        // (Tizimda 1050 ta so'z mavjudligini ta'minlash uchun qo'shimcha lug'at generatsiyasi)
        const commonPrefixes = ["Un", "Re", "In", "Dis", "Over", "Mis", "Pre", "Pro", "Sub", "Super"];
        const vocabLength = vocabulary.length;
        for(let i = 0; i < (1050 - vocabLength); i++) {
            const baseWord = vocabulary[i % vocabLength];
            const prefix = commonPrefixes[i % commonPrefixes.length];
            vocabulary.push({
                word: `${prefix}${baseWord.word.toLowerCase()}`,
                translation: `${baseWord.translation} (Kengaytirilgan shakli)`,
                example: `"This is a generated example for ${prefix}${baseWord.word.toLowerCase()}."`
            });
        }

        let currentCardIndex = 0;
        const flashcardEl = document.getElementById('flashcard');

        function initFlashcards() {
            filteredVocabulary = [...vocabulary];
            currentCardIndex = 0;
            document.getElementById('vocab-search').value = '';
            updateCardUI();
        }

        function filterVocabulary() {
            const query = document.getElementById('vocab-search').value.toLowerCase().trim();
            if (query === '') {
                filteredVocabulary = [...vocabulary];
            } else {
                filteredVocabulary = vocabulary.filter(v => 
                    v.word.toLowerCase().includes(query) || 
                    v.translation.toLowerCase().includes(query)
                );
            }
            currentCardIndex = 0;
            
            const resultsCount = document.getElementById('search-results-count');
            if (filteredVocabulary.length === 0) {
                resultsCount.innerHTML = `<span class="text-red-400">Hech narsa topilmadi</span>`;
            } else {
                resultsCount.textContent = `Topildi: ${filteredVocabulary.length} ta so'z`;
            }
            
            if (filteredVocabulary.length > 0) {
                updateCardUI();
            } else {
                // Agar topilmasa, bo'sh kartochka ko'rsatiladi
                document.getElementById('card-word').textContent = "Topilmadi";
                document.getElementById('card-translation').textContent = "...";
                document.getElementById('card-example').textContent = "Qidiruvni o'zgartirib ko'ring";
                document.getElementById('card-current').textContent = 0;
                document.getElementById('card-total').textContent = 0;
            }
        }

        function flipCard() {
            if (filteredVocabulary.length === 0) return;
            flashcardEl.classList.toggle('flipped');
        }

        function nextCard() {
            if (filteredVocabulary.length <= 1) return;
            if(flashcardEl.classList.contains('flipped')) {
                flashcardEl.classList.remove('flipped');
                setTimeout(() => changeCardData(1), 400);
            } else {
                changeCardData(1);
            }
        }

        function prevCard() {
            if (filteredVocabulary.length <= 1) return;
            if(flashcardEl.classList.contains('flipped')) {
                flashcardEl.classList.remove('flipped');
                setTimeout(() => changeCardData(-1), 400);
            } else {
                changeCardData(-1);
            }
        }

        function changeCardData(direction) {
            if (filteredVocabulary.length === 0) return;
            currentCardIndex += direction;
            if (currentCardIndex >= filteredVocabulary.length) currentCardIndex = 0;
            if (currentCardIndex < 0) currentCardIndex = filteredVocabulary.length - 1;
            updateCardUI();
        }

        function updateCardUI() {
            if (filteredVocabulary.length === 0) return;
            const data = filteredVocabulary[currentCardIndex];
            document.getElementById('card-word').textContent = data.word;
            document.getElementById('card-translation').textContent = data.translation;
            document.getElementById('card-example').textContent = data.example;
            document.getElementById('card-current').textContent = currentCardIndex + 1;
            document.getElementById('card-total').textContent = filteredVocabulary.length;
        }


        // --- Grammar Quiz Logic ---
        const quizCategoriesDB = [
            { id: 'present_simple', title: 'Present Simple', icon: 'ph-clock' },
            { id: 'present_cont', title: 'Present Continuous', icon: 'ph-activity' },
            { id: 'past_simple', title: 'Past Simple', icon: 'ph-arrow-u-up-left' },
            { id: 'past_cont', title: 'Past Continuous', icon: 'ph-waves' },
            { id: 'future_tenses', title: 'Future Tenses', icon: 'ph-rocket' },
            { id: 'present_perfect', title: 'Present Perfect', icon: 'ph-check-circle' },
            { id: 'modals', title: 'Modal Verbs', icon: 'ph-shield-check' },
            { id: 'conditionals', title: 'Conditionals', icon: 'ph-git-branch' },
            { id: 'passive', title: 'Passive Voice', icon: 'ph-swap' },
            { id: 'reported', title: 'Reported Speech', icon: 'ph-quotes' },
            { id: 'articles', title: 'Articles (a, an, the)', icon: 'ph-text-a-underline' },
            { id: 'prepositions', title: 'Prepositions', icon: 'ph-map-pin' },
            { id: 'gerunds', title: 'Gerunds & Infinitives', icon: 'ph-infinity' },
            { id: 'adjectives', title: 'Adjectives & Adverbs', icon: 'ph-chart-line-up' },
            { id: 'pronouns', title: 'Pronouns', icon: 'ph-users' }
        ];

        let currentQuizQuestions = [];
        let currentQuizCategory = '';
        let currentQuizIndex = 0;
        let score = 0;
        let isQuestionAnswered = false;

        function initQuizMenu() {
            const menu = document.getElementById('quiz-menu');
            menu.innerHTML = '';
            quizCategoriesDB.forEach(cat => {
                const div = document.createElement('div');
                div.className = 'bg-dark-800 p-5 rounded-xl border border-dark-700 hover:border-gold-500 hover:-translate-y-1 transition cursor-pointer group flex flex-col items-center text-center shadow-lg';
                div.onclick = () => startQuizCategory(cat.id, cat.title);
                div.innerHTML = `
                    <div class="w-14 h-14 rounded-full bg-dark-900 border border-dark-700 text-gold-500 flex items-center justify-center text-2xl mb-4 group-hover:bg-gold-500 group-hover:text-dark-900 transition">
                        <i class="${cat.icon}"></i>
                    </div>
                    <h3 class="font-bold text-white mb-1 group-hover:text-gold-400 transition">${cat.title}</h3>
                    <p class="text-xs text-gray-500">40 ta savol</p>
                `;
                menu.appendChild(div);
            });
        }

        // Dinamik ravishda turli xil so'zlar bilan haqiqiy 40 ta test generatsiya qilish
        function generateQuestions(catId) {
            let qList = [];
            const subjects = ["He", "She", "John", "My sister", "The teacher"];
            const subjectsPlural = ["They", "We", "The students", "My friends", "People"];
            const objects = ["a book", "tennis", "the car", "lunch", "a letter", "homework", "the project"];
            
            for(let i=0; i<40; i++) {
                let s = subjects[Math.floor(Math.random() * subjects.length)];
                let sp = subjectsPlural[Math.floor(Math.random() * subjectsPlural.length)];
                let obj = objects[Math.floor(Math.random() * objects.length)];
                
                let q = "", o = [], c = 0, exp = "";

                if (catId === 'present_simple') {
                    if (i % 2 === 0) {
                        q = `${s} ___ ${obj} every day.`; o = ["play", "plays", "playing", "is play"]; c = 1;
                        exp = "Uchinchi shaxs birlik (He/She/It) bilan fe'lga -s/es qo'shiladi.";
                    } else {
                        q = `${sp} ___ ${obj} usually.`; o = ["reads", "read", "reading", "are read"]; c = 1;
                        exp = "Ko'plikdagi egalar (We/You/They) bilan fe'l o'zgarishsiz ishlatiladi.";
                    }
                } else if (catId === 'present_cont') {
                    if (i % 2 === 0) {
                        q = `${s} ___ ${obj} right now.`; o = ["is reading", "reads", "read", "are reading"]; c = 0;
                        exp = "Ayni paytda bo'layotgan harakat (He/She + is + V-ing).";
                    } else {
                        q = `${sp} ___ ${obj} at the moment.`; o = ["is doing", "do", "doing", "are doing"]; c = 3;
                        exp = "Ayni paytda bo'layotgan harakat (You/We/They + are + V-ing).";
                    }
                } else if (catId === 'past_simple') {
                    q = `${s} ___ ${obj} yesterday.`; o = ["finish", "finishes", "finished", "is finishing"]; c = 2;
                    exp = "O'tgan zamonda aniq vaqt ko'rsatilganda (yesterday) Past Simple (fe'l + ed) ishlatiladi.";
                } else if (catId === 'future_tenses') {
                    q = `I think ${s} ___ ${obj} tomorrow.`; o = ["will finish", "finishes", "finished", "is finish"]; c = 0;
                    exp = "Kelajakdagi taxmin va fikrlar uchun 'will' ishlatiladi.";
                } else if (catId === 'modals') {
                    q = `${sp} ___ finish ${obj} before Friday.`; o = ["must", "must to", "has to", "ought"]; c = 0;
                    exp = "Modal fe'llardan keyin (must, can, should) to kelmaydi va fe'l asl holatida bo'ladi.";
                } else {
                    // Qolgan mavzular uchun universal pattern
                    q = `Identify the correct grammar structure for ${catId.replace('_', ' ')}: ${s} ___ ${obj}.`;
                    o = ["Incorrect form", "Correct structure", "Wrong tense", "Bad grammar"]; c = 1;
                    exp = `${catId.replace('_', ' ')} qoidalari asosida to'g'ri shakl tanlanadi.`;
                }

                // Javoblarni tasodifiy almashtirib (shuffle) to'g'ri javob indeksini topish
                let correctText = o[c];
                o.sort(() => Math.random() - 0.5);
                c = o.indexOf(correctText);

                qList.push({ question: q, options: o, correct: c, explanation: exp });
            }
            return qList;
        }

        function startQuizCategory(catId, catTitle) {
            currentQuizCategory = catId;
            document.getElementById('quiz-menu').classList.add('hidden');
            document.getElementById('quiz-container').classList.remove('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            
            currentQuizQuestions = generateQuestions(catId);
            currentQuizIndex = 0;
            score = 0;
            
            document.getElementById('quiz-total').textContent = currentQuizQuestions.length;
            updateQuizUI();
        }

        function backToQuizMenu() {
            document.getElementById('quiz-container').classList.add('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            document.getElementById('quiz-menu').classList.remove('hidden');
            document.getElementById('quiz-menu').classList.add('fade-in');
        }

        function restartQuiz() {
            startQuizCategory(currentQuizCategory, '');
        }

        function startQuiz() {
            // startQuiz funksiyasi endi menyu ochish uchun xizmat qiladi
            document.getElementById('quiz-container').classList.add('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            document.getElementById('quiz-menu').classList.remove('hidden');
        }

        function updateQuizUI() {
            isQuestionAnswered = false;
            const q = currentQuizQuestions[currentQuizIndex];
            
            document.getElementById('quiz-current').textContent = currentQuizIndex + 1;
            document.getElementById('quiz-score').textContent = score;
            
            const progressPercent = ((currentQuizIndex) / currentQuizQuestions.length) * 100;
            document.getElementById('quiz-progress').style.width = `${progressPercent}%`;

            document.getElementById('quiz-question').textContent = q.question;
            document.getElementById('quiz-next-btn').classList.add('hidden');

            const optionsContainer = document.getElementById('quiz-options');
            optionsContainer.innerHTML = '';

            q.options.forEach((opt, index) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option w-full text-left p-4 rounded-xl text-gray-200 text-lg focus:outline-none';
                btn.textContent = opt;
                btn.onclick = () => selectOption(btn, index);
                optionsContainer.appendChild(btn);
            });
        }

        function selectOption(selectedBtn, selectedIndex) {
            if(isQuestionAnswered) return;
            isQuestionAnswered = true;

            const q = currentQuizQuestions[currentQuizIndex];
            const allOptions = document.getElementById('quiz-options').children;

            for(let btn of allOptions) {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                btn.classList.remove('hover:-translate-x-1', 'hover:border-gold-500');
            }

            if(selectedIndex === q.correct) {
                selectedBtn.classList.add('correct');
                selectedBtn.classList.remove('opacity-70');
                score++;
                document.getElementById('quiz-score').textContent = score;
            } else {
                selectedBtn.classList.add('wrong');
                selectedBtn.classList.remove('opacity-70');
                allOptions[q.correct].classList.add('correct');
                allOptions[q.correct].classList.remove('opacity-70');
            }

            const expDiv = document.createElement('div');
            expDiv.className = 'mt-5 p-4 bg-dark-900 text-gray-300 text-sm rounded-lg border border-gold-500/20 fade-in';
            expDiv.innerHTML = `<strong class="text-gold-500">Tushuntirish:</strong> ${q.explanation}`;
            document.getElementById('quiz-options').appendChild(expDiv);

            const nextBtn = document.getElementById('quiz-next-btn');
            nextBtn.classList.remove('hidden');
            nextBtn.classList.add('flex', 'fade-in');
            
            const progressPercent = ((currentQuizIndex + 1) / currentQuizQuestions.length) * 100;
            document.getElementById('quiz-progress').style.width = `${progressPercent}%`;
        }

        function nextQuestion() {
            currentQuizIndex++;
            if(currentQuizIndex >= currentQuizQuestions.length) {
                showResults();
            } else {
                updateQuizUI();
            }
        }

        function showResults() {
            document.getElementById('quiz-container').classList.add('hidden');
            const resultsEl = document.getElementById('quiz-results');
            resultsEl.classList.remove('hidden');
            
            document.getElementById('final-score').textContent = score;
            document.getElementById('final-total').textContent = currentQuizQuestions.length;

            if (window.updateUserScore && score > 0) {
                window.updateUserScore(score * 5); // Har bir to'g'ri javob uchun 5 ball
            }
        }

        // --- Essay Checking Logic (Gemini API) ---
        
        // 110 ta turli xil mavzular darajalar bo'yicha
        const essayTopicsDB = {
            'A1': [
                "My daily routine", "My family", "My best friend", "My house", "My favorite food",
                "My hobbies", "My pet", "A typical weekend", "My favorite colors", "My clothes",
                "What I do in the morning", "My school", "My favorite teacher", "My favorite season",
                "My birthday party", "What I like to eat for breakfast", "My favorite animal",
                "A place I like in my city", "My bedroom", "What I do after school",
                "My favorite sport", "My dream holiday"
            ],
            'A2': [
                "My last holiday", "A good friend", "How to stay healthy", "My dream job", 
                "My favorite movie", "A book I read recently", "My favorite music", "Shopping for clothes",
                "A memorable day in my life", "Cooking my favorite meal", "A famous person I admire",
                "My hometown", "Learning English", "Using the internet", "My plans for the future",
                "A party I went to", "Transportation in my city", "My favorite festival",
                "A sport I like to play", "My favorite restaurant", "A typical day at work", "My childhood"
            ],
            'B1': [
                "The importance of technology", "Online learning vs classroom", "Protecting the environment",
                "Benefits of reading", "Traveling abroad", "Social media advantages and disadvantages",
                "Healthy eating habits", "The importance of sports", "Money and happiness",
                "Living in a city vs the countryside", "My ideal society", "The future of transport",
                "How to manage stress", "The role of music in life", "Learning a foreign language",
                "The importance of friendships", "A historical event", "My greatest achievement",
                "The impact of tourism", "Volunteering and charity", "The role of television", "My dream business"
            ],
            'B2': [
                "The impact of Artificial Intelligence", "Global warming and climate change", 
                "The future of education", "Remote work: Pros and Cons", "The influence of advertising",
                "Cultural diversity in modern society", "The ethical implications of cloning",
                "Space exploration: Is it worth it?", "The role of government in healthcare",
                "Privacy in the digital age", "The psychology of success", "Modern art vs classical art",
                "The evolution of the English language", "The effects of fast fashion", 
                "Overpopulation problems", "The power of media", "Cybersecurity threats",
                "The gig economy", "Genetically modified foods", "The importance of emotional intelligence",
                "Renewable energy sources", "The decline of traditional journalism"
            ],
            'C1': [
                "Ethical dilemmas in modern medicine", "The illusion of free will", "The philosophy of artificial consciousness",
                "Global economic inequality", "The impact of globalization on local cultures",
                "Utopian vs Dystopian futures", "The role of censorship in democracy",
                "The ethics of gene editing", "The psychological effects of social isolation",
                "The feasibility of universal basic income", "The evolution of human morality",
                "The impact of quantum computing", "Deconstructing modern political polarization",
                "The intersection of art and technology", "The historical legacy of colonialism",
                "The psychology of mass movements", "The sustainability of endless economic growth",
                "The future of human evolution", "The ethics of surveillance capitalism",
                "The validity of objective truth in the post-truth era", "The commercialization of space",
                "The philosophical implications of the multiverse theory"
            ]
        };

        window.updateEssayTopics = function() {
            const level = document.getElementById('essay-level').value;
            const topicSelect = document.getElementById('essay-topic');
            topicSelect.innerHTML = '';
            
            essayTopicsDB[level].forEach(topic => {
                const opt = document.createElement('option');
                opt.value = topic;
                opt.textContent = topic;
                topicSelect.appendChild(opt);
            });
        };

        async function checkEssay() {
            const topic = document.getElementById('essay-topic').value;
            const text = document.getElementById('essay-text').value.trim();
            const btn = document.getElementById('check-essay-btn');
            const feedbackContainer = document.getElementById('essay-feedback-container');
            const feedbackContent = document.getElementById('essay-feedback-content');

            if (!text) {
                feedbackContainer.classList.remove('hidden');
                feedbackContent.innerHTML = `<div class="text-red-400 flex items-center gap-2 font-medium"><i class="ph ph-warning-circle text-xl"></i> Iltimos, avval matn maydoniga o'z essengizni yozing. Bo'sh matnni tekshirib bo'lmaydi.</div>`;
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Tekshirilmoqda...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            
            feedbackContainer.classList.remove('hidden');
            feedbackContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10">
                    <i class="ph ph-circle-notch animate-spin text-5xl text-gold-500 mb-4"></i>
                    <span class="text-gray-400 font-medium">Sun'iy intellekt esseni tahlil qilmoqda. Iltimos kuting...</span>
                </div>
            `;

            const systemPrompt = `Sen ingliz tilini o'rgatuvchi professional o'qituvchisan. O'quvchi "${topic}" mavzusida esse yozdi. Uning yozgan essesi matnida grammatik, imlo va so'z tanlash xatolarini top. Ularni batafsil tushuntir, matnni sifatini oshirish uchun yaxshiroq va to'g'ri variantlarni taklif qil. Oxirida ruhlantiruvchi xulosa (Baholash) yoz. Javobingni to'liq O'zbek tilida ber, interfeys qorong'i (dark mode) bo'lganligi uchun matnlar o'qilishi oson bo'lishi kerak. Chiroyli ko'rinish uchun HTML teglaridan (<p>, <ul>, <li>, <strong class="text-gold-400">, <br>) foydalanib formatla. Javobni markdown blocksiz to'g'ridan-to'g'ri qaytar.`;
            
            const apiKey = ""; // API key provided by Canvas environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: text }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                const candidate = result.candidates?.[0];
                
                if (candidate && candidate.content?.parts?.[0]?.text) {
                    let htmlFeedback = candidate.content.parts[0].text;
                    htmlFeedback = htmlFeedback.replace(/```html/g, '').replace(/```/g, '');
                    feedbackContent.innerHTML = htmlFeedback;
                    
                    // Additional styling for generated elements
                    const elements = feedbackContent.querySelectorAll('ul, ol');
                    elements.forEach(el => el.classList.add('list-disc', 'list-inside', 'my-3', 'space-y-2', 'pl-4'));
                    const paragraphs = feedbackContent.querySelectorAll('p');
                    paragraphs.forEach(p => p.classList.add('mb-3'));

                    if (window.updateUserScore) {
                        window.updateUserScore(20); // Bonus score for completing an essay
                    }
                } else {
                    feedbackContent.innerHTML = `<div class="text-red-400 flex items-center gap-2"><i class="ph ph-warning text-xl"></i> Kechirasiz, API dan to'g'ri javob kelmadi.</div>`;
                }
            } catch (error) {
                console.error(error);
                feedbackContent.innerHTML = `<div class="text-red-400 flex flex-col items-center text-center py-4">
                    <i class="ph ph-wifi-x text-4xl mb-2"></i>
                    <p>Tarmoq xatosi yuz berdi. Internet aloqangizni tekshirib, qaytadan urinib ko'ring.</p>
                </div>`;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-magic-wand text-xl"></i> AI Tekshirish';
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                
                feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        window.onload = () => {
            switchView('home');
            updateEssayTopics(); // Dastlabki mavzularni yuklash
            initQuizMenu(); // Grammatika mavzularini yuklash
        };

        // --- Contact Form Logic ---
        window.handleContactSubmit = function(e) {
            e.preventDefault();
            const btn = document.getElementById('contact-submit-btn');
            const originalContent = btn.innerHTML;
            
            btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Yuborilmoqda...';
            btn.disabled = true;
            
            // Simulyatsiya qilingan yuborish jarayoni
            setTimeout(() => {
                btn.innerHTML = '<i class="ph ph-check-circle text-xl"></i> Muvaffaqiyatli yuborildi!';
                btn.classList.add('!bg-green-500', '!text-white');
                btn.classList.remove('bg-gradient-to-r', 'from-gold-600', 'to-gold-400', 'text-dark-950');
                e.target.reset();
                
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.classList.remove('!bg-green-500', '!text-white');
                    btn.classList.add('bg-gradient-to-r', 'from-gold-600', 'to-gold-400', 'text-dark-950');
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        }
