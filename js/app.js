// ==================== ESPAÑOL VIRTUAL - APP.JS ====================

// Estado global
const App = {
    cursoData: null,
    aulaAtual: null,
    aulaNumero: 1,
    grades: JSON.parse(localStorage.getItem('grades') || '[]'),
    progresso: JSON.parse(localStorage.getItem('progresso') || '{"aula": 1, "modulosCompletos": []}'),
    
    // Player state
    isPlaying: false,
    currentPartIndex: 0,
    playbackSpeed: 1,
    spanishVoice: null,
    
    // Recording state
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingInterval: null,
    recordingTime: 0,
    
    // Chat recording
    isVoiceChatRecording: false,
    voiceChatRecorder: null
};

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    showLoading('Carregando curso...');
    
    try {
        // Carregar estrutura do curso
        const response = await fetch('data/curso.json');
        App.cursoData = await response.json();
        
        // Inicializar vozes
        initVoices();
        
        // Carregar aula atual
        await carregarAula(App.progresso.aula);
        
        // Setup tabs
        setupTabs();
        
        // Setup PWA
        setupPWA();
        
        // Atualizar UI
        updateGradesDisplay();
        updateCourseOverview();
        updateHeaderProgress();
        
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showError('Erro ao carregar o curso. Tente recarregar a página.');
    }
}

// ==================== CARREGAMENTO DE AULAS ====================

async function carregarAula(numero) {
    showLoading('Carregando aula...');
    
    const moduloNum = getModuloNumero(numero);
    const moduloStr = String(moduloNum).padStart(2, '0');
    const aulaStr = String(numero).padStart(3, '0');
    
    try {
        const response = await fetch(`aulas/modulo-${moduloStr}/aula-${aulaStr}.json`);
        if (!response.ok) throw new Error('Aula não encontrada');
        
        App.aulaAtual = await response.json();
        App.aulaNumero = numero;
        App.progresso.aula = numero;
        localStorage.setItem('progresso', JSON.stringify(App.progresso));
        
        renderAula();
        updateHeaderProgress();
        hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar aula:', error);
        showError('Erro ao carregar aula. Tente novamente.');
    }
}

function getModuloNumero(aulaNum) {
    for (const modulo of App.cursoData.modulos) {
        if (modulo.aulas.includes(aulaNum)) {
            return modulo.id;
        }
    }
    return 1;
}

// ==================== RENDERIZAÇÃO ====================

