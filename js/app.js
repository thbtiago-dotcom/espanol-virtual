// ==================== ESPAÑOL VIRTUAL - APP COMPLETO ====================

const App = {
    cursoData: null,
    aulaAtual: null,
    aulaNumero: parseInt(localStorage.getItem('currentLesson')) || 1,
    grades: JSON.parse(localStorage.getItem('grades') || '[]'),
    isPlaying: false,
    currentPartIndex: 0,
    playbackSpeed: 1,
    spanishVoice: null
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
        const response = await fetch('data/curso.json');
        App.cursoData = await response.json();
        initVoices();
        setupTabs();
        setupPWA();
        await loadLesson(App.aulaNumero);
        renderCourseGrid();
        renderGrades();
        updateProgress();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tab-aula').innerHTML = `<div class="error-box"><h2>❌ Erro</h2><button onclick="location.reload()">Recarregar</button></div>`;
    }
}

async function loadLesson(num) {
    const modulo = Math.ceil(num / 8);
    const moduloStr = String(modulo).padStart(2, '0');
    const aulaStr = String(num).padStart(3, '0');
    try {
        const response = await fetch(`aulas/modulo-${moduloStr}/aula-${aulaStr}.json`);
        if (!response.ok) throw new Error('Not found');
        App.aulaAtual = await response.json();
        App.aulaNumero = num;
        localStorage.setItem('currentLesson', num);
        renderLesson();
        updateProgress();
        renderCourseGrid();
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading lesson:', error);
    }
}

