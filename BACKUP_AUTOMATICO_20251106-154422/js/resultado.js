/* ✅ Premium VPS Optimization applied: UTF-8 fixed, visuals enhanced, risk-impact communication added, and PDF results improved. */
/* ✅ Updated by Codex: 5S feedback text simplified and enhanced for leadership and operators. */

// Utilidades numéricas
function formatNumber(n) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n); }
function formatOne(n) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n); }

// Classificação Vale 5S (0–3) → cor, rótulo e descrição curtas
// Regra estrita: exatamente 1.0 é Crítico (M1)
function getMaturityLevel(score) {
  if (score == null || Number.isNaN(score)) return { level: 'NA', label: 'N/A', color: '#9ca3af', desc: 'Sem dados suficientes.' };
  if (score === 1.0) return { level: 'M1', label: 'Crítico', color: '#D32F2F', desc: 'Situação crítica. Pontuação igual a 1 indica falha grave que requer ação imediata.' };
  if (score <= 0.9)  return { level: 'M1', label: 'Crítico',  color: '#D32F2F', desc: 'Falhas graves. Atue imediatamente.' };
  if (score <= 1.7)  return { level: 'M2', label: 'Regular',  color: '#F9A825', desc: 'Existem práticas, porém com variação. Requer ajustes e padronização.' };
  if (score <= 2.5)  return { level: 'M3', label: 'Bom',      color: '#2196F3', desc: 'Boas práticas aplicadas. Há oportunidades de melhoria.' };
  return { level: 'M4', label: 'Excelente', color: '#43A047', desc: 'Padrão de excelência e disciplina sustentada.' };
}

// Regra de restrição (VPS): conta sensos críticos
function calculateOverallMaturity(sensosMap) {
  const values = Object.values(sensosMap).filter(v => typeof v === 'number');
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const criticalCount = values.filter(v => v <= 1.0).length;
  if (criticalCount >= 2) return { level: 'M1', label: 'Crítico', color: '#D32F2F', score: avg, desc: '⚠️ Múltiplos sensos críticos. Ação imediata necessária.' };
  if (criticalCount === 1) return { level: 'M2', label: 'Regular', color: '#F9A825', score: avg, desc: '⚠️ Um senso crítico limita o resultado geral (regra VPS).' };
  const base = getMaturityLevel(avg); return { ...base, score: avg };
}

