// ✅ Optimized and cleaned by Codex. All logic preserved. Ready for deployment on Netlify.
// ✅ Código otimizado e limpo. Toda a lógica preservada. Pronto para publicação.
// Lógica da página de Resultado — Smart Lean 5S 10X
// Seções: Carregar dados, Calcular médias, Classificar (Vale 5S), Renderizar Nota Geral, Gráfico, Feedback, Navegação
// Linguagem: "estação de trabalho", "posto de trabalho" e "frente de serviço" são sinônimos (use o mais comum localmente).

function formatNumber(n) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
}
function formatOne(n) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

// Classificação oficial Vale 5S (0–3) — retorna nível, rótulo, cor e descrição
// 0.0–0.9 = M1 Crítico (Vermelho), 1.0–1.7 = M2 Regular (Âmbar), 1.8–2.5 = M3 Bom (Azul), 2.6–3.0 = M4 Excelente (Verde)
function getMaturityLevel(score) {
  if (score == null || Number.isNaN(score)) return { level: 'NA', label: 'N/A', color: '#9ca3af', desc: 'Sem dados suficientes.' };
  // Define cor de acordo com a nota média de cada Senso
  // Vermelho = Crítico, Amarelo = Regular, Azul = Bom, Verde = Excelente
  // Regra estrita: nota exatamente 1.0 é classificada como M1 (Crítico)
  if (score === 1.0) {
    return { level: 'M1', label: 'Crítico', color: '#D32F2F', desc: 'Situação crítica. Pontuação igual a 1 indica falha grave que requer ação imediata.' };
  }
  if (score <= 0.9)
    return { level: 'M1', label: 'Crítico', color: '#D32F2F', desc: 'Situação grave. É preciso agir imediatamente.' };
  if (score <= 1.7)
    return { level: 'M2', label: 'Regular', color: '#F9A825', desc: 'Existem práticas, mas com variação. Requer ajustes e padronização.' };
  if (score <= 2.5)
    return { level: 'M3', label: 'Bom', color: '#2196F3', desc: 'Boas práticas aplicadas, mas ainda há oportunidades de melhoria.' };
  return { level: 'M4', label: 'Excelente', color: '#43A047', desc: 'Padrão de excelência e disciplina sustentada.' };
}

