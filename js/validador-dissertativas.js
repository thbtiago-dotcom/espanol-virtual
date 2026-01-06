/* ========================================
   VALIDADOR DE DISSERTATIVAS
======================================== */

const ValidadorDissertativas = {
    
    validar(resposta, esperados = [], contexto = '') {
        if (!resposta || resposta.trim().length === 0) {
            return {
                nota: 0,
                feedback: 'Por favor, escreva uma resposta.',
                correcao: null
            };
        }
        
        const respostaLower = resposta.toLowerCase().trim();
        let nota = 5; // Base score
        let feedback = '';
        let correcao = null;
        
        // Check for exact or near matches with expected answers
        if (esperados && esperados.length > 0) {
            for (const esperado of esperados) {
                const esperadoLower = esperado.toLowerCase();
                
                // Exact match
                if (respostaLower === esperadoLower) {
                    return {
                        nota: 10,
                        feedback: '¡Perfecto! Tu respuesta es exactamente correcta. 🎉',
                        correcao: null
                    };
                }
                
                // Very close match (>80% similarity)
                const similarity = this.calculateSimilarity(respostaLower, esperadoLower);
                if (similarity > 0.8) {
                    return {
                        nota: 9,
                        feedback: '¡Muy bien! Tu respuesta está casi perfecta. 👏',
                        correcao: esperado
                    };
                }
                
                // Partial match (>60% similarity)
                if (similarity > 0.6) {
                    nota = 7;
                    feedback = 'Buen intento. Tu respuesta está en el camino correcto.';
                    correcao = esperado;
                }
                
                // Contains key words
                const palavrasEsperadas = esperadoLower.split(/\s+/);
                const palavrasResposta = respostaLower.split(/\s+/);
                const matches = palavrasEsperadas.filter(p => palavrasResposta.includes(p));
                
                if (matches.length >= palavrasEsperadas.length * 0.5) {
                    nota = Math.max(nota, 6);
                    if (!feedback) {
                        feedback = 'Tu respuesta contiene algunas palabras correctas.';
                        correcao = esperado;
                    }
                }
            }
        }
        
        // Analyze Spanish quality
        const analise = this.analisarEspanhol(resposta);
        nota += analise.bonus;
        nota -= analise.penalidade;
        
        // Length check
        if (resposta.length < 5) {
            nota -= 2;
            feedback = feedback || 'Tu respuesta es muy corta. Intenta escribir más.';
        }
        
        // Add error feedback
        if (analise.erros.length > 0) {
            const errosTexto = analise.erros.slice(0, 2).join('. ');
            feedback = feedback ? `${feedback} ${errosTexto}` : errosTexto;
        }
        
        // Clamp score
        nota = Math.max(0, Math.min(10, Math.round(nota)));
        
        // Default feedback based on score
        if (!feedback) {
            if (nota >= 8) feedback = '¡Excelente respuesta! 🌟';
            else if (nota >= 6) feedback = 'Buena respuesta. Sigue practicando.';
            else if (nota >= 4) feedback = 'Respuesta aceptable, pero puedes mejorar.';
            else feedback = 'Necesitas practicar más. No te rindas.';
        }
        
        return { nota, feedback, correcao };
    },
    
    analisarEspanhol(texto) {
        let bonus = 0;
        let penalidade = 0;
        const erros = [];
        const textoLower = texto.toLowerCase();
        
        // Bonus for proper Spanish constructions
        const boasFormas = [
            { pattern: /¿.*\?/, bonus: 0.5 }, // Question marks
            { pattern: /¡.*!/, bonus: 0.5 }, // Exclamation marks
            { pattern: /está[ns]?|estoy|estamos/, bonus: 0.3 }, // Estar conjugation
            { pattern: /tengo|tienes|tiene|tenemos|tienen/, bonus: 0.3 }, // Tener conjugation
            { pattern: /muy\s+\w+/, bonus: 0.3 }, // "muy" usage
            { pattern: /me\s+gusta|te\s+gusta|le\s+gusta/, bonus: 0.5 } // Gustar
        ];
        
        for (const forma of boasFormas) {
            if (forma.pattern.test(textoLower)) {
                bonus += forma.bonus;
            }
        }
        
        // Penalize Portuguese words
        const palavrasPortuguesas = [
            { pt: 'você', es: 'tú/usted', pen: 1 },
            { pt: 'não', es: 'no', pen: 1 },
            { pt: 'sim', es: 'sí', pen: 0.5 },
            { pt: 'bom', es: 'bueno', pen: 0.5 },
            { pt: 'trabalho', es: 'trabajo', pen: 0.5 },
            { pt: 'também', es: 'también', pen: 0.5 },
            { pt: 'sempre', es: 'siempre', pen: 0.5 },
            { pt: 'agora', es: 'ahora', pen: 0.5 },
            { pt: 'então', es: 'entonces', pen: 0.5 },
            { pt: 'porque', es: 'porque/por qué', pen: 0 } // Same in both
        ];
        
        for (const palavra of palavrasPortuguesas) {
            if (textoLower.includes(palavra.pt) && palavra.pen > 0) {
                penalidade += palavra.pen;
                erros.push(`"${palavra.pt}" → "${palavra.es}"`);
            }
        }
        
        // Common Spanish mistakes
        const errosComuns = [
            { errado: 'mui ', correto: 'muy ', msg: '"muy" con Y' },
            { errado: 'mucho bueno', correto: 'muy bueno', msg: '"muy" antes de adjetivos' },
            { errado: 'mucho malo', correto: 'muy malo', msg: '"muy" antes de adjetivos' },
            { errado: 'soy de acuerdo', correto: 'estoy de acuerdo', msg: '"estar de acuerdo"' },
            { errado: 'tener razón', correto: 'tener razón', msg: '¡Correcto!' }
        ];
        
        for (const erro of errosComuns) {
            if (textoLower.includes(erro.errado)) {
                if (erro.errado !== erro.correto) {
                    penalidade += 0.5;
                    erros.push(erro.msg);
                }
            }
        }
        
        return {
            bonus: Math.min(2, bonus),
            penalidade: Math.min(3, penalidade),
            erros
        };
    },
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
};