document.addEventListener('DOMContentLoaded', () => {
  const overallCard  = document.getElementById('overallCard');
  const canvas       = document.getElementById('chartSenso');
  const feedbackWrap = document.getElementById('feedback');
  const mount        = document.getElementById('dados-resumo');
  const btnRedo      = document.getElementById('btnRedo');
  const btnHome      = document.getElementById('btnHome');
  const btnCSV       = document.getElementById('btnExportCSV');
  const btnPDF       = document.getElementById('btnExportPDF');

  const data = safeReadLocal('meta5S');
  if (!data || !data.senses) { if (overallCard) overallCard.textContent = 'Nenhum resultado encontrado. Faça o diagnóstico novamente.'; return; }

  const senseKeys   = ['utilizacao','organizacao','limpeza','padronizacao','disciplina'];
  const senseTitles = { utilizacao:'Utilização', organizacao:'Organização', limpeza:'Limpeza', padronizacao:'Padronização', disciplina:'Disciplina' };
  const senseAverages = senseKeys.map(k => { const avg = data.senses[k]?.totals?.avg; return { key:k, title:senseTitles[k], avg: typeof avg === 'number' ? avg : null }; });
  const sensosMap = senseAverages.reduce((acc, s)=> (acc[s.key] = s.avg, acc), {});
  const overallMat = calculateOverallMaturity(sensosMap);

  // Nota Geral
  if (overallCard) {
    const avgText = overallMat.score != null ? formatOne(overallMat.score) : '-';
    const interpret = (overallMat.level === 'M4') ? 'Cultura 5S consolidada. Mantenha e compartilhe.'
                    : (overallMat.level === 'M3') ? 'Bom desempenho. Padronize para reduzir variações.'
                    : (overallMat.level === 'M2') ? 'Regular. Há práticas, porém variáveis. Corrija desvios.'
                    : 'Crítico. Ação imediata do gestor em campo.';
    overallCard.style.borderLeft = `4px solid ${overallMat.color}`;
    overallCard.style.boxShadow  = `0 8px 22px ${overallMat.color}33`;
    const alert = (overallMat.level === 'M1' || overallMat.level === 'M2')
      ? `<p id="overall-alert" style="margin:6px 0 0;color:${overallMat.color};"><strong>${overallMat.level==='M1'?'Ação imediata':'Atenção'}:</strong> ${overallMat.desc}</p>`
      : '';
    overallCard.innerHTML = `
      <div class="stack">
        <h3>Nota Geral</h3>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="overall-score" style="font-size:1.6rem;font-weight:700;">${avgText}</div>
          <span class="overall-status button" style="border-color:transparent;background:${overallMat.color};color:#fff;">${overallMat.level} – ${overallMat.label}</span>
        </div>
        <p style="margin:6px 0 0;color:#e5e7eb">${interpret}</p>
        ${alert}
        <small style="display:block;color:#9ca3af;margin-top:6px">Os resultados consideram a Regra de Restrição do VPS (Vale).</small>
      </div>`;
  }

  // Gráfico por Senso
  let chart;
  if (canvas && window.Chart) {
    const labels = senseAverages.map(s => s.title);
    const dataVals = senseAverages.map(s => (typeof s.avg === 'number' ? Number(s.avg.toFixed(2)) : 0));
    const colors = senseAverages.map(s => getMaturityLevel(s.avg).color);
    if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Nota por Senso (0–3)', data: dataVals, backgroundColor: colors, borderRadius: 6 }] },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        scales: {
          y: { min: 0, max: 3, ticks: { stepSize: 0.5 } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                const m = getMaturityLevel(v);
                return `${formatOne(v)} – ${m.level} ${m.label}`;
              }
            }
          },
          datalabels: {
            anchor: 'end', align: 'end', offset: 4,
            formatter: (v) => formatOne(v),
            color: (ctx) => getMaturityLevel(ctx.dataset.data[ctx.dataIndex]).color,
            font: { weight: '700' }
          }
        }
      }
    });
  }

  // Feedback por Senso
  if (feedbackWrap) {
    feedbackWrap.innerHTML = '';
    senseAverages.forEach(s => {
      const m = getMaturityLevel(s.avg);
      const texts = getSenseTexts(s.key);
      const levelClass = m.level.toLowerCase();
      const badgeStyle = `background:${m.color}`;
      const insight = (m.level === 'M4')
        ? 'Excelente nível e disciplina sustentada. Continue como referência VPS.'
        : (m.level === 'M3')
          ? 'Bom desempenho, com oportunidades de padronização.'
          : (m.level === 'M2')
            ? 'Atende parcialmente. Padronize e corrija variações.'
            : 'Crítico. Intervenção imediata do gestor.';

      const gains = texts.ganhos.map(t => `<li>✅ ${t}</li>`).join('');
      const risks = texts.riscos.map(t => `<li>❌ ${t}</li>`).join('');
      const acts  = texts.acoes.map(t  => `<li>💡 ${t}</li>`).join('');

      const card = document.createElement('div');
      card.className = `senso-card m${m.level.substring(1)}`;
      card.innerHTML = `
        <div class="senso-card__header">
          <h4>${s.title}</h4>
          <span class="level-badge" style="${badgeStyle}">${m.level} – ${m.label}</span>
        </div>
        <div class="insight">${insight}</div>
        <div class="senso-sections">
          <div class="sec gains"><strong>Ganhos</strong><ul class="fb-list">${gains}</ul></div>
          <div class="sec risks"><strong>Riscos & Perdas</strong><ul class="fb-list">${risks}</ul></div>
          <div class="sec actions"><strong>Ações Recomendadas</strong><ul class="fb-list">${acts}</ul></div>
        </div>`;
      try {
        const extra = {
          utilizacao: [
            'Defina criterios claros de descarte por familia de itens.',
            'Implemente kanban para itens de alto giro.',
            'Mapeie gargalos por excesso e elimine causas.'
          ],
          organizacao: [
            'Crie shadow boards para ferramentas criticas.',
            'Padronize caixas/conteineres com etiqueta frontal.',
            'Defina zona de quarentena para itens sem endereco.'
          ],
          limpeza: [
            'Padronize kits de limpeza por area e checklist.',
            'Reserve 5 minutos de limpeza ao fim do turno.',
            'Elimine fontes de sujeira (vazamentos) na causa raiz.'
          ],
          padronizacao: [
            'Publique padroes no posto (A4 plastificado ou QR code).',
            'Realize Gemba Walk semanal para validar aderencia.',
            'Meca conformidade com auditoria rapida (0/1).'
          ],
          disciplina: [
            'Defina indicadores de disciplina ligados ao 5S.',
            'Faca rodizio de auditores para reduzir vies.',
            'Integre 5S no onboarding e metas da equipe.'
          ]
        };
        const ul = card.querySelector('.actions .fb-list');
        (extra[s.key] || []).forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      } catch {}
      feedbackWrap.appendChild(card);
    });
  }

  // Resumo (data/hora)
  if (mount) {
    const quando = data.meta?.geradoEm ? new Date(data.meta.geradoEm).toLocaleString('pt-BR') : '-';
    const perfil = getProfileInfo();
    mount.innerHTML = `<div style="color:#9ca3af"><em>Gerado em:</em> ${quando} • <em>Responsável:</em> ${perfil.name || '-'} • <em>E-mail:</em> ${perfil.email || '-'} • <em>Empresa/Posto:</em> ${perfil.company || '-'}</div>`;
  }

  // Ações
  btnRedo?.addEventListener('click', () => { try { localStorage.removeItem('respostas5S'); localStorage.removeItem('meta5S'); } catch{}; window.location.href = 'diagnostico.html'; });
  btnHome?.addEventListener('click', () => { window.location.href = 'index.html'; });
  btnCSV ?.addEventListener('click', () => { try { exportCSV(data); } catch(e){ console.error(e); } });
  btnPDF ?.addEventListener('click', () => { try { generatePDF(); } catch(e){ console.error(e); alert('Não foi possível gerar o PDF automaticamente.'); } });
});