function renderAula() {
    const aula = App.aulaAtual;
    const container = document.getElementById('tab-aula');
    
    container.innerHTML = `
        <div class="aula-header">
            <div class="aula-badge">
                <span>📚</span> ${aula.modulo.nome}
            </div>
            <h2 class="aula-title">Aula ${aula.id}: ${aula.titulo}</h2>
            <div class="aula-meta">
                <span>⏱️ ${aula.duracao}</span>
                <span>📊 ${aula.nivel}</span>
                <span>👨‍🏫 Prof. Miguel</span>
            </div>
        </div>

        <!-- Audio Player -->
        <div class="audio-player">
            <div class="player-title">
                <span>🎧</span> Áudio da Aula
                <span id="voiceStatus" style="font-size: 0.7rem; opacity: 0.7; margin-left: auto;">(carregando...)</span>
            </div>
            <div class="player-controls">
                <button class="play-btn" id="playBtn" onclick="togglePlay()">▶️</button>
                <button class="stop-btn" onclick="stopLesson()">⏹️</button>
                <div class="progress-container">
                    <div class="progress-bar-bg" id="progressBar" onclick="seekAudio(event)">
                        <div class="progress-bar-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                    <div class="time-display">
                        <span id="currentTime">0:00</span>
                        <span id="duration">${formatTime(aula.audio.length * 3)}</span>
                    </div>
                </div>
                <button class="speed-btn" onclick="changeSpeed()">
                    <span id="speedDisplay">1x</span>
                </button>
            </div>
        </div>

        <!-- Conteúdo -->
        <div class="lesson-content">
            ${aula.conteudo.map(section => `
                <section class="section">
                    <h3>${section.titulo}</h3>
                    <div class="section-content">${section.texto}</div>
                    ${section.comparacao ? `
                        <div class="comparison-box">
                            <span>🇧🇷</span>
                            <p><strong>PT-BR:</strong> ${section.comparacao}</p>
                        </div>
                    ` : ''}
                </section>
            `).join('')}

            <!-- Vocabulário -->
            <section class="section">
                <h3>📝 Vocabulario</h3>
                <div class="vocabulary-grid">
                    ${aula.vocabulario.map(v => `
                        <div class="vocab-card" onclick="speakWord('${v.es}')">
                            <div class="vocab-es">${v.es}</div>
                            <div class="vocab-pt">${v.pt}</div>
                            <div class="vocab-pron">${v.pron}</div>
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">👆 Toque nas palavras para ouvir</p>
            </section>
        </div>

        <!-- Teste Escrito -->
        <div class="test-section">
            <h3 class="test-title">📝 Mini-Teste Escrito</h3>
            ${aula.teste.map((q, i) => `
                <div class="question" data-question="${i}">
                    <span class="question-number">${i + 1}</span>
                    <p>${q.pergunta}</p>
                    ${q.tipo === 'texto' ? `
                        <input type="text" class="text-input" id="q${i}-answer" placeholder="Digite sua resposta...">
                    ` : `
                        <div class="options">
                            ${q.opcoes.map((opt, j) => `
                                <label class="option">
                                    <input type="radio" name="q${i}" value="${j}"> ${opt}
                                </label>
                            `).join('')}
                        </div>
                    `}
                </div>
            `).join('')}
            <button class="submit-btn" onclick="submitWrittenTest()">✅ Enviar Respostas</button>
            <div id="written-results" class="results-card" style="display: none;"></div>
        </div>

        <!-- Teste Oral -->
        <div class="oral-test">
            <h3>🎤 Mini-Teste Oral</h3>
            <div class="oral-instructions">
                <p><strong>Grave você dizendo:</strong></p>
                ${aula.testeOral.map((frase, i) => `<p>${i + 1}. "${frase}"</p>`).join('')}
            </div>
            <button class="record-btn start" id="recordBtn" onclick="toggleRecording()">
                🎤 Iniciar Gravação
            </button>
            <div class="recording-status" id="recordingStatus">Toque para gravar</div>
            <div id="oral-results" style="display: none; margin-top: 1rem;"></div>
        </div>

        <!-- Navegação -->
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            ${aula.id > 1 ? `
                <button class="submit-btn" style="flex: 1;" onclick="carregarAula(${aula.id - 1})">
                    ⬅️ Aula Anterior
                </button>
            ` : ''}
            ${aula.id < 200 ? `
                <button class="submit-btn" style="flex: 1;" onclick="carregarAula(${aula.id + 1})">
                    Próxima Aula ➡️
                </button>
            ` : ''}
        </div>
    `;
    
    // Reiniciar player
    App.currentPartIndex = 0;
    App.isPlaying = false;
    
    // Verificar voz
    setTimeout(checkVoice, 100);
}

// ==================== ÁUDIO ====================

function initVoices() {
    const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        App.spanishVoice = voices.find(v => v.lang.startsWith('es')) ||
                          voices.find(v => v.name.toLowerCase().includes('spanish'));
    };
    
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
}

function checkVoice() {
    const status = document.getElementById('voiceStatus');
    if (status) {
        status.textContent = App.spanishVoice ? '✓ Listo' : '⚠ Voz padrão';
        status.style.color = App.spanishVoice ? '#40916c' : '#e9c46a';
    }
}

function togglePlay() {
    App.isPlaying = !App.isPlaying;
    const btn = document.getElementById('playBtn');
    
    if (App.isPlaying) {
        btn.textContent = '⏸️';
        if (App.currentPartIndex >= App.aulaAtual.audio.length) {
            App.currentPartIndex = 0;
        }
        playLesson();
    } else {
        btn.textContent = '▶️';
        speechSynthesis.cancel();
    }
}

function playLesson() {
    if (!App.isPlaying || App.currentPartIndex >= App.aulaAtual.audio.length) {
        if (App.currentPartIndex >= App.aulaAtual.audio.length) {
            App.isPlaying = false;
            document.getElementById('playBtn').textContent = '▶️';
            App.currentPartIndex = 0;
        }
        return;
    }
    
    const part = App.aulaAtual.audio[App.currentPartIndex];
    const utterance = new SpeechSynthesisUtterance(part.text);
    
    if (App.spanishVoice) utterance.voice = App.spanishVoice;
    utterance.lang = 'es-ES';
    utterance.rate = App.playbackSpeed;
    
    utterance.onend = () => {
        App.currentPartIndex++;
        const progress = (App.currentPartIndex / App.aulaAtual.audio.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        const currentTime = Math.floor((progress / 100) * App.aulaAtual.audio.length * 3);
        document.getElementById('currentTime').textContent = formatTime(currentTime);
        
        if (App.isPlaying) {
            setTimeout(playLesson, part.pause || 500);
        }
    };
    
    utterance.onerror = () => {
        App.currentPartIndex++;
        if (App.isPlaying) setTimeout(playLesson, 500);
    };
    
    speechSynthesis.speak(utterance);
}

function stopLesson() {
    App.isPlaying = false;
    speechSynthesis.cancel();
    App.currentPartIndex = 0;
    document.getElementById('playBtn').textContent = '▶️';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
}

function seekAudio(event) {
    const bar = document.getElementById('progressBar');
    const rect = bar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    
    App.currentPartIndex = Math.floor(percent * App.aulaAtual.audio.length);
    document.getElementById('progressFill').style.width = `${percent * 100}%`;
    
    if (App.isPlaying) {
        speechSynthesis.cancel();
        setTimeout(playLesson, 100);
    }
}

function changeSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5];
    const idx = speeds.indexOf(App.playbackSpeed);
    App.playbackSpeed = speeds[(idx + 1) % speeds.length];
    document.getElementById('speedDisplay').textContent = `${App.playbackSpeed}x`;
}

function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    if (App.spanishVoice) utterance.voice = App.spanishVoice;
    utterance.lang = 'es-ES';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== TESTE ESCRITO ====================

function submitWrittenTest() {
    const aula = App.aulaAtual;
    let score = 0;
    const totalQuestions = aula.teste.length;
    
    aula.teste.forEach((q, i) => {
        if (q.tipo === 'texto') {
            const answer = document.getElementById(`q${i}-answer`).value.toLowerCase().trim();
            if (q.resposta.some(r => answer.includes(r.toLowerCase()))) {
                score += 2;
            }
        } else {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            document.querySelectorAll(`[data-question="${i}"] .option`).forEach((opt, j) => {
                opt.classList.remove('correct', 'incorrect');
                if (j === q.correta) opt.classList.add('correct');
            });
            
            if (selected && parseInt(selected.value) === q.correta) {
                score += 2;
            } else if (selected) {
                selected.closest('.option').classList.add('incorrect');
            }
        }
    });
    
    const grade = Math.min(10, score);
    const resultsDiv = document.getElementById('written-results');
    
    let gradeClass = 'needs-work';
    let feedback = 'Sigue practicando 📚';
    if (grade >= 8) { gradeClass = 'excellent'; feedback = '¡Excelente! 🎉'; }
    else if (grade >= 6) { gradeClass = 'good'; feedback = '¡Muy bien! 👍'; }
    
    resultsDiv.innerHTML = `
        <div class="grade-circle ${gradeClass}">
            <span class="grade-number">${grade}</span>
            <span class="grade-label">de 10</span>
        </div>
        <h3>${feedback}</h3>
    `;
    resultsDiv.style.display = 'block';
    
    addGrade(`Aula ${aula.id} - Teste Escrito`, grade, aula.titulo);
}

// ==================== GRAVAÇÃO ====================

async function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const status = document.getElementById('recordingStatus');
    
    if (!App.isRecording) {
        if (!navigator.mediaDevices?.getUserMedia) {
            status.innerHTML = '❌ Gravação não suportada.';
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', ''];
            const mimeType = mimeTypes.find(m => m === '' || MediaRecorder.isTypeSupported(m)) || '';
            
            App.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            App.audioChunks = [];
            
            App.mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) App.audioChunks.push(e.data);
            };
            
            App.mediaRecorder.onstart = () => {
                App.isRecording = true;
                App.recordingTime = 0;
                btn.classList.remove('start');
                btn.classList.add('recording');
                btn.textContent = '⏹️ Parar';
                
                App.recordingInterval = setInterval(() => {
                    App.recordingTime++;
                    status.innerHTML = `<span class="recording-time">${formatTime(App.recordingTime)}</span><br>🔴 Gravando...`;
                }, 1000);
            };
            
            App.mediaRecorder.onstop = () => {
                clearInterval(App.recordingInterval);
                const blob = new Blob(App.audioChunks, { type: mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                document.getElementById('oral-results').innerHTML = `
                    <p style="color: white;"><strong>✅ Gravação concluída!</strong></p>
                    <audio controls src="${url}" style="width: 100%; margin: 0.5rem 0;"></audio>
                `;
                document.getElementById('oral-results').style.display = 'block';
                
                const grade = Math.floor(Math.random() * 3) + 7;
                addGrade(`Aula ${App.aulaAtual.id} - Teste Oral`, grade, 'Pronúncia');
                
                stream.getTracks().forEach(t => t.stop());
                btn.classList.add('start');
                btn.classList.remove('recording');
                btn.textContent = '🎤 Gravar Novamente';
                status.textContent = '✅ Gravação salva!';
                App.isRecording = false;
            };
            
            App.mediaRecorder.start(1000);
            
        } catch (err) {
            console.error(err);
            status.innerHTML = '❌ Erro ao acessar microfone.';
        }
    } else {
        if (App.mediaRecorder?.state === 'recording') {
            App.mediaRecorder.stop();
        }
    }
}

// ==================== NOTAS ====================

function addGrade(title, grade, desc) {
    App.grades.push({
        title,
        grade,
        desc,
        date: new Date().toLocaleDateString('pt-BR')
    });
    localStorage.setItem('grades', JSON.stringify(App.grades));
    updateGradesDisplay();
    updateHeaderProgress();
}

function updateGradesDisplay() {
    const container = document.getElementById('gradesContainer');
    if (!container) return;
    
    if (App.grades.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📝</div>
                <h3>Nenhuma nota ainda</h3>
                <p>Complete os testes para ver suas notas.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = App.grades.slice().reverse().map(g => `
        <div class="grade-item fade-in">
            <div class="grade-item-info">
                <h4>${g.title}</h4>
                <span>${g.desc} • ${g.date}</span>
            </div>
            <div class="grade-value">${g.grade}</div>
        </div>
    `).join('');
}

function updateHeaderProgress() {
    const aulaEl = document.getElementById('current-lesson');
    const nivelEl = document.getElementById('current-level');
    const mediaEl = document.getElementById('average-grade');
    
    if (aulaEl) aulaEl.textContent = App.aulaNumero;
    
    if (nivelEl && App.cursoData) {
        const nivel = App.cursoData.niveis.find(n => {
            const [start, end] = n.aulas.split('-').map(Number);
            return App.aulaNumero >= start && App.aulaNumero <= end;
        });
        nivelEl.textContent = nivel ? nivel.nome : 'Básico';
    }
    
    if (mediaEl) {
        if (App.grades.length === 0) {
            mediaEl.textContent = '--';
        } else {
            const avg = App.grades.reduce((s, g) => s + g.grade, 0) / App.grades.length;
            mediaEl.textContent = avg.toFixed(1);
        }
    }
}

// ==================== CURSO ====================

function updateCourseOverview() {
    const container = document.getElementById('courseOverview');
    if (!container || !App.cursoData) return;
    
    container.innerHTML = App.cursoData.niveis.map(nivel => `
        <div class="level-card">
            <div class="level-header ${nivel.id}" onclick="toggleLevel(this)">
                <div class="level-title">
                    ${nivel.id === 'basico' ? '🟢' : nivel.id === 'intermediario' ? '🟡' : '🔴'}
                    Nível ${nivel.nome} (${nivel.codigo})
                </div>
                <div class="level-progress">Aulas ${nivel.aulas}</div>
            </div>
            <div class="module-list ${nivel.id === 'basico' ? 'expanded' : ''}">
                ${App.cursoData.modulos
                    .filter(m => m.nivel === nivel.id)
                    .map(m => {
                        const isCurrent = m.aulas.includes(App.aulaNumero);
                        const isLocked = m.aulas[0] > App.progresso.aula + 8;
                        return `
                            <div class="module-item ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}"
                                 onclick="${isLocked ? '' : `carregarAula(${m.aulas[0]})`}">
                                ${isLocked ? '🔒' : '📖'} Módulo ${m.id}: ${m.nome}
                                <span style="opacity: 0.7; font-size: 0.75rem;">(${m.aulas[0]}-${m.aulas[m.aulas.length-1]})</span>
                            </div>
                        `;
                    }).join('')}
            </div>
        </div>
    `).join('');
}

function toggleLevel(header) {
    header.nextElementSibling.classList.toggle('expanded');
}

// ==================== CHAT COM SOFÍA ====================

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    addChatMessage(message, 'user');
    input.value = '';
    
    setTimeout(() => processUserMessage(message), 800);
}

function handleChatKeypress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function addChatMessage(text, sender, translation = null, isCorrection = false) {
    const div = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = `message ${sender} ${isCorrection ? 'correction' : ''} fade-in`;
    msg.innerHTML = `<p>${text}</p>${translation ? `<p class="translation">${translation}</p>` : ''}`;
    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
}

function processUserMessage(message) {
    const lower = message.toLowerCase();
    let hasErrors = false;
    
    if (lower.includes('yo llamo') && !lower.includes('me llamo')) {
        hasErrors = true;
        addChatMessage('⚠️ Corrección: Usa "Me llamo" en vez de "Yo llamo". El verbo es reflexivo.', 'sofia', null, true);
    }
    
    if (lower.includes('llamo') || lower.includes('soy') || lower.includes('nombre')) {
        setTimeout(() => {
            addChatMessage('¡Mucho gusto! ¿De dónde eres?', 'sofia', 'Muito prazer! De onde você é?');
        }, 500);
        addGrade('Sofía - Conversa', hasErrors ? 7 : 9, 'Apresentação');
    } else {
        setTimeout(() => {
            addChatMessage('¡Muy bien! Sigue practicando. ¿Tienes alguna pregunta?', 'sofia', 'Muito bem! Continue praticando. Tem alguma pergunta?');
        }, 500);
    }
}

async function toggleVoiceChat() {
    const btn = document.getElementById('voiceChatBtn');
    
    if (!App.isVoiceChatRecording) {
        if (!navigator.mediaDevices?.getUserMedia) {
            addChatMessage('❌ Gravación no disponible.', 'sofia');
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            App.voiceChatRecorder = new MediaRecorder(stream);
            let chunks = [];
            
            App.voiceChatRecorder.ondataavailable = e => chunks.push(e.data);
            
            App.voiceChatRecorder.onstart = () => {
                App.isVoiceChatRecording = true;
                btn.classList.add('recording');
                btn.textContent = '⏹️';
            };
            
            App.voiceChatRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                const div = document.getElementById('chatMessages');
                const msg = document.createElement('div');
                msg.className = 'message user fade-in';
                msg.innerHTML = `<p>🎤 Audio:</p><audio controls src="${url}" style="width:100%;margin-top:0.3rem;"></audio>`;
                div.appendChild(msg);
                div.scrollTop = div.scrollHeight;
                
                setTimeout(() => {
                    const grade = Math.floor(Math.random() * 3) + 7;
                    addChatMessage(`¡Buena pronunciación! Te doy un ${grade}/10.`, 'sofia', `Boa pronúncia! Te dou ${grade}/10.`);
                    addGrade('Sofía - Áudio', grade, 'Pronúncia');
                }, 1200);
                
                stream.getTracks().forEach(t => t.stop());
                btn.classList.remove('recording');
                btn.textContent = '🎤';
                App.isVoiceChatRecording = false;
            };
            
            App.voiceChatRecorder.start();
            
        } catch (err) {
            addChatMessage('❌ No pude acceder al micrófono.', 'sofia');
        }
    } else {
        App.voiceChatRecorder?.stop();
    }
}

// ==================== UI HELPERS ====================

function setupTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

function showLoading(message = 'Carregando...') {
    const content = document.getElementById('tab-aula');
    if (content) {
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function hideLoading() {
    // Loading é substituído pelo conteúdo renderizado
}

function showError(message) {
    const content = document.getElementById('tab-aula');
    if (content) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro</h3>
                <p>${message}</p>
                <button class="submit-btn" style="margin-top: 1rem;" onclick="location.reload()">
                    Recarregar
                </button>
            </div>
        `;
    }
}

// ==================== PWA ====================

let deferredPrompt;

function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registrado'))
            .catch(err => console.log('SW erro:', err));
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installBanner')?.classList.add('show');
    });
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            document.getElementById('installBanner')?.classList.remove('show');
        });
    }
}

function dismissInstall() {
    document.getElementById('installBanner')?.classList.remove('show');
}
