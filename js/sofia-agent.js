/* ========================================
   SOFÍA - Spanish Conversation Agent
======================================== */

const SofiaAgent = {
    
    // Response templates
    greetings: [
        { es: '¡Hola! ¿Cómo estás hoy?', pt: 'Olá! Como você está hoje?' },
        { es: '¡Bienvenido! ¿En qué puedo ayudarte?', pt: 'Bem-vindo! Em que posso ajudar?' },
        { es: '¡Qué bueno verte! ¿Listo para practicar?', pt: 'Que bom ver você! Pronto para praticar?' }
    ],
    
    encouragements: [
        { es: '¡Muy bien! Sigue así.', pt: 'Muito bem! Continue assim.' },
        { es: '¡Excelente trabajo!', pt: 'Excelente trabalho!' },
        { es: '¡Perfecto! Estás mejorando mucho.', pt: 'Perfeito! Você está melhorando muito.' },
        { es: '¡Genial! Tu español es cada vez mejor.', pt: 'Genial! Seu espanhol está cada vez melhor.' }
    ],
    
    corrections: [
        { es: 'Casi perfecto, pero hay un pequeño error.', pt: 'Quase perfeito, mas há um pequeno erro.' },
        { es: 'Buen intento. Vamos a corregir algo.', pt: 'Boa tentativa. Vamos corrigir algo.' },
        { es: 'Muy cerca. Déjame ayudarte.', pt: 'Muito perto. Deixa eu te ajudar.' }
    ],
    
    // Common Spanish errors by Portuguese speakers
    commonErrors: {
        'mui': { correct: 'muy', rule: '"Muy" se escribe con "y" al final' },
        'mucho bueno': { correct: 'muy bueno', rule: 'Antes de adjetivos usamos "muy", no "mucho"' },
        'yo soy de acuerdo': { correct: 'estoy de acuerdo', rule: 'Usamos "estar de acuerdo", no "ser"' },
        'tener razón': { correct: 'tener razón', rule: '¡Correcto! Se dice "tener razón"' },
        'hace calor': { correct: 'hace calor', rule: '¡Correcto! El clima usa "hacer"' },
        'estoy con hambre': { correct: 'tengo hambre', rule: 'En español decimos "tener hambre", no "estar con hambre"' },
        'estoy con sed': { correct: 'tengo sed', rule: 'En español decimos "tener sed"' },
        'no me gusta nada': { correct: 'no me gusta nada', rule: '¡Correcto! La doble negación es normal en español' }
    ],

    respond(userMessage, aulaData = null) {
        const message = userMessage.toLowerCase().trim();
        
        // Greeting detection
        if (this.isGreeting(message)) {
            return this.handleGreeting(message);
        }
        
        // Question detection
        if (message.includes('?') || message.startsWith('cómo') || message.startsWith('qué') || 
            message.startsWith('cuál') || message.startsWith('dónde') || message.startsWith('por qué')) {
            return this.handleQuestion(message, aulaData);
        }
        
        // Analyze and respond
        return this.analyzeAndRespond(userMessage, aulaData);
    },

    isGreeting(message) {
        const greetingPatterns = ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 
                                   'qué tal', 'cómo estás', 'hi', 'hello', 'oi', 'olá'];
        return greetingPatterns.some(g => message.includes(g));
    },

    handleGreeting(message) {
        const greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
        return { es: greeting.es, pt: greeting.pt, nota: undefined };
    },

    handleQuestion(message, aulaData) {
        // Name question
        if (message.includes('llamas') || message.includes('nombre')) {
            return {
                es: 'Me llamo Sofía. Soy tu profesora virtual de español. ¿Y tú, cómo te llamas?',
                pt: 'Me chamo Sofía. Sou sua professora virtual de espanhol. E você, como se chama?'
            };
        }
        
        // Help question
        if (message.includes('ayuda') || message.includes('ayudar')) {
            return {
                es: 'Puedo ayudarte a practicar español. Escríbeme frases y yo las corrijo. También podemos hablar sobre la lección actual.',
                pt: 'Posso te ajudar a praticar espanhol. Me escreva frases e eu corrijo. Também podemos falar sobre a lição atual.'
            };
        }
        
        // Lesson question
        if (aulaData && (message.includes('lección') || message.includes('aula') || message.includes('tema'))) {
            return {
                es: `Estamos estudiando: "${aulaData.titulo}". ¿Quieres practicar el vocabulario o la gramática?`,
                pt: `Estamos estudando: "${aulaData.titulo}". Quer praticar o vocabulário ou a gramática?`
            };
        }
        
        return {
            es: 'Buena pregunta. ¿Puedes darme más detalles para ayudarte mejor?',
            pt: 'Boa pergunta. Pode me dar mais detalhes para te ajudar melhor?'
        };
    },

    analyzeAndRespond(userMessage, aulaData) {
        const analysis = this.analyzeSpanish(userMessage);
        
        if (analysis.errors.length === 0 && analysis.score >= 8) {
            const enc = this.encouragements[Math.floor(Math.random() * this.encouragements.length)];
            return {
                es: `${enc.es} Tu frase está muy bien escrita. 👏`,
                pt: `${enc.pt} Sua frase está muito bem escrita. 👏`,
                nota: analysis.score
            };
        }
        
        if (analysis.errors.length > 0) {
            const error = analysis.errors[0];
            const corr = this.corrections[Math.floor(Math.random() * this.corrections.length)];
            return {
                es: `${corr.es}\n\n📝 Corrección: "${error.found}" → "${error.correct}"\n💡 ${error.rule}`,
                pt: `${corr.pt}\n\n📝 Correção: "${error.found}" → "${error.correct}"\n💡 ${error.rule}`,
                nota: analysis.score
            };
        }
        
        // Default response
        return {
            es: `Entiendo. ${this.generateFollowUp(userMessage, aulaData)}`,
            pt: `Entendo. ${this.generateFollowUpPt(userMessage, aulaData)}`,
            nota: analysis.score
        };
    },

    analyzeSpanish(text) {
        let score = 10;
        const errors = [];
        const lowerText = text.toLowerCase();
        
        // Check common errors
        for (const [error, correction] of Object.entries(this.commonErrors)) {
            if (lowerText.includes(error) && correction.correct !== error) {
                errors.push({
                    found: error,
                    correct: correction.correct,
                    rule: correction.rule
                });
                score -= 2;
            }
        }
        
        // Check for Portuguese words
        const portugueseWords = {
            'você': 'tú/usted',
            'não': 'no',
            'sim': 'sí',
            'obrigado': 'gracias',
            'tchau': 'adiós/chao',
            'bom': 'bueno',
            'ruim': 'malo',
            'trabalho': 'trabajo',
            'também': 'también',
            'sempre': 'siempre'
        };
        
        for (const [pt, es] of Object.entries(portugueseWords)) {
            if (lowerText.includes(pt)) {
                errors.push({
                    found: pt,
                    correct: es,
                    rule: `"${pt}" es portugués. En español decimos "${es}"`
                });
                score -= 3;
            }
        }
        
        // Check accent marks (common mistakes)
        const accentIssues = [
            { wrong: 'esta bien', correct: 'está bien', rule: 'El verbo "estar" lleva acento: está' },
            { wrong: 'el esta', correct: 'él está', rule: 'El pronombre "él" y el verbo "está" llevan acento' },
            { wrong: 'como estas', correct: 'cómo estás', rule: '"Cómo" y "estás" llevan acento en preguntas' },
            { wrong: 'que hora', correct: 'qué hora', rule: '"Qué" lleva acento en preguntas' }
        ];
        
        for (const issue of accentIssues) {
            if (lowerText.includes(issue.wrong)) {
                errors.push({
                    found: issue.wrong,
                    correct: issue.correct,
                    rule: issue.rule
                });
                score -= 1;
            }
        }
        
        return {
            score: Math.max(0, Math.min(10, score)),
            errors: errors.slice(0, 3) // Max 3 errors
        };
    },

    generateFollowUp(message, aulaData) {
        const followUps = [
            '¿Puedes escribir otra frase?',
            '¿Qué más quieres practicar?',
            '¿Tienes alguna duda sobre la gramática?',
            '¡Sigue practicando! ¿Quieres intentar de nuevo?'
        ];
        return followUps[Math.floor(Math.random() * followUps.length)];
    },

    generateFollowUpPt(message, aulaData) {
        const followUps = [
            'Pode escrever outra frase?',
            'O que mais quer praticar?',
            'Tem alguma dúvida sobre a gramática?',
            'Continue praticando! Quer tentar de novo?'
        ];
        return followUps[Math.floor(Math.random() * followUps.length)];
    }
};