// Conteúdo por senso (PT-BR simples, motivacional)
function getSenseTexts(key){
  const UTIL = {
    ganhos:[
      'Menos acúmulo de materiais → área de trabalho mais limpa e segura.',
      'Facilidade para encontrar o que é realmente usado.',
      'Fluxo produtivo mais rápido e previsível.',
      'Equipe mais focada e ambiente visualmente organizado.'
    ],
    riscos:[
      'Guardar itens sem uso ocupa espaço e atrapalha o trabalho.',
      'Materiais esquecidos podem causar tropeços, atrasos e acidentes.',
      'Dificulta identificar o que realmente precisa de reposição.'
    ],
    acoes:[
      'Faça “caixas vermelhas” semanais para separar o que não é usado.',
      'Descarte, recicle ou devolva materiais parados.',
      'Treine a equipe para reconhecer e eliminar excessos no posto.'
      ,'Defina criterios claros de descarte por familia de itens.'
      ,'Implemente kanban para itens de alto giro.'
      ,'Mapeie gargalos por excesso e elimine causas.'
    ]
  };
  const ORG = {
    ganhos:[
      'Redução de tempo gasto procurando ferramentas.',
      'Padronização das áreas melhora a troca de turno e auditorias.',
      'Ambiente visualmente agradável e mais seguro.'
    ],
    riscos:[
      'Itens fora do lugar confundem e atrasam o trabalho.',
      'Falta de etiquetas ou endereçamento gera retrabalho.',
      'Dificulta inspeções e manutenção de rotina.'
    ],
    acoes:[
      'Use identificação visual simples: etiquetas, cores e placas.',
      'Crie mapas das áreas e atualize quando houver mudanças.',
      'Audite semanalmente a disposição dos itens junto à equipe.'
    ]
  };
  const LIM = {
    ganhos:[
      'Menor risco de falhas e acidentes.',
      'Equipamentos duram mais e exigem menos manutenção.',
      'Melhora o moral da equipe e a imagem da área.'
    ],
    riscos:[
      'Poeira e óleo escondem vazamentos e desgastes.',
      'Equipamentos sujos perdem rendimento e geram retrabalho.',
      'Acúmulo de lixo e resíduos causa riscos de contaminação.'
    ],
    acoes:[
      'Defina responsáveis por cada área de limpeza.',
      'Crie um “mapa de pontos críticos” e revise semanalmente.',
      'Estimule a cultura: “ver sujo é agir”.'
    ]
  };
  const PAD = {
    ganhos:[
      'Atividades mais previsíveis e seguras.',
      'Reduz erros em tarefas repetitivas.',
      'Facilita o treinamento de novos colaboradores.'
    ],
    riscos:[
      'Falta de padrões visuais causa confusão entre equipes.',
      'Dificulta auditorias e compartilhamento de boas práticas.',
      'Maior variação nos resultados e retrabalho.'
    ],
    acoes:[
      'Crie padrões visuais (checklists, fotos, fluxos).',
      'Compare práticas entre turnos e equipes.',
      'Atualize os padrões sempre que houver melhoria.'
    ]
  };
  const DIS = {
    ganhos:[
      'Sustentação dos resultados 5S e redução de reincidências.',
      'Melhoria contínua e cultura de responsabilidade.',
      'Equipe mais engajada e comprometida.'
    ],
    riscos:[
      'Falta de acompanhamento faz o 5S “voltar atrás”.',
      'Equipe perde credibilidade quando o padrão não é seguido.',
      'Resultados se tornam inconsistentes.'
    ],
    acoes:[
      'Crie rotina de auditoria 5S (quinzenal ou mensal).',
      'Valorize boas práticas publicamente.',
      'Corrija desvios com diálogo e reforço positivo.'
    ]
  };
  switch(key){
    case 'utilizacao': return UTIL;
    case 'organizacao': return ORG;
    case 'limpeza': return LIM;
    case 'padronizacao': return PAD;
    case 'disciplina': return DIS;
    default: return { ganhos:[], riscos:[], acoes:[] };
  }
}

