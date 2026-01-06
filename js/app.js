/* ========================================
   ESPAÑOL VIRTUAL - Main Application
======================================== */

const App = {
    aulaNumero: 1,
    totalAulas: 200,
    cursoData: null,
    aulaData: null,
    grades: [],
    deferredPrompt: null
};

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    try {
        // Load saved data
        loadProgress();
        
        // Load course structure
        await loadCursoData();
        
        // Load current lesson
        await loadAula(App.aulaNumero);
        
        // Update UI
        updateStats();
        updateCourseOverview();
        updateGradesTab();
        
        // Hide splash screen
        setTimeout(() => {
            document.getElementById('splashScreen').classList.add('hidden');
        }, 1500);
        
        // Setup PWA install prompt
        setupInstallPrompt();
        
        // Register service worker
        registerServiceWorker();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('splashScreen').classList.add('hidden');
    }
}

/* ========================================
   DATA LOADING
======================================== */

async function loadCursoData() {
    try {
        const response = await fetch('data/curso.json');
        App.cursoData = await response.json();
    } catch (error) {
        console.error('Error loading curso data:', error);
        // Create default structure
        App.cursoData = createDefaultCursoData();
    }
}

async function loadAula(numero) {
    const container = document.getElementById('lessonContainer');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando aula ${numero}...</p>
        </div>
    `;
    
    try {
        const modulo = String(Math.ceil(numero / 8)).padStart(2, '0');
        const aulaFile = String(numero).padStart(3, '0');
        const response = await fetch(`aulas/modulo-${modulo}/aula-${aulaFile}.json`);
        
        if (!response.ok) throw new Error('Aula not found');
        
        App.aulaData = await response.json();
        App.aulaNumero = numero;
        
        renderAula();
        updateLessonNavigation();
        saveProgress();
        
    } catch (error) {
        console.error('Error loading aula:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Aula não encontrada</h3>
                <p>Não foi possível carregar a aula ${numero}.</p>
            </div>
        `;
    }
}

/* ========================================
   RENDERING
======================================== */