// Regra da Restrição (VPS Vale) aplicada ao resultado geral
// - 2+ sensos críticos (≤ 1.0) → Resultado geral = M1 (Crítico)
// - 1 senso crítico (≤ 1.0) → Resultado geral = M2 (Regular)
// - Nenhum senso crítico → segue a média geral normal
function calculateOverallMaturity(sensosMap) {
  const values = Object.values(sensosMap).filter(v => typeof v === 'number');
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const criticalCount = values.filter(v => v <= 1.0).length; // conta notas críticas

  if (criticalCount >= 2) {
    return { level: 'M1', label: 'Crítico', color: '#D32F2F', score: avg, desc: '⚠️ Múltiplos sensos críticos identificados. Ação imediata necessária em campo.' };
  }
  if (criticalCount === 1) {
    return { level: 'M2', label: 'Regular', color: '#F9A825', score: avg, desc: '⚠️ Um senso apresenta nível crítico. Resultado geral limitado a Regular conforme lógica VPS.' };
  }
  const base = getMaturityLevel(avg);
  return { ...base, score: avg };
}

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('dados-resumo');
  const overallCard = document.getElementById('overallCard');
  const canvas = document.getElementById('chartSenso');
  const feedbackWrap = document.getElementById('feedback');
  const btnRedo = document.getElementById('btnRedo');
  const btnHome = document.getElementById('btnHome');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportPDF = document.getElementById('btnExportPDF');
  const btnSendEmail = document.getElementById('btnSendEmail');
  const emailStatus = document.getElementById('emailStatus');
  const sendEmailBtn = document.getElementById('sendEmailBtn');

  // Configuração opcional para envio de e-mail via EmailJS no cliente
  // Preencha e defina enabled:true para ativar
  const EMAILJS_CONFIG = {
    enabled: false, // altere para true após configurar
    SERVICE_ID: 'SEU_SERVICE_ID',
    TEMPLATE_ID: 'SEU_TEMPLATE_ID',
    PUBLIC_KEY: 'SEU_PUBLIC_KEY',
  };
  // Endpoint alternativo (ex.: Google Apps Script) para enviar imagem (screenshot) por e‑mail via backend
  const SEND_ENDPOINT = {
    enabled: false, // defina true e configure a URL abaixo para usar este fluxo
    url: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  };
  try { if (EMAILJS_CONFIG.enabled && window.emailjs) window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY); } catch {}
  // Desabilita (com tooltip) o botão de envio por e‑mail quando EmailJS não estiver habilitado/configurado
  if (btnSendEmail && (!EMAILJS_CONFIG.enabled || !window.emailjs) && emailStatus) {
    btnSendEmail.title = 'Envio direto por e‑mail não configurado (EmailJS). Clique para baixar o PDF e envia‑lo pelo seu e‑mail padrão.';
    emailStatus.style.color = '#9ca3af';
    emailStatus.textContent = 'Dica: sem integração ativa, o botão baixa o PDF e abre seu e‑mail para você anexar e enviar.';
  }
  if (sendEmailBtn && (!EMAILJS_CONFIG.enabled || !window.emailjs)) {
    sendEmailBtn.title = 'Sem integração ativa: enviaremos um e‑mail pelo seu cliente padrão após capturar a imagem.';
  }

  // Carregar dados salvos
  let data = null;
  try {
    const raw = localStorage.getItem('meta5S');
    if (raw) data = JSON.parse(raw);
  } catch {}

  if (!data) {
    if (mount) {
      mount.innerHTML = `
        <p>Nenhum resultado encontrado. Inicie um novo diagnóstico.</p>
        <p><a href="diagnostico.html" class="button">Novo diagnóstico</a></p>
      `;
    }
    wireButtons();
    return;
  }

  // Médias por senso (ignora NA). Média geral = média simples dos cinco sensos.
  const order = [
    ['utilizacao', 'Utilização'],
    ['organizacao', 'Organização'],
    ['limpeza', 'Limpeza'],
    ['padronizacao', 'Padronização'],
    ['disciplina', 'Disciplina'],
  ];

  const senseAverages = order.map(([key, title]) => {
    const s = data.senses?.[key];
    let avg = s?.totals?.avg;
    if (avg == null && Array.isArray(s?.questions)) {
      const scores = s.questions.map(q => q.score).filter(v => typeof v === 'number');
      avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }
    return { key, title: s?.title || title, avg };
  });

  const validSenseAvgs = senseAverages.filter(x => typeof x.avg === 'number');
  const overallAvg = validSenseAvgs.length
    ? validSenseAvgs.reduce((a, b) => a + b.avg, 0) / validSenseAvgs.length
    : null;
  // Monta mapa de sensos para aplicar regra da restrição
  const sensosMap = senseAverages.reduce((acc, s) => {
    acc[s.key] = typeof s.avg === 'number' ? s.avg : null;
    return acc;
  }, {});

  // Nota Geral (aplica cor na borda e sombra do cartão) com regra VPS
  const overallMat = calculateOverallMaturity(sensosMap);
  if (overallCard) {
    const avgText = overallMat.score != null ? formatOne(overallMat.score) : '-'; // uma casa decimal
    // Aviso explícito quando Nota Geral for M1 (Crítico) ou M2 (Regular) pela regra de restrição
    let warningHtml = '';
    if (overallMat.level === 'M1' || overallMat.level === 'M2') {
      const prefix = overallMat.level === 'M1' ? 'Ação imediata necessária' : 'Atenção';
      warningHtml = `<p id="overall-alert" style="margin:6px 0 0;color:${overallMat.color};"><strong>⚠️ ${prefix}:</strong> ${overallMat.desc || ''}</p>`;
    }
    overallCard.style.borderLeft = `4px solid ${overallMat.color}`;
    overallCard.style.boxShadow = `0 8px 22px ${overallMat.color}33`;
    overallCard.innerHTML = `
      <div class="stack">
        <h3>Nota Geral</h3>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="overall-score" style="font-size:1.6rem;font-weight:700;">${avgText}</div>
          <span class="overall-status button" style="border-color:transparent;background:${overallMat.color};color:#fff;">${overallMat.level} • ${overallMat.label}</span>
        </div>
        ${warningHtml}
        <small style="color:#9ca3af">Média simples dos cinco sensos (0–3)</small>
      </div>
    `;
  }

  // Gráfico (Chart.js + datalabels) — cores e rótulos refletem o nível (M1–M4)
  if (canvas && window.Chart) {
    const ctx = canvas.getContext('2d');
    try { window.Chart.register(window.ChartDataLabels); } catch {}
    const hasAnnotation = !!(window['chartjs-plugin-annotation']);
    try { if (hasAnnotation && window.Chart.register) window.Chart.register(window['chartjs-plugin-annotation']); } catch {}

    const labels = senseAverages.map(s => s.title);
    const values = senseAverages.map(s => (typeof s.avg === 'number' ? Number(s.avg.toFixed(2)) : 0));
    const infos = senseAverages.map(s => getMaturityLevel(s.avg)); // contém level, label e color
    const colors = infos.map(info => info.color);

    const excellenceLine = {
      type: 'line',
      yMin: 2.6,
      yMax: 2.6,
      borderColor: '#43A047',
      borderWidth: 2,
      borderDash: [6, 4],
      label: { enabled: true, content: 'Meta de Excelência (2.6)', position: 'end', color: '#43A047' },
    };

    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Média (0–3) por Senso',
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // Mostra valor + classificação M1–M4 no tooltip
              label: (ctx) => {
                const i = ctx.dataIndex;
                const info = infos[i];
                return ` ${ctx.formattedValue} • ${info.level} ${info.label}`;
              },
              // Garante o mesmo tom de cor no marcador do tooltip
              labelColor: (ctx) => {
                const i = ctx.dataIndex;
                const c = colors[i];
                return { borderColor: c, backgroundColor: c };
              },
            },
          },
          datalabels: {
            // Usa a cor do nível no rótulo; para Amarelo (M2) usa branco para melhor contraste
            color: (ctx) => {
              const i = ctx.dataIndex;
              const info = infos[i];
              if (info && info.level === 'M2') return '#ffffff';
              return colors[i];
            },
            anchor: 'end',
            align: 'top',
            // Exibe com 1 casa decimal para consistência visual
            formatter: (v) => (v || v === 0 ? Number(v).toFixed(1) : '—'),
            font: (ctx) => ({ weight: '600', size: ctx.chart.width < 380 ? 9 : ctx.chart.width < 640 ? 10 : 11 }),
          },
          ...(hasAnnotation ? { annotation: { annotations: { excellence: excellenceLine } } } : {}),
        },
        scales: {
          y: {
            suggestedMin: 0,
            suggestedMax: 3,
            ticks: { stepSize: 0.5, color: '#9ca3af', font: (ctx) => ({ size: ctx.chart.width < 380 ? 9 : 11 }) },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          x: {
            ticks: { color: '#cbd5e1', font: (ctx) => ({ size: ctx.chart.width < 380 ? 9 : ctx.chart.width < 640 ? 10 : 12 }) },
            grid: { display: false },
          },
        },
      },
      plugins: [window.ChartDataLabels].filter(Boolean),
    });
  }

  // Feedback por senso — linguagem simples e direta
  if (feedbackWrap) {
    feedbackWrap.innerHTML = senseAverages.map((s) => renderFeedbackCard(s, getMaturityLevel)).join('');
  }

  // Rodapé simples
  if (mount) {
    const quando = data.meta?.geradoEm ? new Date(data.meta.geradoEm).toLocaleString('pt-BR') : '-';
    mount.innerHTML = `<div style="color:#9ca3af"><em>Gerado em:</em> ${quando}</div>`;
  }

  // Botões
  wireButtons();

  function wireButtons() {
    btnRedo?.addEventListener('click', () => {
      try { localStorage.removeItem('respostas5S'); } catch {}
      try { localStorage.removeItem('meta5S'); } catch {}
      window.location.href = 'diagnostico.html';
    });
    btnHome?.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    // Exportar CSV das respostas (por pergunta)
    btnExportCSV?.addEventListener('click', () => {
      try { exportCSV(data); } catch (e) { console.error('CSV export failed', e); }
    });
    // Gerar PDF simples do resultado (impressão do navegador)
    btnExportPDF?.addEventListener('click', () => {
      try {
        // Gera e baixa PDF imediatamente; tenta enviar por e-mail se configurado
        generateAndSendPDF(data, overallMat, senseAverages, EMAILJS_CONFIG);
        // Se não houver integração ativa, abre e‑mail do usuário já com o resumo
        const perfil = safeReadLocal('perfil5S') || {};
        if ((!EMAILJS_CONFIG.enabled || !window.emailjs) && perfil.email) {
          const subj = subjectWithProfile(`Resultado Smart Lean 5S 10X — ${overallMat.level} ${overallMat.label} — ${getDateBr()}`);
          openMailto(perfil.email, subj,
            buildMailBody(overallMat, senseAverages));
        }
      } catch (e) {
        console.error('PDF export failed', e);
        alert('Não foi possível gerar o PDF automaticamente.');
      }
    });
    // Enviar por e-mail (sem baixar), com feedback de status
    btnSendEmail?.addEventListener('click', async () => {
      const perfil = safeReadLocal('perfil5S') || {};
      if (!EMAILJS_CONFIG.enabled || !window.emailjs) {
        alert('Para enviar por e-mail, configure o EmailJS no arquivo js/resultado.js (SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY).');
        return;
      }
      if (!perfil.email) {
        alert('E-mail do usuário não encontrado. Preencha na página inicial.');
        return;
      }
      try {
        btnSendEmail.disabled = true;
        const oldText = btnSendEmail.textContent;
        btnSendEmail.textContent = 'Enviando...';
        if (emailStatus) { emailStatus.style.color = '#9ca3af'; emailStatus.textContent = 'Enviando relatório por e‑mail...'; }
        const doc = buildPdfDoc(data, overallMat, senseAverages);
        const dataUrl = doc.output('datauristring');
        const base64 = dataUrl.split(',')[1];
        await window.emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
          to_email: perfil.email,
          subject: `Relatório Smart Lean 5S 10X — ${overallMat.level} ${overallMat.label}`,
          message: 'Segue em anexo o relatório em PDF com os resultados do diagnóstico 5S 10X.',
          attachment: base64,
          filename: 'relatorio-5s10x.pdf',
        }, EMAILJS_CONFIG.PUBLIC_KEY);
        if (emailStatus) { emailStatus.style.color = '#43A047'; emailStatus.textContent = 'Relatório enviado com sucesso.'; }
        btnSendEmail.textContent = oldText;
        btnSendEmail.disabled = false;
      } catch (err) {
        console.error(err);
        if (emailStatus) { emailStatus.style.color = '#D32F2F'; emailStatus.textContent = 'Falha ao enviar o e‑mail. Verifique configuração do EmailJS.'; }
        btnSendEmail.disabled = false;
        btnSendEmail.textContent = 'Enviar por E‑mail';
      }
    });

    // Enviar imagem (screenshot) por e‑mail, com captura via html2canvas
    sendEmailBtn?.addEventListener('click', async () => {
      const perfil = safeReadLocal('perfil5S') || {};
      if (!perfil.email) { alert('E-mail do usuário não encontrado. Preencha na página inicial.'); return; }
      try {
        sendEmailBtn.disabled = true;
        const old = sendEmailBtn.textContent; sendEmailBtn.textContent = 'Capturando...';
        if (emailStatus) { emailStatus.style.color = '#9ca3af'; emailStatus.textContent = 'Capturando a tela e enviando por e‑mail...'; }
        // Captura apenas a seção de resultado (#resultado) para anexo menor e foco no conteúdo
        const target = document.getElementById('resultado') || document.querySelector('main') || document.body;
        // Adiciona moldura elegante para a captura e injeta a cor baseada na Nota Geral
        try {
          target.style.setProperty('--capture-border', overallMat.color || '#00AEEF');
          const bg = hexToRgba(overallMat.color || '#00AEEF', 0.16);
          target.style.setProperty('--capture-bg', bg);
        } catch {}
        // Preparar posição para watermark e moldura
        const prevPos = window.getComputedStyle(target).position;
        if (prevPos === 'static') { try { target.dataset.prevPos = 'static'; target.style.position = 'relative'; } catch {} }
        // Adiciona watermark discreto no canto inferior direito
        const wm = document.createElement('div');
        // Marca d'água dinâmica: nome/e-mail (se disponível) + data
        const perfilWm = safeReadLocal('perfil5S') || {};
        const parts = ['Smart Lean 5S 10X'];
        if (perfilWm.name) parts.push(perfilWm.name);
        else if (perfilWm.email) parts.push(perfilWm.email);
        try { if (overallMat && overallMat.level && overallMat.label) parts.push(`${overallMat.level} ${overallMat.label}`); } catch {}
        parts.push(new Date().toLocaleDateString('pt-BR'));
        wm.textContent = parts.join(' • ');
        wm.style.position = 'absolute';
        wm.style.right = '12px';
        wm.style.bottom = '12px';
        wm.style.padding = '4px 8px';
        wm.style.borderRadius = '6px';
        wm.style.fontSize = '10px';
        wm.style.letterSpacing = '0.3px';
        wm.style.color = '#ffffff';
        wm.style.background = 'rgba(0,0,0,0.35)';
        wm.style.backdropFilter = 'blur(2px)';
        wm.style.zIndex = '9999';
        try { target.appendChild(wm); } catch {}
        target.classList.add('capture-frame');
        await new Promise((r)=>requestAnimationFrame(r));
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#004C73', useCORS: true });
        const dataUrl = canvas.toDataURL('image/png');
        target.classList.remove('capture-frame');
        try { target.style.removeProperty('--capture-border'); target.style.removeProperty('--capture-bg'); } catch {}
        try { wm.remove(); } catch {}
        if (target.dataset.prevPos === 'static') { try { target.style.position = ''; delete target.dataset.prevPos; } catch {} }

        // Prévia opcional
        try {
          const preview = window.open('','_blank','noopener');
          if (preview && preview.document) {
            preview.document.write(`<h3 style='text-align:center;font-family:Segoe UI;'>📊 Prévia do Resultado</h3><img src='${dataUrl}' style='width:100%;border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.3);'>`);
          }
        } catch {}

        if (SEND_ENDPOINT.enabled && SEND_ENDPOINT.url) {
          // Envio via backend (ex.: Google Apps Script)
          const payload = {
            to: perfil.email,
            subject: subjectWithProfile(`Resultado Smart Lean 5S 10X — ${overallMat.level} ${overallMat.label} — ${getDateBr()}`),
            body: 'Segue o resultado do seu diagnóstico 5S 10X em anexo.',
            image: dataUrl, // dataURL completa
          };
          const resp = await fetch(SEND_ENDPOINT.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!resp.ok) throw new Error('Falha no envio via endpoint');
          if (emailStatus) { emailStatus.style.color = '#43A047'; emailStatus.textContent = '✅ Resultado enviado com sucesso!'; }
        } else if (EMAILJS_CONFIG.enabled && window.emailjs) {
          // Fallback: envio via EmailJS com base64
          const base64 = dataUrl.split(',')[1];
          await window.emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
            to_email: perfil.email,
            subject: subjectWithProfile(`Resultado Smart Lean 5S 10X — ${overallMat.level} ${overallMat.label} — ${getDateBr()}`),
            message: 'Segue em anexo a imagem com o resultado do diagnóstico 5S 10X.',
            attachment: base64,
            filename: 'resultado-5s10x.png',
          }, EMAILJS_CONFIG.PUBLIC_KEY);
          if (emailStatus) { emailStatus.style.color = '#43A047'; emailStatus.textContent = 'Screenshot enviado com sucesso.'; }
        } else {
          // Sem integração ativa: abre o cliente de e‑mail do usuário com resumo
          const subj = subjectWithProfile(`Resultado Smart Lean 5S 10X — ${overallMat.level} ${overallMat.label} — ${getDateBr()}`);
          openMailto(perfil.email, subj, buildMailBody(overallMat, senseAverages));
        }
        sendEmailBtn.textContent = old; sendEmailBtn.disabled = false;
      } catch (err) {
        console.error(err);
        if (emailStatus) { emailStatus.style.color = '#D32F2F'; emailStatus.textContent = 'Falha ao enviar a imagem. Verifique configuração do EmailJS.'; }
        sendEmailBtn.textContent = '📧 Enviar resultado por e‑mail'; sendEmailBtn.disabled = false;
      }
    });
  }
  
  // --- Exportações ---
  // Gera CSV consolidado das respostas por pergunta (lendo meta5S.senses)
  function exportCSV(meta) {
    const rows = [];
    // Cabeçalho
    rows.push(['Senso', 'PerguntaID', 'Pergunta', 'Resposta', 'Valor'].map(csvCell).join(','));
    if (meta && meta.senses) {
      Object.values(meta.senses).forEach((s) => {
        const sensoNome = s.title || '';
        (s.questions || []).forEach((q) => {
          const r = [
            sensoNome,
            q.id || '',
            q.text || '',
            q.answerRaw ?? '',
            (typeof q.score === 'number' ? q.score : ''),
          ].map(csvCell).join(',');
          rows.push(r);
        });
      });
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-lean-5s10x-respostas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(v) {
    const s = String(v).replace(/"/g, '""');
    return '"' + s + '"';
  }

  // Gera PDF (jsPDF) e baixa imediatamente; tenta enviar por e-mail se configurado
  function generateAndSendPDF(meta, overall, sensesArr, emailCfg) {
    const doc = buildPdfDoc(meta, overall, sensesArr);
    const fileName = 'relatorio-5s10x.pdf';
    doc.save(fileName, { returnPromise: true }).then(() => {
      const perfil = safeReadLocal('perfil5S') || {};
      if (emailCfg?.enabled && window.emailjs && perfil.email) {
        const base64 = doc.output('datauristring').split(',')[1];
        trySendEmail(perfil.email, base64, emailCfg, overall);
      }
    });
  }

  function buildPdfDoc(meta, overall, sensesArr) {
  const perfil = safeReadLocal('perfil5S') || {};
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { throw new Error('jsPDF nao carregado'); }
  const doc = new jsPDF('p','pt','a4');
  // Cabecalho fixo com marca
  const brand = 'Zadoni Criacoes - WhatsApp: 94992993138';
  const pageWidth = doc.internal.pageSize.getWidth();
  const topBand = 24;
  try {
    doc.setFillColor(11,18,32);
    doc.rect(0, 0, pageWidth, topBand, 'F');
    doc.setTextColor(229,231,235);
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.text(brand, pageWidth/2, 16, { align: 'center', baseline: 'middle' });
  } catch {}

  let y = topBand + 20;
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text('Smart Lean 5S 10X - Resultado', 40, y); y += 18;
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text('Gerado em ' + new Date().toLocaleString('pt-BR'), 40, y); y += 14;
  if (perfil.name || perfil.email) {
    const line = (perfil.name ? 'Nome: ' + perfil.name : '') + (perfil.email ? '  E-mail: ' + perfil.email : '');
    doc.text(line, 40, y); y += 18;
  }

  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  var geralTxt = 'Nota Geral: ' + (overall && overall.score!=null ? formatOne(overall.score) : '-') + '  (' + overall.level + ' - ' + overall.label + ')';
  doc.text(geralTxt, 40, y); y += 14;
  if (overall && overall.desc) { doc.setFont('helvetica','normal'); wrapText(doc, overall.desc, 40, y, 515); y += 28; }

  doc.setFont('helvetica','bold'); doc.text('Desempenho por Senso', 40, y); y += 14;
  doc.setFont('helvetica','bold'); doc.text('Senso', 40, y); doc.text('Media', 260, y); doc.text('Nivel', 340, y); y += 10;
  doc.setFont('helvetica','normal');
  (sensesArr||[]).forEach(function(s){
    var m = getMaturityLevel(s.avg);
    var val = (typeof s.avg==='number') ? formatOne(s.avg) : '-';
    doc.text(String(s.title||''), 40, y);
    doc.text(val, 260, y);
    doc.text(m.level + ' - ' + m.label, 340, y);
    y += 14;
  });

  // Resumo Inteligente (acoes ampliadas)
  y += 10; doc.setFont('helvetica','bold'); doc.text('Resumo Inteligente', 40, y); y += 14;
  (sensesArr||[]).forEach(function(s){
    var m = getMaturityLevel(s.avg);
    var title = String(s.title||'Senso');
    doc.setFont('helvetica','bold'); doc.text(title + '  ' + (typeof s.avg==='number'?formatOne(s.avg):'-') + '  (' + m.label + ')', 40, y); y += 12;
    doc.setFont('helvetica','normal');
    var acts = suggestionsForSense(s.key || s.title).concat(extraActionsForSense(s.key || s.title));
    acts.slice(0,6).forEach(function(a){ wrapText(doc, '\u2022 ' + a, 48, y, 520); y += 12; });
    y += 6;
  });

  return doc;
}// Utilitário: converte cor hex para rgba com alfa
  function hexToRgba(hex, alpha) {
    try {
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      const a = Math.max(0, Math.min(1, alpha ?? 1));
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    } catch { return 'rgba(0,174,239,0.16)'; }
  }

  function wrapText(doc, text, x, y, maxWidth) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => { doc.text(line, x, y); y += 12; });
  }

  // Envia e-mail via EmailJS (requer configuração no painel EmailJS)
  function trySendEmail(toEmail, pdfBase64, cfg, overall) {
    try {
      const params = {
        to_email: toEmail,
        subject: subjectWithProfile(`Relatório Smart Lean 5S 10X — ${overall.level} ${overall.label} — ${getDateBr()}`),
        message: 'Segue em anexo o relatório em PDF com os resultados do diagnóstico 5S 10X.',
        attachment: pdfBase64, // Configure seu template para aceitar base64 como anexo
        filename: 'relatorio-5s10x.pdf',
      };
      window.emailjs.send(cfg.SERVICE_ID, cfg.TEMPLATE_ID, params, cfg.PUBLIC_KEY)
        .then(() => alert('Relatório enviado por e-mail com sucesso.'))
        .catch(() => alert('PDF gerado e baixado. Para enviar por e-mail, configure EmailJS nas variáveis.'));
    } catch (e) {
      console.warn('EmailJS não configurado ou falha no envio.');
    }
  }

  // Abre o cliente de e‑mail padrão com assunto/corpo pré-preenchidos
  function openMailto(to, subject, body) {
    try {
      const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
    } catch {}
  }

  function buildMailBody(overall, sensesArr) {
    const linhas = [];
    linhas.push('Resumo do diagnóstico 5S 10X');
    if (overall && overall.score != null) linhas.push(`Nota geral: ${formatOne(overall.score)} (${overall.level} - ${overall.label})`);
    linhas.push('Desempenho por Senso:');
    (sensesArr||[]).forEach(s => {
      const m = getMaturityLevel(s.avg);
      const val = (typeof s.avg==='number') ? formatOne(s.avg) : '-';
      linhas.push(`- ${s.title}: ${val} (${m.level} - ${m.label})`);
    });
    linhas.push('Anexe o PDF/Imagem gerado(a) para registro.');
    return linhas.join('\n');
  }

  function getDateBr() { return new Date().toLocaleDateString('pt-BR'); }

  // Inclui Empresa/Obra no assunto se disponível no perfil
  function subjectWithProfile(base) {
    try {
      const perfil = safeReadLocal('perfil5S') || {};
      const org = (perfil.company || perfil.empresa || perfil.obra || '').trim();
      return org ? `${org} — ${base}` : base;
    } catch { return base; }
  }

  function safeReadLocal(key){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null }catch{return null} }
});