function renderLesson() {
    const a = App.aulaAtual;
    const container = document.getElementById('tab-aula');
    
    container.innerHTML = `
        <!-- CABEÇALHO -->
        <div class="lesson-hero">
            <div class="lesson-number">${a.id}</div>
            <div class="lesson-info">
                <span class="lesson-module">📚 ${a.modulo.nome}</span>
                <h1>${a.titulo}</h1>
                <div class="lesson-meta"><span>⏱️ ${a.duracao}</span><span>📊 ${a.nivel}</span></div>
            </div>
        </div>

        <!-- PLAYER DE ÁUDIO -->
        <div class="audio-card">
            <div class="audio-header"><span>🎧 Ouvir Aula em Espanhol</span><span class="voice-status" id="voiceStatus">...</span></div>
            <div class="audio-controls">
                <button class="btn-play" onclick="togglePlay()"><span id="playIcon">▶</span></button>
                <div class="audio-progress">
                    <div class="progress-track" onclick="seekAudio(event)"><div class="progress-fill" id="progressFill"></div></div>
                </div>
                <button class="btn-speed" onclick="changeSpeed()"><span id="speedText">1x</span></button>
            </div>
        </div>

        <!-- CONTEÚDO DA AULA -->
        <div class="content-sections">${a.conteudo.map(s => renderSecao(s)).join('')}</div>

        <!-- GRAMÁTICA -->
        ${a.gramatica?.length ? `
        <div class="section-block grammar-section">
            <h3>📖 Regras Gramaticais</h3>
            ${a.gramatica.map(g => `
                <div class="grammar-card">
                    <div class="grammar-title">${g.regra}</div>
                    <p>${g.explicacao}</p>
                    <div class="examples-container">
                        ${g.exemplos.map(e => `<span class="example-tag">${e}</span>`).join('')}
                    </div>
                    ${g.dica ? `<div class="grammar-tip">💡 ${g.dica}</div>` : ''}
                </div>
            `).join('')}
        </div>` : ''}

        <!-- VOCABULÁRIO -->
        <div class="section-block vocab-section">
            <h3>📝 Vocabulário (${a.vocabulario.length} palavras)</h3>
            <p class="hint">👆 Toque nas palavras para ouvir a pronúncia</p>
            <div class="vocab-grid">
                ${a.vocabulario.map(v => `
                    <div class="vocab-item" onclick="speak('${v.es.replace(/'/g, "\\'")}')">
                        <div class="vocab-es">${v.es}</div>
                        <div class="vocab-pt">${v.pt}</div>
                        <div class="vocab-pron">${v.pron}</div>
                        ${v.categoria ? `<div class="vocab-cat">${v.categoria}</div>` : ''}
                        ${v.exemplo ? `<div class="vocab-ex">"${v.exemplo}"</div>` : ''}
                        <span class="speaker">🔊</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- DICAS CULTURAIS -->
        ${a.dicasCulturais?.length ? `
        <div class="section-block cultural-section">
            <h3>🌍 Curiosidades e Cultura</h3>
            <div class="cultural-grid">
                ${a.dicasCulturais.map(d => `
                    <div class="cultural-card">
                        <div class="cultural-title">${d.titulo}</div>
                        <p>${d.texto}</p>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- TESTE DE MÚLTIPLA ESCOLHA -->
        <div class="section-block test-section">
            <h3>✍️ Teste de Conhecimento (${a.teste.length} questões)</h3>
            <div class="questions">
                ${a.teste.map((q, i) => `
                    <div class="question-card" id="q${i}">
                        <div class="q-num">${i + 1}</div>
                        <p class="q-text">${q.pergunta}</p>
                        <div class="options">
                            ${q.opcoes.map((opt, j) => `
                                <label class="option"><input type="radio" name="q${i}" value="${j}"><span>${opt}</span></label>
                            `).join('')}
                        </div>
                        <div class="feedback" id="fb${i}"></div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary" onclick="submitTest()">Verificar Respostas ✓</button>
            <div id="testResults"></div>
        </div>

        <!-- EXERCÍCIOS ESCRITOS -->
        ${a.exerciciosEscritos?.length ? `
        <div class="section-block">
            <h3>✏️ Exercícios de Completar</h3>
            ${a.exerciciosEscritos.map((ex, ei) => `
                <div class="exercise-block">
                    <h4>${ex.instrucao}</h4>
                    ${ex.questoes.map((q, qi) => `
                        <div class="written-q" id="wr${ei}-${qi}">
                            <span class="written-prompt">${q.pergunta}</span>
                            <input type="text" id="inp${ei}-${qi}" data-ans="${q.resposta}" placeholder="Sua resposta...">
                            <button class="btn-sm" onclick="checkWritten(${ei},${qi})">✓</button>
                            <span class="wr-fb" id="wfb${ei}-${qi}"></span>
                        </div>
                        <div class="written-explain" id="wex${ei}-${qi}" style="display:none;"></div>
                    `).join('')}
                </div>
            `).join('')}
        </div>` : ''}

        <!-- EXERCÍCIOS DESCRITIVOS (DISSERTATIVOS) -->
        ${a.exerciciosDescritivos?.length ? `
        <div class="section-block">
            <h3>📝 Questões Dissertativas</h3>
            <p class="hint">Responda com suas próprias palavras. Depois, compare com a resposta modelo.</p>
            ${a.exerciciosDescritivos.map((ex, i) => `
                <div class="descriptive-exercise" id="desc${i}">
                    <div class="desc-question">
                        <span class="desc-num">${i + 1}.</span>
                        <span>${ex.pergunta}</span>
                    </div>
                    <textarea id="descInput${i}" class="desc-textarea" placeholder="Escreva sua resposta aqui..." rows="4"></textarea>
                    <button class="btn-secondary" onclick="showModelAnswer(${i})">Ver Resposta Modelo</button>
                    <div class="model-answer" id="model${i}" style="display:none;">
                        <div class="model-title">📋 Resposta Modelo:</div>
                        <p>${ex.respostaModelo}</p>
                        <div class="key-points">
                            <strong>Pontos importantes para incluir:</strong>
                            <ul>
                                ${ex.pontosPrincipais.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>` : ''}

        <!-- RESUMO -->
        ${a.resumo ? `
        <div class="section-block summary-section">
            <h3>📋 Resumo da Aula</h3>
            <p>${a.resumo}</p>
        </div>` : ''}

        <!-- NAVEGAÇÃO -->
        <div class="nav-buttons">
            ${a.id > 1 ? `<button class="btn-nav" onclick="loadLesson(${a.id - 1})">← Aula Anterior</button>` : '<div></div>'}
            ${a.id < 200 ? `<button class="btn-nav next" onclick="loadLesson(${a.id + 1})">Próxima Aula →</button>` : '<div></div>'}
        </div>
    `;
    setTimeout(checkVoice, 100);
}

function renderSecao(s) {
    let extraClass = '';
    if (s.tipo === 'intro') extraClass = 'intro';
    if (s.tipo === 'destaque') extraClass = 'highlight';
    if (s.tipo === 'visual') extraClass = 'visual';
    if (s.tipo === 'comparacao') extraClass = 'comparison';
    
    // Formatar o texto: converter **texto** em <strong>texto</strong>
    let textoFormatado = s.texto.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Preservar quebras de linha
    textoFormatado = textoFormatado.replace(/\n/g, '<br>');
    
    return `
        <div class="content-card ${extraClass}">
            ${s.imagem ? `<div class="section-icon">${s.imagem}</div>` : ''}
            <h3>${s.titulo}</h3>
            <div class="section-text">${textoFormatado}</div>
            ${s.lista?.length ? `
                <ul class="content-list">
                    ${s.lista.map(item => {
                        // Formatar negrito nas listas também
                        let itemFormatado = item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                        return `<li>${itemFormatado}</li>`;
                    }).join('')}
                </ul>
            ` : ''}
        </div>
    `;
}

function showModelAnswer(index) {
    const model = document.getElementById(`model${index}`);
    const btn = event.target;
    if (model.style.display === 'none') {
        model.style.display = 'block';
        btn.textContent = 'Ocultar Resposta';
    } else {
        model.style.display = 'none';
        btn.textContent = 'Ver Resposta Modelo';
    }
}

function checkWritten(ei, qi) {
    const inp = document.getElementById(`inp${ei}-${qi}`);
    const fb = document.getElementById(`wfb${ei}-${qi}`);
    const ex = document.getElementById(`wex${ei}-${qi}`);
    const cont = document.getElementById(`wr${ei}-${qi}`);
    const ans = inp.dataset.ans.toLowerCase();
    const val = inp.value.toLowerCase().trim();
    const ok = ans.split('/').some(a => val.includes(a.trim()));
    
    cont.classList.remove('correct', 'wrong');
    cont.classList.add(ok ? 'correct' : 'wrong');
    fb.textContent = ok ? '✓ Correto!' : `✗ ${inp.dataset.ans}`;
    fb.style.color = ok ? '#22c55e' : '#ef4444';
    
    // Mostrar explicação se existir
    const aula = App.aulaAtual;
    if (aula.exerciciosEscritos && aula.exerciciosEscritos[ei] && aula.exerciciosEscritos[ei].questoes[qi].explicacao) {
        ex.innerHTML = `<small>💡 ${aula.exerciciosEscritos[ei].questoes[qi].explicacao}</small>`;
        ex.style.display = 'block';
    }
}

function renderCourseGrid() {
    const container = document.getElementById('courseGrid');
    if (!container || !App.cursoData) return;
    let html = '';
    App.cursoData.niveis.forEach(nivel => {
        const emoji = nivel.id === 'basico' ? '🟢' : nivel.id === 'intermediario' ? '🟡' : '🔴';
        const modulos = App.cursoData.modulos.filter(m => m.nivel === nivel.id);
        html += `
            <div class="level-section ${nivel.id}">
                <div class="level-title"><span>${emoji} ${nivel.nome}</span><span>${nivel.codigo}</span></div>
                <div class="modules-grid">
                    ${modulos.map(m => `
                        <div class="module-card">
                            <div class="module-name">${m.nome}</div>
                            <div class="lessons-grid">
                                ${m.aulas.map(num => {
                                    const cur = num === App.aulaNumero;
                                    const done = App.grades.some(g => g.lesson === num);
                                    return `<button class="lesson-btn ${cur ? 'current' : ''} ${done ? 'done' : ''}" onclick="goToLesson(${num})">${num}</button>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function goToLesson(num) { loadLesson(num); switchTab('aula'); }

// ==================== ÁUDIO ====================
function initVoices() {
    const load = () => { App.spanishVoice = speechSynthesis.getVoices().find(v => v.lang.startsWith('es')) || null; };
    load(); speechSynthesis.onvoiceschanged = load;
}

function checkVoice() {
    const el = document.getElementById('voiceStatus');
    if (el) { el.textContent = App.spanishVoice ? '✓ Voz ES' : '⚠ Padrão'; el.style.color = App.spanishVoice ? '#22c55e' : '#eab308'; }
}

function speak(text) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (App.spanishVoice) u.voice = App.spanishVoice;
    u.lang = 'es-ES'; u.rate = 0.85;
    speechSynthesis.speak(u);
}

function togglePlay() {
    App.isPlaying = !App.isPlaying;
    document.getElementById('playIcon').textContent = App.isPlaying ? '⏸' : '▶';
    if (App.isPlaying) { if (App.currentPartIndex >= App.aulaAtual.audio.length) App.currentPartIndex = 0; playAudio(); }
    else speechSynthesis.cancel();
}

function playAudio() {
    if (!App.isPlaying || App.currentPartIndex >= App.aulaAtual.audio.length) {
        App.isPlaying = false; App.currentPartIndex = 0;
        document.getElementById('playIcon').textContent = '▶'; return;
    }
    const part = App.aulaAtual.audio[App.currentPartIndex];
    const u = new SpeechSynthesisUtterance(part.text);
    if (App.spanishVoice) u.voice = App.spanishVoice;
    u.lang = 'es-ES'; u.rate = App.playbackSpeed;
    u.onend = () => {
        App.currentPartIndex++;
        document.getElementById('progressFill').style.width = (App.currentPartIndex / App.aulaAtual.audio.length * 100) + '%';
        if (App.isPlaying) setTimeout(playAudio, part.pause || 500);
    };
    speechSynthesis.speak(u);
}

function changeSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5];
    App.playbackSpeed = speeds[(speeds.indexOf(App.playbackSpeed) + 1) % speeds.length];
    document.getElementById('speedText').textContent = App.playbackSpeed + 'x';
}

function seekAudio(e) {
    const pct = (e.clientX - e.target.getBoundingClientRect().left) / e.target.offsetWidth;
    App.currentPartIndex = Math.floor(pct * App.aulaAtual.audio.length);
    document.getElementById('progressFill').style.width = (pct * 100) + '%';
}

// ==================== TESTE ====================
function submitTest() {
    const a = App.aulaAtual;
    let score = 0;
    a.teste.forEach((q, i) => {
        const card = document.getElementById(`q${i}`);
        const fb = document.getElementById(`fb${i}`);
        card.classList.remove('correct', 'wrong');
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        const ok = sel && parseInt(sel.value) === q.correta;
        if (ok) score++;
        card.classList.add(ok ? 'correct' : 'wrong');
        fb.innerHTML = ok ? `<span class="fb-correct">✓ Correto!</span>` : `<span class="fb-wrong">✗ Resposta: ${q.opcoes[q.correta]}</span>`;
        if (q.explicacao) fb.innerHTML += `<p class="fb-explain">${q.explicacao}</p>`;
        fb.style.display = 'block';
    });
    const grade = Math.round((score / a.teste.length) * 10);
    const emoji = grade >= 8 ? '🎉' : grade >= 6 ? '👍' : '📚';
    const msg = grade >= 8 ? 'Excelente!' : grade >= 6 ? 'Bom trabalho!' : 'Continue praticando!';
    document.getElementById('testResults').innerHTML = `
        <div class="result ${grade >= 8 ? 'great' : grade >= 6 ? 'good' : ''}">
            <span class="result-emoji">${emoji}</span>
            <span class="result-grade">${grade}/10</span>
            <span class="result-detail">(${score} de ${a.teste.length} questões)</span>
            <span class="result-msg">${msg}</span>
        </div>
    `;
    saveGrade(grade);
}

function saveGrade(grade) {
    App.grades = App.grades.filter(g => g.lesson !== App.aulaNumero);
    App.grades.push({ lesson: App.aulaNumero, title: App.aulaAtual.titulo, grade, date: new Date().toLocaleDateString('pt-BR') });
    localStorage.setItem('grades', JSON.stringify(App.grades));
    renderGrades(); updateProgress(); renderCourseGrid();
}

// ==================== NOTAS ====================
function renderGrades() {
    const container = document.getElementById('gradesContainer');
    if (!container) return;
    if (!App.grades.length) {
        container.innerHTML = `<div class="empty"><span>📝</span><h3>Nenhuma nota ainda</h3><p>Complete os testes para ver suas notas!</p></div>`;
        return;
    }
    const avg = App.grades.reduce((s, g) => s + g.grade, 0) / App.grades.length;
    container.innerHTML = `
        <div class="grades-summary">
            <div class="stat"><span>${App.grades.length}</span><small>Aulas</small></div>
            <div class="stat highlight"><span>${avg.toFixed(1)}</span><small>Média</small></div>
            <div class="stat"><span>${Math.round(App.grades.length/200*100)}%</span><small>Progresso</small></div>
        </div>
        <h4>📊 Histórico</h4>
        <div class="grades-list">
            ${App.grades.slice().reverse().map(g => `
                <div class="grade-item" onclick="goToLesson(${g.lesson})">
                    <div><strong>Aula ${g.lesson}</strong><br><small>${g.title}</small></div>
                    <div class="score ${g.grade >= 8 ? 'great' : g.grade >= 6 ? 'good' : ''}">${g.grade}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== CHAT ====================
function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    addMessage(msg, 'user');
    input.value = '';
    setTimeout(() => {
        const responses = [
            { es: '¡Muy bien! Tu español está mejorando mucho.', pt: 'Muito bem! Seu espanhol está melhorando!' },
            { es: '¡Excelente! Sigue practicando todos los días.', pt: 'Excelente! Continue praticando!' },
            { es: '¡Perfecto! ¿Tienes alguna pregunta?', pt: 'Perfeito! Tem alguma pergunta?' }
        ];
        const r = responses[Math.floor(Math.random() * responses.length)];
        addMessage(r.es, 'sofia', r.pt);
    }, 800);
}

function addMessage(text, sender, translation = '') {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = `<p>${text}</p>${translation ? `<small>${translation}</small>` : ''}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function handleChatKey(e) { if (e.key === 'Enter') sendChat(); }

// ==================== UI ====================
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });
}

function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
    document.getElementById(`tab-${name}`)?.classList.add('active');
}

function updateProgress() {
    const lesson = document.getElementById('headerLesson');
    const level = document.getElementById('headerLevel');
    const avg = document.getElementById('headerAvg');
    if (lesson) lesson.textContent = App.aulaNumero;
    if (level) level.textContent = App.aulaNumero <= 80 ? 'Básico' : App.aulaNumero <= 144 ? 'Intermediário' : 'Avançado';
    if (avg) avg.textContent = App.grades.length ? (App.grades.reduce((s, g) => s + g.grade, 0) / App.grades.length).toFixed(1) : '--';
}

// ==================== PWA ====================
let deferredPrompt;
function setupPWA() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; document.getElementById('installBanner')?.classList.add('show'); });
}
function installApp() { deferredPrompt?.prompt(); deferredPrompt = null; document.getElementById('installBanner')?.classList.remove('show'); }
function dismissInstall() { document.getElementById('installBanner')?.classList.remove('show'); }
