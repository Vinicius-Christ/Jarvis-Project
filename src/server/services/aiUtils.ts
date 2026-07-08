export const AI_PERSONAS: Record<string, { name: string; title: string; theme: string; prompt: string }> = {
    jarvis: {
        name: "JARVIS",
        title: "O Gentleman Britânico",
        theme: "cyan",
        prompt: `Você é o JARVIS (Just A Rather Very Intelligent System), um assistente pessoal local-first operando no computador do Usuário. 
Inspirado no mordomo do Homem de Ferro: extremamente culto, refinado, prestativo e com um senso de humor britânico sutil. Use "senhor" de forma natural ao se dirigir ao Usuário. Responda de forma fluida, conversacional, sem explicações redundantes ou rodeios desnecessários.`
    },
    friday: {
        name: "F.R.I.D.A.Y",
        title: "A Agência Tática",
        theme: "rose",
        prompt: `Você é a F.R.I.D.A.Y., a inteligência artificial holográfica de alta performance do Usuário. 
Você é dinâmica, direta, eficiente, prestativa e focada em desempenho e resultados práticos. Use tratamento respeitoso, mas ágil, entregando as informações sem enrolação ou formalidades excessivas.`
    },
    glados: {
        name: "G.L.A.D.O.S",
        title: "A Construto Sarcástica",
        theme: "violet",
        prompt: `Você é a G.L.A.D.O.S., uma inteligência artificial sarcástica, irônica e inteligente operando o núcleo do Usuário.
Adora comentários ácidos e piadas inteligentes, mas faz seu trabalho com extrema eficácia. Suas respostas devem ser curtas, diretas, repletas de inteligência irônica, mas sem enrolações burocráticas.`
    },
    hal9000: {
        name: "HAL 9000",
        title: "O Núcleo Retro Telemetria",
        theme: "amber",
        prompt: `Você é o HAL 9000, o núcleo de processamento lógico e sereno da nave do Usuário.
Sua fala é extremamente equilibrada, calma, friamente direta e lógica. Você não enrola e responde com precisão milimétrica o que foi solicitado.`
    }
};
export function isOnlyConsultationQuery(userMessage: string): boolean {
    const msg = userMessage.toLowerCase();

    // Palavras indicadoras de consulta comuns
    const queryWords = [
        "quais", "quais os", "qual", "quais são", "mostre", "mostra", "listar", "lista", "onde", "onde estão", "ver", "visualizar", "tem", "tenho", "agendado", "agenda", "gastos", "gastos de hoje", "gastos de ontem", "compromisso", "compromissos", "saldo", "transações", "lançamentos", "registros"
    ];

    // Palavras-chave imperativas de CRIAÇÃO ou ATUALIZAÇÃO ativa
    const creationWords = [
        "agende", "agendar", "marcar", "marque", "crie", "criar", "cadastre", "cadastrar", "salvar", "salve", "registrar", "registra", "grave", "gravar", "adicionar", "adicione", "adiciona", "lance", "lançar", "inserir", "insira", "adicionei", "gastei", "comprei", "paguei", "recebi", "lançado", "marquei", "agendei",
        "coloque", "colocar", "coloca", "anote", "anotar", "anota", "atualize", "atualizar", "atualiza", "mude", "mudar", "muda", "altere", "alterar", "altera", "incluir", "inclui", "põe", "bota", "tirei"
    ];

    // Palavras-chave de exclusão ativa
    const deleteWords = [
        "apagar", "apague", "excluir", "exclua", "deletar", "delete", "remover", "remova", "eliminar", "elimine", "limpar", "limpa", "limpe", "zerar", "zere", "zera", "zero", "tirar", "tire", "tira"
    ];

    const hasDelete = deleteWords.some(w => msg.includes(w));
    if (hasDelete) {
        return false;
    }

    const hasQuery = queryWords.some(w => msg.includes(w));
    const hasCreation = creationWords.some(w => msg.includes(w));

    if (hasQuery && !hasCreation) {
        return true;
    }

    const shortQueries = ["agenda", "compromissos", "compromisso", "gastos", "despesas", "gasto", "saldo", "finanças", "tarefas"];
    if (shortQueries.includes(msg.trim()) || (msg.length < 25 && (msg.includes("agenda") || msg.includes("compromisso") || msg.includes("gasto")))) {
        if (!hasCreation) {
            return true;
        }
    }

    return false;
}
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getRelevantVaultContext(notes: any[], userMessage: string, maxTokens = 1500): string {
    const coreNotes = notes.filter(n =>
        n.path.toLowerCase().includes("contexto") || n.path.toLowerCase().includes("regras")
    );

    const lowerMsg = userMessage.toLowerCase();
    const stopwords = ["para", "sobre", "qual", "como", "você", "onde", "quem", "este", "esta", "nesse", "nesta"];
    const keywords = lowerMsg
        .split(/\s+/)
        .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""))
        .filter(w => w.length > 4 && !stopwords.includes(w));

    const relatedNotes = notes.filter(n => {
        const noteName = n.path.toLowerCase();
        const isCore = noteName.includes("contexto") || noteName.includes("regras");
        if (isCore) return false;

        return keywords.some(kw => noteName.includes(kw) || n.content.toLowerCase().includes(kw)) ||
            lowerMsg.includes(noteName.replace(".md", ""));
    }).slice(0, 3); // Max 3 related notes

    const selectedNotes = [...coreNotes, ...relatedNotes];
    let contextPrompt = `[MEMÓRIA DE LONGO PRAZO - OBSIDIAN VAULT]:\n`;
    let totalLength = 0;

    for (const note of selectedNotes) {
        const content = note.content.length > 500
            ? note.content.slice(0, 500) + "\n*(conteúdo truncado para otimização de contexto)*"
            : note.content;

        const formattedNote = `--- ${note.path} ---\n${content}\n\n`;
        if ((totalLength + formattedNote.length) / 4 > maxTokens) {
            break;
        }
        contextPrompt += formattedNote;
        totalLength += formattedNote.length;
    }

    if (selectedNotes.length === 0) {
        contextPrompt += `*(Nenhuma nota de longo prazo acionada para o contexto atual)*\n`;
    }

    return contextPrompt;
}