// Gera cartão de feedback por senso (tom motivacional + riscos)
// Observação: "posto de trabalho" = "frente de serviço" = "estação de trabalho" (sinônimos)
function renderFeedbackCard(s, maturityFn) {
  const m = maturityFn(s.avg);
  const color = m.color;
  const title = `Senso de ${s.title} — Resultado: ${m.level}`;

  // Explicação curta (2 linhas), tom direto
  let exp1 = '';
  let exp2 = '';
  if (m.level === 'M1') {
    exp1 = 'Nível crítico. Há falhas que afetam segurança e ritmo.';
    exp2 = 'Precisamos atacar causas básicas e estabilizar rotinas.';
  } else if (m.level === 'M2') {
    exp1 = 'Nível regular. Existem práticas, mas com muita variação.';
    exp2 = 'Padronize o básico para evitar retrabalho e atrasos.';
  } else if (m.level === 'M3') {
    exp1 = 'Bom nível. Processos funcionam com poucos desvios.';
    exp2 = 'Sustente a disciplina e corrija pontos fracos.';
  } else if (m.level === 'M4') {
    exp1 = 'Excelente. Padrões claros e bem aplicados.';
    exp2 = 'Continue com ciclos curtos de melhoria (kaizen).';
  } else {
    exp1 = 'Sem dados suficientes para avaliar.';
    exp2 = 'Responda as questões ou revise NAs.';
  }

  // Sugestões práticas por senso (linguagem de chão de obra)
  const sugg = suggestionsForSense(s.key || s.title);

  // Riscos quando média ≤ 2 (M1/M2)
  const showRisks = typeof s.avg === 'number' && s.avg <= 2;
  const risks = [
    { k: 'Segurança', v: '⚠️ Risco: Acúmulo de materiais aumenta chance de acidentes.' },
    { k: 'Financeiro', v: '⚠️ Risco: Retrabalho e desperdício elevam custos.' },
    { k: 'Reputação', v: '⚠️ Risco: Má impressão para clientes e auditorias.' },
    { k: 'Produtividade', v: '⚠️ Risco: Atrasos e variação de qualidade.' },
  ];

  const congrats = m.level === 'M4'
    ? `<p style="color:#43A047"><strong>✅ Parabéns!</strong> Seu ambiente demonstra alto nível de disciplina e cuidado.</p>`
    : '';

  return `
    <div class="fb-card" style="border-left-color:${color}">
      <h4>${title} <span class="fb-badge" style="background:${color}">${m.label}</span></h4>
      <p>${exp1}</p>
      <p>${exp2}</p>
      <p><strong>Sugestões práticas</strong></p>
      <ul class="fb-list">
        ${sugg.map(li => `<li>💡 ${li}</li>`).join('')}
      </ul>
      ${showRisks ? `
        <p><strong>Riscos</strong></p>
        <ul class="fb-list">
          ${risks.map(r => `<li>${r.v}</li>`).join('')}
        </ul>
      ` : ''}
      ${congrats}
    </div>
  `;
}