function renderAula() {
    const aula = App.aulaData;
    const container = document.getElementById('lessonContainer');
    
    let html = `
        <h2 class="lesson-title">${aula.titulo}</h2>
        <div class="lesson-meta">
            <span class="meta-badge nivel-${aula.nivel}">${aula.nivel.toUpperCase()}</span>
            <span class="meta-badge">📖 Módulo ${aula.modulo}</span>
            <span class="meta-badge">⏱️ ${aula.duracao || '15 min'}</span>
        </div>
    `;
    
    // Vocabulary Section
    if (aula.vocabulario && aula.vocabulario.length > 0) {
        html += `
            <div class="lesson-section">
                <h3 class="section-title">📝 Vocabulário</h3>
                <div class="vocab-grid">
                    ${aula.vocabulario.map((item, idx) => `
                        <div class="vocab-item">
                            <span class="vocab-es">${item.espanol}</span>
                            <span class="vocab-pt">${item.portugues}</span>
                            <button class="vocab-audio" onclick="speak('${item.espanol.replace(/'/g, "\\'")}')">🔊</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Grammar Section
    if (aula.gramatica) {
        html += `
            <div class="lesson-section">
                <h3 class="section-title">📖 Gramática</h3>
                <div class="grammar-content">
                    <h4>${aula.gramatica.titulo}</h4>
                    <p>${aula.gramatica.explicacao}</p>
                    ${aula.gramatica.exemplos ? `
                        <div class="grammar-example">
                            ${aula.gramatica.exemplos.map(ex => `
                                <p class="es">${ex.espanol}</p>
                                <p class="pt">${ex.portugues}</p>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Dialog Section
    if (aula.dialogo && aula.dialogo.length > 0) {
        html += `
            <div class="lesson-section">
                <h3 class="section-title">💬 Diálogo</h3>
                <div class="dialog-container">
                    ${aula.dialogo.map(line => `
                        <div class="dialog-line">
                            <span class="dialog-speaker">${line.pessoa}:</span>
                            <p class="dialog-text">${line.espanol}</p>
                            <p class="dialog-translation">${line.portugues}</p>
                        </div>
                    `).join('')}
                </div>
                <button class="submit-btn" style="margin-top: 1rem; width: 100%;" onclick="playDialog()">
                    🔊 Ouvir Diálogo
                </button>
            </div>
        `;
    }
    
    // Test Section
    if (aula.teste && aula.teste.length > 0) {
        html += `
            <div class="lesson-section">
                <h3 class="section-title">✏️ Teste</h3>
                <div class="test-container" id="testContainer">
                    ${renderTest(aula.teste)}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function renderTest(questoes) {
    return questoes.map((q, idx) => {
        if (q.tipo === 'multipla') {
            return `
                <div class="test-question" id="question-${idx}">
                    <p class="question-text">${idx + 1}. ${q.pergunta}</p>
                    <div class="question-options">
                        ${q.opcoes.map((opt, optIdx) => `
                            <button class="option-btn" onclick="checkAnswer(${idx}, ${optIdx}, ${q.correta})">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (q.tipo === 'dissertativa') {
            return `
                <div class="test-question" id="question-${idx}">
                    <p class="question-text">${idx + 1}. ${q.pergunta}</p>
                    <textarea class="dissertative-input" id="dissertativa-${idx}" 
                              placeholder="Escreva sua resposta em espanhol..."></textarea>
                    <button class="submit-btn" onclick="checkDissertativa(${idx})">
                        Verificar Resposta
                    </button>
                    <div class="feedback-box" id="feedback-${idx}"></div>
                </div>
            `;
        }
        return '';
    }).join('');
}

/* ========================================
   TEST FUNCTIONS
======================================== */

function checkAnswer(questionIdx, selectedIdx, correctIdx) {
    const questionEl = document.getElementById(`question-${questionIdx}`);
    const buttons = questionEl.querySelectorAll('.option-btn');
    
    buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === correctIdx) {
            btn.classList.add('correct');
        } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
            btn.classList.add('incorrect');
        }
    });
    
    const isCorrect = selectedIdx === correctIdx;
    const grade = isCorrect ? 10 : 0;
    
    saveGrade(App.aulaNumero, `Questão ${questionIdx + 1}`, grade);
}

function checkDissertativa(questionIdx) {
    const textarea = document.getElementById(`dissertativa-${questionIdx}`);
    const feedback = document.getElementById(`feedback-${questionIdx}`);
    const resposta = textarea.value.trim();
    
    if (!resposta) {
        feedback.className = 'feedback-box visible error';
        feedback.innerHTML = '⚠️ Por favor, escreva uma resposta.';
        return;
    }
    
    // Use validador for evaluation
    const questao = App.aulaData.teste[questionIdx];
    const resultado = ValidadorDissertativas.validar(resposta, questao.esperado || [], questao.contexto || '');
    
    feedback.className = `feedback-box visible ${resultado.nota >= 6 ? 'success' : 'error'}`;
    feedback.innerHTML = `
        <strong>Nota: ${resultado.nota}/10</strong><br>
        ${resultado.feedback}
        ${resultado.correcao ? `<br><em>Sugestão: ${resultado.correcao}</em>` : ''}
    `;
    
    saveGrade(App.aulaNumero, `Dissertativa ${questionIdx + 1}`, resultado.nota);
}

/* ========================================
   AUDIO FUNCTIONS
======================================== */

function speak(text, lang = 'es-ES') {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function playDialog() {
    if (!App.aulaData.dialogo) return;
    
    const lines = App.aulaData.dialogo;
    let delay = 0;
    
    lines.forEach((line, idx) => {
        setTimeout(() => {
            speak(line.espanol);
        }, delay);
        delay += (line.espanol.length * 80) + 1000;
    });
}

/* ========================================
   NAVIGATION
======================================== */

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
}

function prevLesson() {
    if (App.aulaNumero > 1) {
        loadAula(App.aulaNumero - 1);
    }
}

function nextLesson() {
    if (App.aulaNumero < App.totalAulas) {
        loadAula(App.aulaNumero + 1);
    }
}

function goToLesson(numero) {
    loadAula(numero);
    switchTab('aula');
}

function updateLessonNavigation() {
    document.getElementById('lessonNumber').textContent = `Aula ${App.aulaNumero}/${App.totalAulas}`;
    document.getElementById('btnPrev').disabled = App.aulaNumero <= 1;
    document.getElementById('btnNext').disabled = App.aulaNumero >= App.totalAulas;
}

/* ========================================
   COURSE OVERVIEW
======================================== */

function updateCourseOverview() {
    const container = document.getElementById('courseOverview');
    if (!container || !App.cursoData) return;
    
    container.innerHTML = App.cursoData.niveis.map(nivel => `
        <div class="level-card">
            <div class="level-header ${nivel.id}" onclick="toggleLevel(this)">
                <div class="level-title">
                    ${nivel.id === 'basico' ? '🟢' : nivel.id === 'intermediario' ? '🟡' : '🔴'}
                    ${nivel.nome} (${nivel.codigo})
                </div>
                <div class="level-progress">${nivel.aulas}</div>
            </div>
            <div class="module-list ${nivel.id === 'basico' ? 'expanded' : ''}">
                ${App.cursoData.modulos
                    .filter(m => m.nivel === nivel.id)
                    .map(m => renderModule(m))
                    .join('')}
            </div>
        </div>
    `).join('');
}

function renderModule(modulo) {
    const isCurrentModule = modulo.aulas.includes(App.aulaNumero);
    
    return `
        <div class="module-container">
            <div class="module-header ${isCurrentModule ? 'current' : ''}" onclick="toggleModule(this)">
                <span>📖 Módulo ${modulo.id}: ${modulo.nome}</span>
                <span class="module-toggle">▼</span>
            </div>
            <div class="aulas-list">
                ${modulo.aulas.map(aulaNum => {
                    const isCurrent = aulaNum === App.aulaNumero;
                    const isCompleted = App.grades.some(g => g.aula === aulaNum);
                    return `
                        <div class="aula-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" 
                             onclick="goToLesson(${aulaNum})">
                            Aula ${aulaNum}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function toggleLevel(header) {
    const moduleList = header.nextElementSibling;
    moduleList.classList.toggle('expanded');
}

function toggleModule(header) {
    header.classList.toggle('expanded');
    const aulasList = header.nextElementSibling;
    aulasList.classList.toggle('expanded');
}

/* ========================================
   GRADES
======================================== */

function saveGrade(aula, titulo, nota) {
    const grade = {
        aula,
        titulo,
        nota,
        data: new Date().toISOString()
    };
    
    // Remove duplicate
    App.grades = App.grades.filter(g => !(g.aula === aula && g.titulo === titulo));
    App.grades.push(grade);
    
    saveProgress();
    updateStats();
    updateGradesTab();
}

function updateGradesTab() {
    const list = document.getElementById('gradesList');
    const totalEl = document.getElementById('totalLessons');
    const avgEl = document.getElementById('avgGrade');
    
    // Calculate stats
    const completedAulas = [...new Set(App.grades.map(g => g.aula))].length;
    const avgGrade = App.grades.length > 0 
        ? (App.grades.reduce((sum, g) => sum + g.nota, 0) / App.grades.length).toFixed(1)
        : '--';
    
    totalEl.textContent = completedAulas;
    avgEl.textContent = avgGrade;
    
    if (App.grades.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Nenhuma nota ainda</h3>
                <p>Complete os testes para ver suas notas.</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sortedGrades = [...App.grades].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    list.innerHTML = sortedGrades.slice(0, 50).map(g => {
        const gradeClass = g.nota >= 7 ? 'high' : g.nota >= 5 ? 'medium' : 'low';
        const date = new Date(g.data).toLocaleDateString('pt-BR');
        return `
            <div class="grade-item">
                <div class="grade-info">
                    <h4>Aula ${g.aula} - ${g.titulo}</h4>
                    <span>${date}</span>
                </div>
                <span class="grade-value ${gradeClass}">${g.nota}</span>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const completedAulas = [...new Set(App.grades.map(g => g.aula))].length;
    const avgGrade = App.grades.length > 0 
        ? (App.grades.reduce((sum, g) => sum + g.nota, 0) / App.grades.length).toFixed(1)
        : '--';
    
    document.getElementById('statProgress').textContent = `📚 ${completedAulas}/${App.totalAulas}`;
    document.getElementById('statMedia').textContent = `⭐ ${avgGrade}`;
}

/* ========================================
   SOFIA CHAT
======================================== */

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Get Sofia's response
    setTimeout(() => {
        const response = SofiaAgent.respond(message, App.aulaData);
        addChatMessage(response.es, 'sofia', response.pt);
        
        if (response.nota !== undefined) {
            saveGrade(App.aulaNumero, 'Chat com Sofía', response.nota);
        }
    }, 500 + Math.random() * 1000);
}

function addChatMessage(text, sender, translation = null) {
    const container = document.getElementById('chatMessages');
    const msgEl = document.createElement('div');
    msgEl.className = `message ${sender}`;
    
    msgEl.innerHTML = `
        <div class="message-content">
            <p class="msg-es">${text}</p>
            ${translation ? `<p class="msg-pt">${translation}</p>` : ''}
        </div>
    `;
    
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
}

/* ========================================
   PROGRESS MANAGEMENT
======================================== */

function saveProgress() {
    const data = {
        aulaNumero: App.aulaNumero,
        grades: App.grades,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('espanol-virtual-progress', JSON.stringify(data));
}

function loadProgress() {
    try {
        const saved = localStorage.getItem('espanol-virtual-progress');
        if (saved) {
            const data = JSON.parse(saved);
            App.aulaNumero = data.aulaNumero || 1;
            App.grades = data.grades || [];
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function exportProgress() {
    const data = {
        aulaNumero: App.aulaNumero,
        grades: App.grades,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `espanol-virtual-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importProgress() {
    document.getElementById('importFile').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            App.aulaNumero = data.aulaNumero || 1;
            App.grades = data.grades || [];
            saveProgress();
            loadAula(App.aulaNumero);
            updateStats();
            updateGradesTab();
            updateCourseOverview();
            alert('Progresso importado com sucesso!');
        } catch (error) {
            alert('Erro ao importar arquivo. Verifique se o formato está correto.');
        }
    };
    reader.readAsText(file);
}

function resetProgress() {
    if (confirm('Tem certeza que deseja apagar todo o progresso? Esta ação não pode ser desfeita.')) {
        App.aulaNumero = 1;
        App.grades = [];
        localStorage.removeItem('espanol-virtual-progress');
        loadAula(1);
        updateStats();
        updateGradesTab();
        updateCourseOverview();
        alert('Progresso resetado.');
    }
}

/* ========================================
   PWA INSTALL
======================================== */

function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        App.deferredPrompt = e;
        document.getElementById('installBanner').classList.add('visible');
    });
}

function installApp() {
    if (App.deferredPrompt) {
        App.deferredPrompt.prompt();
        App.deferredPrompt.userChoice.then((choice) => {
            App.deferredPrompt = null;
            document.getElementById('installBanner').classList.remove('visible');
        });
    }
}

function dismissInstall() {
    document.getElementById('installBanner').classList.remove('visible');
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.error('SW registration failed:', err));
    }
}

/* ========================================
   DEFAULT DATA
======================================== */

function createDefaultCursoData() {
    return {
        niveis: [
            { id: 'basico', nome: 'Básico', codigo: 'A1-A2', aulas: 'Aulas 1-80' },
            { id: 'intermediario', nome: 'Intermediário', codigo: 'B1-B2', aulas: 'Aulas 81-150' },
            { id: 'avancado', nome: 'Avançado', codigo: 'C1-C2', aulas: 'Aulas 151-200' }
        ],
        modulos: Array.from({ length: 25 }, (_, i) => {
            const modNum = i + 1;
            const startAula = (i * 8) + 1;
            const endAula = Math.min(startAula + 7, 200);
            let nivel = 'basico';
            if (modNum > 10 && modNum <= 19) nivel = 'intermediario';
            if (modNum > 19) nivel = 'avancado';
            
            return {
                id: modNum,
                nome: `Módulo ${modNum}`,
                nivel,
                aulas: Array.from({ length: endAula - startAula + 1 }, (_, j) => startAula + j)
            };
        })
    };
}