// CSV
function exportCSV(data){
  const rows = [];
  rows.push(['Senso','Pergunta','Resposta','Nota']);
  const order = ['utilizacao','organizacao','limpeza','padronizacao','disciplina'];
  order.forEach(key => {
    const senso = data.senses[key]; if(!senso) return;
    senso.questions.forEach(q => rows.push([senso.title, q.text, q.answerRaw ?? '', q.score ?? '']));
  });
  const csv = '\ufeff' + rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  const name = getProfileName();
  a.download = `respostas_5S10X_${name || 'usuario'}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

// PDF (captura do bloco principal)
async function generatePDF(){
  const el = document.getElementById('resultado');
  if(!el){ alert('Seção de resultados não encontrada.'); return; }
  const { jsPDF } = window.jspdf || {};
  if(!jsPDF){ alert('Biblioteca jsPDF não encontrada.'); return; }

  const perfil = getProfileInfo();
  const dateStr = new Date().toLocaleDateString('pt-BR');

  // Header em canvas para compor com o conteúdo
  const header = document.createElement('div');
  header.style.padding = '12px 16px';
  header.style.background = '#0b1220';
  header.style.color = '#e5e7eb';
  header.style.border = '1px solid #223047';
  header.style.borderRadius = '12px';
  header.innerHTML = `<strong>Diagnóstico 5S 10X – Avaliação VPS</strong><br/>Nome: ${perfil.name || '-'} • E-mail: ${perfil.email || '-'} • Empresa/Posto: ${perfil.company || '-'} • Data: ${dateStr}`;
  el.prepend(header);

  try { header.innerHTML = header.innerHTML.replace('<br/>Nome', '<br/><span style="font-size:12px">Zadoni Cria\u00e7\u00f5es - WhatsApp: 94992993138</span><br/>Nome'); } catch {}
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0b1220' });
  header.remove(); // remove header visual após captura

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p','mm','a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // margens
  const imgHeight = canvas.height * imgWidth / canvas.width;

  // Cabeçalho fixo por página com marca e WhatsApp
  const brandLine = 'Zadoni Cria\u00e7\u00f5es - WhatsApp: 94992993138';
  const topBand = 14; // altura da faixa do cabeçalho
  function drawPdfHeader(doc){
    try {
      const w = pageWidth;
      doc.setFillColor(11,18,32); // #0b1220
      doc.rect(0, 0, w, topBand, 'F');
      doc.setTextColor(229,231,235); // #e5e7eb
      doc.setFont('helvetica','bold');
      doc.setFontSize(10);
      doc.text(brandLine, w/2, 9, { align:'center', baseline:'middle' });
    } catch {}
  }

  drawPdfHeader(pdf);
  let hLeft = imgHeight;
  let position = topBand + 4; // iniciar abaixo do cabeçalho
  while (hLeft > 0) {
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    hLeft -= pageHeight;
    if (hLeft > 0) { pdf.addPage(); drawPdfHeader(pdf); position = topBand + 4; }
  }

  const name = getProfileName();
  pdf.save(`Diagnostico5S10X_${name || 'usuario'}_${getDateYmd()}.pdf`);
}

// Helpers
function safeReadLocal(key){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function getProfileInfo(){ try{ const raw = localStorage.getItem('perfil5S'); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function getProfileName(){ const p = getProfileInfo(); return (p && p.name) ? p.name.replace(/\s+/g,'_') : ''; }
function getDateYmd(){ const d = new Date(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}${m}${day}`; }