// Sugestões contextualizadas por senso
function suggestionsForSense(keyOrTitle) {
  const k = String(keyOrTitle).toLowerCase();
  if (k.includes('utiliza') || k === 'utilizacao') {
    return [
      'Organize as ferramentas do posto de trabalho para evitar perda de tempo.',
      'Defina critérios de descarte e faça revisão semanal.',
      'Separe itens raros em local sinalizado com etiqueta de data.',
    ];
  }
  if (k.includes('organiza')) {
    return [
      'Enderece locais e identifique com rótulos simples e visíveis.',
      'Padronize layout e distâncias de alcance na estação de trabalho.',
      'Use painéis visuais para localizar materiais em segundos.',
    ];
  }
  if (k.includes('limpeza')) {
    return [
      'Defina donos de área e rotina diária de limpeza.',
      'Elimine fontes de sujeira com 5 Porquês e contramedidas.',
      'Use checklists rápidos de limpeza por turno.',
    ];
  }
  if (k.includes('padroniza')) {
    return [
      'Publique padrões visuais perto do ponto de uso.',
      'Audite padrões curtos (Gemba) semanalmente.',
      'Treine novos com passo a passo simples e prático.',
    ];
  }
  if (k.includes('disciplina')) {
    return [
      'Mantenha calendário de auditorias 5S com responsáveis claros.',
      'Mostre indicadores simples em quadros visuais.',
      'Reconheça publicamente boas práticas e ideias.',
    ];
  }
  return [
    'Defina um padrão simples e visível.',
    'Atribua responsáveis e frequência de verificação.',
    'Implemente uma melhoria rápida e reavalie em 2 semanas.',
  ];
}

  // Acoes extras por senso (para PDF)
  function extraActionsForSense(kOrTitle){
    const k = String(kOrTitle||'').toLowerCase();
    if (k.includes('utiliza') || k === 'utilizacao') return [
      'Definir criterios de descarte por familia de itens.',
      'Implementar kanban para itens de alto giro.',
      'Mapear gargalos causados por excesso e eliminar causas.',
    ];
    if (k.includes('organiza')) return [
      'Criar shadow boards para ferramentas criticas.',
      'Padronizar caixas/conteineres com etiqueta frontal.',
      'Definir zona de quarentena para itens sem endereco.',
    ];
    if (k.includes('limpeza')) return [
      'Padronizar kits e checklists de limpeza por area.',
      'Reservar 5 minutos de housekeeping ao fim do turno.',
      'Eliminar na causa raizes de vazamentos e sujeira.',
    ];
    if (k.includes('padroniza')) return [
      'Publicar padroes no posto (A4 plastificado ou QR).',
      'Realizar Gemba Walk semanal para validar aderencia.',
      'Medir conformidade com auditoria rapida (0/1).',
    ];
    if (k.includes('disciplina')) return [
      'Definir indicadores de disciplina ligados ao 5S.',
      'Fazer rodizio de auditores para reduzir vies.',
      'Integrar 5S no onboarding e nas metas da equipe.',
    ];
    return [];
  }