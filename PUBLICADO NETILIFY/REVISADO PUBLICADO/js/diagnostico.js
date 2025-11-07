// ✅ Optimized and cleaned by Codex. All logic preserved. Ready for deployment on Netlify.
// ✅ Código otimizado e limpo. Toda a lógica preservada. Pronto para publicação.
// Smart Lean 5S 10X - Checklist Dinâmico
// Seções principais: Dataset, Renderização, Persistência, Progresso, Finalização/Navegação
// Nota de linguagem: "estação de trabalho", "posto de trabalho" e "frente de serviço"
// são sinônimos aqui para se adaptar a diferentes realidades (obra, mina, fábrica).

document.addEventListener('DOMContentLoaded', () => {
  // Dataset: 5 sensos, 4 questões cada (linguagem simples e direta)
  const DATA = [
    {
      id: 'utilizacao',
      titulo: 'Utilização',
      perguntas: [
        'Itens desnecessários foram removidos do posto/estação de trabalho?',
        'Somente ferramentas essenciais estão presentes na frente de serviço?',
        'Estoque mínimo está definido e visível?',
        'A frequência de uso orienta a alocação dos itens?'
      ],
    },
    {
      id: 'organizacao',
      titulo: 'Organização',
      perguntas: [
        'Itens possuem local definido e identificado?',
        'Fluxo de trabalho é claro e sem cruzamentos?',
        'Sinalizações estão legíveis e padronizadas?',
        'Materiais estão dispostos conforme a sequência de uso?'
      ],
    },
    {
      id: 'limpeza',
      titulo: 'Limpeza',
      perguntas: [
        'Áreas e equipamentos estão limpos e inspecionados?',
        'Fontes de sujeira foram identificadas e tratadas?',
        'Há responsáveis e rotina definida para limpeza?',
        'Materiais de limpeza estão acessíveis e organizados?'
      ],
    },
    {
      id: 'padronizacao',
      titulo: 'Padronização',
      perguntas: [
        'Padrões e procedimentos visuais estão publicados?',
        'Pontos de controle e checklists estão disponíveis?',
        'Regras de reposição e organização são consistentes?',
        'Indicadores e metas são comunicados e acompanhados?'
      ],
    },
    {
      id: 'disciplina',
      titulo: 'Disciplina',
      perguntas: [
        'Treinamentos em 5S ocorrem regularmente?',
        'Auditorias e feedbacks são realizados?',
        'Boas práticas são reconhecidas e mantidas?',
        'Desvios geram planos de ação?'
      ],
    },
  ];

  const TOTAL_QUESTOES = DATA.reduce((acc, s) => acc + s.perguntas.length, 0); // 20

  // Persistência: recuperar respostas parciais
  const answersKey = 'respostas5S';
  const saved = safeRead(answersKey) || {};

  // Renderização dinâmica no #checklist
  const mount = document.getElementById('checklist');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const btnBack = document.getElementById('btn-back');
  const btnFinish = document.getElementById('btn-finish');
  if (!mount || !progressBar || !btnBack || !btnFinish) return;

  mount.innerHTML = DATA.map((senso) => renderSenso(senso)).join('');

  // Reaplicar respostas salvas
  for (const [qid, val] of Object.entries(saved)) {
    const input = mount.querySelector(`input[name="${qid}"][value="${val}"]`);
    if (input) {
      input.checked = true;
      const lbl = input.closest('label');
      if (lbl) lbl.classList.add('is-selected');
    }
  }

  // Eventos: mudança em qualquer opção
  mount.addEventListener('change', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (el.type !== 'radio') return;
    const { name, value } = el;
    saved[name] = value; // 3,2,1,NA
    safeWrite(answersKey, saved);

    // Atualiza destaque visual do grupo
    const groupInputs = mount.querySelectorAll(`input[name="${name}"]`);
    groupInputs.forEach((inp) => {
      const lbl = inp.closest('label');
      if (lbl) lbl.classList.toggle('is-selected', inp.checked);
    });

    updateProgress();
  });

  // Navegação
  btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  btnFinish.addEventListener('click', () => {
    // Validar completude
    const totalRespondidas = Object.keys(saved).length;
    if (totalRespondidas < TOTAL_QUESTOES) return;

    // Construir sumário estruturado
    const resumo = buildSummary(DATA, saved);
    const payload = {
      meta: { geradoEm: new Date().toISOString(), versao: '1.0.0' },
      senses: resumo.senses,
      overall: resumo.overall,
    };

    try {
      localStorage.setItem('meta5S', JSON.stringify(payload));
    } catch (err) {
      alert('Não foi possível salvar os dados localmente.');
      return;
    }
    window.location.href = 'resultado.html';
  });

  // Inicializar progresso
  updateProgress();

  // --- Funções ---

  function renderSenso(senso) {
    const { id, titulo, perguntas } = senso;
    const blocks = perguntas.map((q, idx) => {
      const qid = `${id}-${idx + 1}`;
      return `
        <div class="fieldset" role="group" aria-labelledby="${qid}-label">
          <div class="field">
            <label id="${qid}-label">${idx + 1}. ${q}</label>
            <div class="actions" style="margin-top:4px; gap: 6px; flex-wrap: wrap;">
              ${renderOption(qid, '3', 'Conforme (3)')}
              ${renderOption(qid, '2', 'Atende parcialmente (2)')}
              ${renderOption(qid, '1', 'Não conforme (1)')}
              ${renderOption(qid, 'NA', 'Não se aplica (NA)')}
            </div>
          </div>
        </div>
      `;
    });

    return `
      <div class="card">
        <h3>${titulo}</h3>
        <div class="stack" style="margin-top:8px;">
          ${blocks.join('')}
        </div>
      </div>
    `;
  }

  function renderOption(name, value, label) {
    const id = `${name}-${value}`;
    const cls = value === 'NA' ? 'opt-na' : `opt-${value}`;
    return `
      <label class="button ${cls}" for="${id}" style="cursor:pointer;">
        <input id="${id}" type="radio" name="${name}" value="${value}" style="position:absolute;opacity:0;width:1px;height:1px;" />
        ${label}
      </label>
    `;
  }

  function updateProgress() {
    const totalRespondidas = Object.keys(saved).length;
    const pct = Math.round((totalRespondidas / TOTAL_QUESTOES) * 100);
    progressBar.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${totalRespondidas}/${TOTAL_QUESTOES} respondidas`;
    btnFinish.disabled = totalRespondidas !== TOTAL_QUESTOES;
  }

  function buildSummary(data, answers) {
    const senses = {};
    let overallSum = 0;
    let overallMax = 0;
    data.forEach((s) => {
      const q = s.perguntas.map((text, idx) => {
        const qid = `${s.id}-${idx + 1}`;
        const raw = answers[qid];
        const score = raw === 'NA' ? null : Number(raw);
        return { id: qid, text, answerRaw: raw, score };
      });
      const validScores = q.map(x => x.score).filter(v => typeof v === 'number');
      const sum = validScores.reduce((a, b) => a + b, 0);
      const na = q.length - validScores.length;
      const max = (q.length - na) * 3;
      const avg = max > 0 ? sum / (q.length - na) : null;
      const pct = avg != null ? (avg / 3) * 100 : null;

      senses[s.id] = {
        title: s.titulo,
        questions: q,
        counts: { total: q.length, answered: q.length, na },
        totals: { sum, max, avg, pct },
      };

      overallSum += sum;
      overallMax += max;
    });

    const overall = {
      sum: overallSum,
      max: overallMax,
      avg: overallMax > 0 ? overallSum / (overallMax / 3) : null, // média em escala 0-3
      pct: overallMax > 0 ? (overallSum / overallMax) * 100 : null,
    };

    return { senses, overall };
  }

  function safeRead(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
  }
});
