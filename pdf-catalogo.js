/* ==========================================================================
   Catálogo Xalingo 2026 (COM PREÇOS) — Gerador de PDF completo
   --------------------------------------------------------------------------
   Monta, no próprio navegador, um único PDF com:
     capa → sumário (cartões, com links) → lançamentos da 2ª onda → 7 categorias
   A tabela de preço (ICMS 18% / 12% RS / 12% SC-PR-SP / 7% / EXP-IND) é
   escolhida na janela do PDF. Os selos de preço são TEXTO VETORIAL.

   Uso: <script src="pdf-catalogo.js" defer></script>
        <button onclick="XalingoPDF.abrir()">…</button>
   ========================================================================== */
(function () {
  'use strict';

  /* ── Configuração ─────────────────────────────────────────────────────── */

  // Ordem e cores = sumário do catálogo (sumario.html)
  var CATEGORIAS = [
    { num: '01', arquivo: 'blocos-de-montar.html', nome: 'Blocos de Montar', bar: '#293b7f', bg: '#a496b0', txt: '#1e2a5a' },
    { num: '02', arquivo: 'educativos.html',       nome: 'Educativos',       bar: '#4d359a', bg: '#b49abf', txt: '#3a2470' },
    { num: '03', arquivo: 'jogos.html',            nome: 'Jogos',            bar: '#ef3128', bg: '#eda487', txt: '#8b1a15' },
    { num: '04', arquivo: 'faz-de-conta.html',     nome: 'Faz de Conta',     bar: '#5ec9c8', bg: '#c1d7c8', txt: '#2a7574' },
    { num: '05', arquivo: 'rodados.html',          nome: 'Rodados',          bar: '#63c437', bg: '#c1d597', txt: '#3a7520' },
    { num: '06', arquivo: 'esportes.html',         nome: 'Esportes',         bar: '#f89e1c', bg: '#efc68f', txt: '#8a5a0e' },
    { num: '07', arquivo: 'playground.html',       nome: 'Playground',       bar: '#891434', bg: '#c78c88', txt: '#5e0e24' }
  ];

  var CAPA = 'capa.jpg';
  var LOGO = 'logo-xalingo.png';

  // Lançamentos: só a 2ª onda, lida do site dela (mesmo domínio github.io), com
  // fotos, medidas, avisos e preços. Entram logo depois do sumário, 2 por página.
  // Se o site não responder, usa os itens onda:2 da lancamentos.html deste catálogo.
  var LANCAMENTOS = {
    fonte: 'https://inovacaoxalingo.github.io/lancamentos/index.html',
    local: 'lancamentos.html',
    ocultar: 'https://inovacaoxalingo.github.io/catalog-xalingo2026/pdf-ocultar.json',
    arquivo: 'lancamentos.html',          // chave das seções no sumário
    nome: 'Lançamentos 2026 · 2ª onda',
    bar: '#f0a030', bg: '#1b3a5c', txt: '#f6c26b',
    porPagina: 2,
    fotos: 3                               // 1 grande + 2 menores
  };
  var TAG_LANC = { lanc: '#a01e1e', linha: '#7b1fa2', opo: '#c2410c' };

  // Fontes do catálogo (Fredoka / Quicksand) embutidas no PDF; sem elas, Helvetica.
  var FONTKIT = ['pdf/fontkit.umd.min.js',
                 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js',
                 'https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'];
  var FONTES = { tit: 'pdf/fonts/Fredoka-Bold.ttf', tit2: 'pdf/fonts/Fredoka-SemiBold.ttf',
                 txt: 'pdf/fonts/Quicksand-Medium.ttf', neg: 'pdf/fonts/Quicksand-Bold.ttf' };

  // Página do catálogo: 210 × 280 mm (proporção 3:4 das imagens originais)
  var PW = 595.28, PH = 793.70;

  var QUALIDADES = {
    alta:  { rotulo: 'Alta',  larguraMax: 0,    jpeg: 1.00, nota: 'resolução original · ~160 MB' },
    media: { rotulo: 'Média', larguraMax: 1200, jpeg: 0.82, nota: 'ótima na tela e na impressão · ~45 MB' },
    leve:  { rotulo: 'Leve',  larguraMax: 900,  jpeg: 0.72, nota: 'para mandar por e-mail · ~20 MB' }
  };

  var ROTULO_ICMS = {
    p18:    { arquivo: 'ICMS18',   curto: 'ICMS 18%',     texto: 'ICMS 18%' },
    p12rs:  { arquivo: 'ICMS12RS', curto: '12% RS',       texto: 'ICMS 12% RS' },
    p12:    { arquivo: 'ICMS12',   curto: '12% SC/PR/SP', texto: 'ICMS 12% SC/PR/SP/RJ/MG' },
    p7:     { arquivo: 'ICMS7',    curto: 'ICMS 7%',      texto: 'ICMS 7%' },
    expind: { arquivo: 'EXP-IND',  curto: 'EXP-IND',      texto: 'Exportação Indireta' }
  };

  var CDNS = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
  ];

  var NAVY = '#1b3a5c', CREME = '#f5e5d6', VERMELHO = '#a01e1e', VERDE = '#0e6e5a';

  var cancelado = false;

  /* ── Utilidades ───────────────────────────────────────────────────────── */

  // Fontes embutidas cobrem Latin-1 + pontuação; tira emoji e afins antes de desenhar
  function limpar(s) {
    return String(s == null ? '' : s).replace(/[‐‑−]/g, '-')
      .replace(/[^\x20-\xFF–—‘’“”•…€]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  function hex(h, PDFLib) {
    var n = parseInt(h.replace('#', ''), 16);
    return PDFLib.rgb((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
  }

  function preco(valor, icms) {
    if (valor > 0) return 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return icms === 'expind' ? 'Sob consulta' : 'Aguardar';
  }

  function icmsAtual() {
    try {
      var exp = localStorage.getItem('xalingo-expind') === '1';
      return exp ? 'expind' : (localStorage.getItem('xalingo-icms') || 'p18');
    } catch (e) { return 'p18'; }
  }

  function carregarScript(urls, i) {
    i = i || 0;
    return new Promise(function (ok, falhou) {
      if (i >= urls.length) return falhou(new Error('cdn'));
      var s = document.createElement('script');
      s.src = urls[i];
      s.onload = ok;
      s.onerror = function () { s.remove(); carregarScript(urls, i + 1).then(ok, falhou); };
      document.head.appendChild(s);
    });
  }

  // Recorta um literal { … } ou [ … ] do texto-fonte, ignorando strings e comentários.
  // Ancora na DECLARAÇÃO da constante — o nome também aparece antes, em usos.
  function recortarLiteral(txt, nome, abre, fecha) {
    var m = new RegExp('(?:const|let|var)\\s+' + nome + '\\s*=').exec(txt);
    if (!m) return null;
    var i = m.index;
    var ini = txt.indexOf(abre, i);
    if (ini < 0) return null;
    var nivel = 0, aspas = null, escapado = false;
    for (var j = ini; j < txt.length; j++) {
      var c = txt[j];
      if (escapado) { escapado = false; continue; }
      if (aspas) {
        if (c === '\\') escapado = true;
        else if (c === aspas) aspas = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
      if (c === '/' && txt[j + 1] === '/') { j = txt.indexOf('\n', j); if (j < 0) break; continue; }
      if (c === '/' && txt[j + 1] === '*') { j = txt.indexOf('*/', j) + 1; if (j < 1) break; continue; }
      if (c === abre) nivel++;
      else if (c === fecha) { nivel--; if (nivel === 0) return txt.slice(ini, j + 1); }
    }
    return null;
  }

  function avaliarLiteral(html, nome, abre, fecha) {
    var lit = recortarLiteral(html, nome, abre, fecha);
    if (!lit) return null;
    try { return new Function('return ' + lit)(); } catch (e) { return null; }
  }

  async function lerTexto(url) {
    var r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' (HTTP ' + r.status + ')');
    return r.text();
  }

  /* ── Leitura das 7 páginas ────────────────────────────────────────────── */

  async function lerCategoria(cat) {
    var resp = await fetch(cat.arquivo, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(cat.arquivo + ' (HTTP ' + resp.status + ')');
    var html = await resp.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');

    var imgs = Array.prototype.slice.call(doc.querySelectorAll('img.page-cover, img.page-img'));
    var paginas = imgs.map(function (im) {
      var src = im.getAttribute('src');
      return { url: new URL(src, location.href).href, chave: src.split('/').pop().replace(/\.[a-z]+$/i, '') };
    });

    var precos = avaliarLiteral(html, 'PRICE_CONFIG', '{', '}') || {};
    var ocultas = {};
    (avaliarLiteral(html, 'REFS_OCULTAS', '[', ']') || []).forEach(function (r) { ocultas[r] = 1; });
    var indisponiveis = avaliarLiteral(html, 'REFS_INDISPONIVEIS', '{', '}') || {};

    // âncora de seção -> índice da imagem onde a seção começa
    var ancoras = {};
    Array.prototype.forEach.call(doc.querySelectorAll('.section-anchor[id]'), function (a) {
      var alvo = a.parentElement && a.parentElement.querySelector('img.page-img, img.page-cover');
      if (!alvo) return;
      var idx = imgs.indexOf(alvo);
      if (idx >= 0) ancoras[a.id] = idx;
    });

    function paginaDe(chave) {
      var alvo = -1;
      for (var i = 0; i < paginas.length; i++) {
        if (paginas[i].chave === chave) return i;
        if (alvo < 0 && paginas[i].chave.indexOf(chave) >= 0) alvo = i;
      }
      return alvo;
    }

    // ref -> página em que o selo aparece
    var selosPorPagina = paginas.map(function () { return []; });
    Object.keys(precos).forEach(function (ref) {
      if (ocultas[ref]) return;
      var d = precos[ref];
      if (!d || !d.img) return;
      var alvo = paginaDe(d.img);
      if (alvo >= 0) selosPorPagina[alvo].push({ ref: ref, d: d });
    });

    // ref -> véu de "indisponível" na página em que o produto aparece
    var veusPorPagina = paginas.map(function () { return []; });
    Object.keys(indisponiveis).forEach(function (ref) {
      var v = indisponiveis[ref] || {};
      var chave = v.img || (precos[ref] && precos[ref].img);
      if (!chave) return;
      var alvo = paginaDe(chave);
      if (alvo >= 0) veusPorPagina[alvo].push(v);
    });

    return { cat: cat, paginas: paginas, selos: selosPorPagina, veus: veusPorPagina, ancoras: ancoras,
             secoes: secoesDe(doc, cat.arquivo)[cat.arquivo.toLowerCase()] || [],
             precos: precos, ocultas: ocultas, indisponiveis: indisponiveis };
  }

  // Nomes das seções: links "arquivo.html#ancora" da sidebar (categorias) ou do sumário.
  // Link só com "#ancora" pertence ao próprio arquivo.
  function secoesDe(raiz, arquivoAtual) {
    var mapa = {};
    Array.prototype.forEach.call(raiz.querySelectorAll('.sb-sub[href], a.item[href]'), function (a) {
      var p = (a.getAttribute('href') || '').split('#');
      if (p.length < 2 || !p[1]) return;
      var arq = (p[0] || arquivoAtual || '').split('/').pop().toLowerCase();
      if (!arq) return;
      var c = a.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.sb-sub-page, .item-page, .item-arrow'), function (x) { x.remove(); });
      var lista = (mapa[arq] = mapa[arq] || []);
      if (lista.some(function (x) { return x.id === p[1]; })) return;
      lista.push({ id: p[1], nome: limpar(c.textContent) });
    });
    return mapa;
  }

  // da página aberta agora (já traduzida pelo idioma ativo)
  function lerSecoesDaPagina() {
    return secoesDe(document, (location.pathname.split('/').pop() || 'index.html').toLowerCase());
  }

  /* ── Lançamentos · 2ª onda ───────────────────────────────────────────── */

  // devolve [{ id, titulo, itens:[produto] }] — um grupo por seção do site da 2ª onda
  async function lerLancamentos(precosCatalogo) {
    var extra = {}, precosLocal = {};
    try {
      var htmlLocal = await lerTexto(LANCAMENTOS.local);
      var prodsLocal = avaliarLiteral(htmlLocal, 'PRODUCTS', '[', ']') || [];
      var entrega = avaliarLiteral(htmlLocal, 'DELIVERY', '{', '}') || {};
      var descs = avaliarLiteral(htmlLocal, 'DESCS', '{', '}') || {};
      var medidas = avaliarLiteral(htmlLocal, 'MEDIDAS', '{', '}') || {};
      precosLocal = avaliarLiteral(htmlLocal, 'PRICE_CONFIG', '{', '}') || {};
      prodsLocal.forEach(function (p) {
        extra[p.ref] = { p: p, idade: p.idade || '', entrega: entrega[p.ref] || '',
                         desc: (descs[p.ref] || '').split('\n\n')[0], log: medidas[p.ref] || null };
      });
    } catch (e) { /* segue sem os extras */ }

    // preço: site da 2ª onda → lancamentos.html → página da categoria (EXP-IND só existe nas categorias)
    function precoDe(ref, doSite) {
      var cat = precosCatalogo[ref] || {}, loc = precosLocal[ref] || {}, d = {};
      ['p18', 'p12rs', 'p12', 'p7', 'expind'].forEach(function (k) {
        var v = [doSite && doSite[k], loc[k], cat[k]].filter(function (x) { return x > 0; })[0];
        d[k] = v || 0;
      });
      d.cx = loc.cx || cat.cx || 0;
      d.pedido_min = loc.pedido_min || cat.pedido_min || 0;
      d.origem = loc.origem || cat.origem || 'NAC';
      return d;
    }

    try {
      var html = await lerTexto(LANCAMENTOS.fonte);
      var prods = avaliarLiteral(html, 'PRODUTOS', '[', ']');
      if (!prods || !prods.length) throw new Error('sem PRODUTOS');
      var logist = avaliarLiteral(html, 'LOGISTICA', '{', '}') || {};
      var precosSite = avaliarLiteral(html, 'PRECOS', '{', '}') || {};
      var secoes = avaliarLiteral(html, 'SECOES', '[', ']') || [{ id: '*', titulo: '2ª onda de lançamentos' }];
      var mB = /const\s+B\s*=\s*["']([^"']+)["']/.exec(html);
      var base = mB ? mB[1] : 'https://produtosxalingo.oneweb.com.br/wp-content/uploads/';

      var itens = prods.map(function (p) {
        var x = extra[p.ref] || {};
        return {
          ref: p.ref, proj: p.proj || '', nome: p.nome, cat: p.cat,
          tag: p.tag || 'LANÇAMENTO', tagc: p.tagc || 'lanc', ean: p.ean || '', url: p.url || '',
          desc: p.desc || x.desc || '',
          aviso: p.aviso ? (typeof p.aviso === 'string' ? { titulo: p.aviso, texto: '' } : p.aviso) : null,
          fotos: (p.imgs || []).slice(0, LANCAMENTOS.fotos).map(function (f) { return /^https?:/.test(f) ? f : base + f; }),
          log: logist[p.ref] || x.log || null,
          idade: x.idade || '',
          entrega: x.entrega || (p.estoque !== false ? 'Pronta entrega' : ''),
          estoque: p.estoque !== false,
          preco: precoDe(p.ref, precosSite[p.ref])
        };
      });
      await Promise.all(itens.map(async function (it) {
        var atuais = await fotosAtuais(it.url);
        if (atuais) it.fotos = atuais.slice(0, LANCAMENTOS.fotos);
      }));
      var grupos = secoes.map(function (sc) {
        return { id: 'onda2-' + sc.id, titulo: sc.titulo,
                 itens: itens.filter(function (p) { return sc.id === '*' || p.cat === sc.id; }) };
      });
      var soltos = itens.filter(function (p) { return !grupos.some(function (g) { return g.itens.indexOf(p) >= 0; }); });
      if (soltos.length) grupos.push({ id: 'onda2-outros', titulo: 'Outros', itens: soltos });
      return grupos.filter(function (g) { return g.itens.length; });
    } catch (e) {
      // reserva: itens da 2ª onda que estão na lancamentos.html deste catálogo
      var lista = Object.keys(extra).map(function (r) { return extra[r]; })
        .filter(function (x) { return x.p.onda === 2; })
        .map(function (x) {
          var p = x.p;
          return { ref: p.ref, proj: '', nome: p.nome, tag: p.tag || 'Lançamento', tagc: p.tagc || 'lanc',
                   ean: p.ean || '', desc: x.desc, aviso: p.aviso ? { titulo: p.aviso, texto: '' } : null,
                   fotos: p.img ? [p.img] : [], log: x.log, idade: x.idade,
                   entrega: x.entrega, estoque: x.entrega === 'Pronta entrega', preco: precoDe(p.ref, null) };
        });
      return lista.length ? [{ id: 'onda2', titulo: '2ª onda de lançamentos', itens: lista }] : [];
    }
  }

  // REFs da 2ª onda tiradas do PDF (mesma lista do catálogo sem preço)
  async function lerLancamentosOcultos() {
    try {
      var r = await fetch(LANCAMENTOS.ocultar, { cache: 'no-cache' });
      if (!r.ok) return [];
      var j = await r.json();
      return (j.lancamentosOcultos || []).map(function (x) { return String(x).replace('.', ''); });
    } catch (e) { return []; }
  }

  // Mesma sincronização da página da 2ª onda: lê as imagens que estão hoje no post do produto
  var WP_API = 'https://produtosxalingo.oneweb.com.br/wp-json/wp/v2';
  async function fotosAtuais(urlPost) {
    if (!urlPost) return null;
    try {
      var slug = urlPost.replace(/\/+$/, '').split('/').pop();
      var r = await fetch(WP_API + '/posts?slug=' + encodeURIComponent(slug) + '&_fields=id,content',
                          { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return null;
      var post = (await r.json())[0];
      if (!post || !post.content) return null;
      var vistos = {}, fotos = [];
      (post.content.rendered.match(/<img\b[^>]*>/gi) || []).forEach(function (tag) {
        var m = /\ssrc=["']([^"']+)["']/i.exec(tag);
        if (!m || !/\/wp-content\/uploads\//.test(m[1]) || /logo|fundo_blog/i.test(m[1])) return;
        var chave = m[1].replace(/-\d+x\d+(\.(?:png|jpe?g|webp))$/i, '$1');
        if (vistos[chave]) return;
        vistos[chave] = 1; fotos.push(m[1]);
      });
      return fotos.length ? fotos : null;
    } catch (e) { return null; }
  }

  function paginasDoGrupo(g) { return Math.ceil(g.itens.length / LANCAMENTOS.porPagina); }

  // Fotos ficam no WordPress (oneweb), que não libera CORS: tenta o proxy de imagem
  // primeiro (já entrega JPEG com fundo branco), depois direto.
  function candidatosFoto(url, lado) {
    var original = url.replace(/-\d+x\d+(\.(?:png|jpe?g|webp))$/i, '$1');
    var lista = [];
    (original === url ? [url] : [url, original]).forEach(function (u) {
      lista.push('https://images.weserv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, '')) +
                 '&w=' + lado + '&h=' + lado + '&fit=inside&output=jpg&bg=white&q=85');
      lista.push(u);
      lista.push('https://corsproxy.io/?url=' + encodeURIComponent(u));
    });
    return lista;
  }

  async function fotoLancamento(url, lado) {
    if (!url) return null;
    var alvos = candidatosFoto(url, lado);
    for (var i = 0; i < alvos.length; i++) {
      try {
        var r = await fetch(alvos[i], { cache: 'force-cache', signal: AbortSignal.timeout(15000) });
        if (!r.ok) continue;
        var blob = await r.blob();
        if (!blob || blob.size < 200 || !/^image\//.test(blob.type || 'image/')) continue;
        var bmp = await createImageBitmap(blob);
        var esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(bmp.width * esc));
        cv.height = Math.max(1, Math.round(bmp.height * esc));
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff';                       // PNG transparente não vira preto
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
        bmp.close && bmp.close();
        var saida = await new Promise(function (ok) { cv.toBlob(ok, 'image/jpeg', 0.86); });
        cv.width = cv.height = 0;
        return new Uint8Array(await saida.arrayBuffer());
      } catch (e) { /* tenta o próximo */ }
    }
    return null;
  }

  function quebrarLinhas(txt, fonte, tam, largura, maxLinhas) {
    var linhas = [];
    String(txt || '').split('\n').forEach(function (par) {
      var atual = '';
      par.split(/\s+/).filter(Boolean).forEach(function (w) {
        var t = atual ? atual + ' ' + w : w;
        if (fonte.widthOfTextAtSize(t, tam) <= largura || !atual) atual = t;
        else { linhas.push(atual); atual = w; }
      });
      if (atual) linhas.push(atual);
    });
    if (maxLinhas != null && linhas.length > maxLinhas) {
      linhas = linhas.slice(0, Math.max(0, maxLinhas));
      if (linhas.length) {
        var u = linhas[linhas.length - 1];
        while (u.length > 3 && fonte.widthOfTextAtSize(u + '…', tam) > largura) u = u.slice(0, -1);
        linhas[linhas.length - 1] = u + '…';
      }
    }
    return linhas;
  }

  function mm(a) { return a && a.length ? a.join(' × ') + ' mm' : ''; }

  /* ── Formas ───────────────────────────────────────────────────────────── */

  // retângulo arredondado; (x, y) = canto INFERIOR esquerdo, como no resto do pdf-lib
  // r = [sup.esq, sup.dir, inf.dir, inf.esq]
  function caixaRedonda(page, x, y, w, h, r, opts) {
    var rr = Array.isArray(r) ? r : [r, r, r, r];
    rr = rr.map(function (v) { return Math.max(0, Math.min(v, w / 2, h / 2)); });
    var d = 'M ' + rr[0] + ',0 H ' + (w - rr[1]) + ' Q ' + w + ',0 ' + w + ',' + rr[1] +
            ' V ' + (h - rr[2]) + ' Q ' + w + ',' + h + ' ' + (w - rr[2]) + ',' + h +
            ' H ' + rr[3] + ' Q 0,' + h + ' 0,' + (h - rr[3]) +
            ' V ' + rr[0] + ' Q 0,0 ' + rr[0] + ',0 Z';
    var o = { x: x, y: y + h };
    Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
    page.drawSvgPath(d, o);
  }

  /* ── Lançamentos: páginas ─────────────────────────────────────────────── */

  // Desenha as páginas de lançamentos a partir do índice `inicio` (0 = primeira página do PDF)
  async function desenharLancamentos(pdf, PDFLib, F, grupos, fotos, inicio, icms) {
    var rgb = PDFLib.rgb, H = function (h) { return hex(h, PDFLib); };
    var navy = H(NAVY), creme = H(CREME), ouro = H('#f0a030');
    var branco = rgb(1, 1, 1), linha = rgb(0.86, 0.82, 0.76);
    var M = 28, VAO = 14, TOPO = PH - 80, BASE = 34;
    var bw = PW - M * 2, bh = (TOPO - BASE - VAO) / 2;
    var cache = {}, idx = inicio;
    var rot = (ROTULO_ICMS[icms] || ROTULO_ICMS.p18);

    async function imagem(ref, k) {
      var chave = ref + ':' + k;
      if (chave in cache) return cache[chave];
      var b = fotos[ref] && fotos[ref][k];
      try { cache[chave] = b ? await pdf.embedJpg(b) : null; } catch (e) { cache[chave] = null; }
      return cache[chave];
    }
    function encaixar(page, img, x, y, w, h) {
      caixaRedonda(page, x, y, w, h, 6, { color: branco, borderColor: linha, borderWidth: 0.5 });
      if (!img) return false;
      var k = Math.min((w - 10) / img.width, (h - 10) / img.height);
      var iw = img.width * k, ih = img.height * k;
      page.drawImage(img, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih });
      return true;
    }
    function texto(page, t, x, y, tam, f, c, op) {
      page.drawText(limpar(t), { x: x, y: y, size: tam, font: f, color: c || navy, opacity: op == null ? 1 : op });
    }

    for (var g = 0; g < grupos.length; g++) {
      var grupo = grupos[g], nPag = paginasDoGrupo(grupo);
      for (var pg = 0; pg < nPag; pg++) {
        var page = pdf.insertPage(idx++);
        page.setSize(PW, PH);

        // cabeçalho
        page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: creme });
        page.drawRectangle({ x: 0, y: PH - 60, width: PW, height: 60, color: navy });
        page.drawRectangle({ x: 0, y: PH - 63, width: PW, height: 3, color: ouro });
        texto(page, 'LANÇAMENTOS 2026 · 2ª ONDA', M, PH - 33, 17, F.tit, branco);
        texto(page, grupo.titulo + (nPag > 1 ? '  ·  ' + (pg + 1) + '/' + nPag : ''), M, PH - 50, 9, F.neg, ouro);
        var tPreco = 'Preços: ' + rot.texto;
        var wP = F.neg.widthOfTextAtSize(limpar(tPreco), 8.5) + 18;
        caixaRedonda(page, PW - M - wP, PH - 42, wP, 18, 9, { color: icms === 'expind' ? H(VERDE) : H(VERMELHO) });
        texto(page, tPreco, PW - M - wP + 9, PH - 36, 8.5, F.neg, branco);

        var itens = grupo.itens.slice(pg * LANCAMENTOS.porPagina, (pg + 1) * LANCAMENTOS.porPagina);
        for (var i = 0; i < itens.length; i++) {
          var p = itens[i];
          var x = M, yTopo = TOPO - i * (bh + VAO), y = yTopo - bh;
          var corTag = H(TAG_LANC[p.tagc] || TAG_LANC.lanc);

          caixaRedonda(page, x, y, bw, bh, 12, { color: branco, borderColor: linha, borderWidth: 0.6 });
          caixaRedonda(page, x, y, 6, bh, [12, 0, 0, 12], { color: corTag });

          // ── coluna das fotos ──
          var P = 12, fx = x + P + 4, fw = 226;
          var thumbs = Math.max(0, Math.min(2, (p.fotos || []).length - 1));
          var th = thumbs ? 76 : 0, gap = thumbs ? 8 : 0;
          var fh = bh - P * 2 - th - gap;
          var principal = await imagem(p.ref, 0);
          if (!encaixar(page, principal, fx, yTopo - P - fh, fw, fh)) {
            var sf = 'Foto em breve';
            texto(page, sf, fx + (fw - F.txt.widthOfTextAtSize(sf, 9)) / 2, yTopo - P - fh / 2 - 3, 9, F.txt, navy, 0.4);
          }
          for (var t = 0; t < thumbs; t++) {
            var tw = (fw - 8) / 2;
            encaixar(page, await imagem(p.ref, t + 1), fx + t * (tw + 8), y + P, tw, th);
          }

          // ── coluna de dados ──
          var cx = fx + fw + 18, cw = x + bw - P - cx, cy = yTopo - P;

          // selos
          var selos = [{ txt: limpar(p.tag).toUpperCase(), c: corTag }];
          if (p.estoque) selos.push({ txt: 'PRONTA ENTREGA', c: rgb(0.16, 0.48, 0.25) });
          var sx = cx;
          selos.forEach(function (sl) {
            var w = F.neg.widthOfTextAtSize(sl.txt, 6.6) + 14;
            caixaRedonda(page, sx, cy - 14, w, 14, 7, { color: sl.c });
            texto(page, sl.txt, sx + 7, cy - 9.6, 6.6, F.neg, branco);
            sx += w + 5;
          });
          cy -= 28;

          texto(page, 'REF. ' + p.ref + (p.proj ? '   ·   PROJETO ' + p.proj : ''), cx, cy, 7.6, F.neg, navy, 0.55);
          cy -= 17;
          quebrarLinhas(limpar(p.nome), F.tit2, 14, cw, 2).forEach(function (l) {
            texto(page, l, cx, cy, 14, F.tit2, navy); cy -= 16.5;
          });
          cy -= 4;

          // preço
          var d = p.preco || {};
          var valor = d[icms] || 0;
          var importado = icms === 'expind' && d.origem === 'IMP';
          var tVal = preco(valor, icms);
          var corPreco = icms === 'expind' ? H(VERDE) : H(VERMELHO);
          var hPreco = importado ? 38 : 30;
          var lblPreco = 'PREÇO UN. · ' + rot.curto.toUpperCase();
          var wPreco = Math.max(F.tit.widthOfTextAtSize(tVal, 15), F.neg.widthOfTextAtSize(lblPreco, 5.8)) + 22;
          caixaRedonda(page, cx, cy - hPreco, wPreco, hPreco, 7, { color: corPreco });
          texto(page, lblPreco, cx + 11, cy - 10, 5.8, F.neg, branco, 0.75);
          texto(page, tVal, cx + 11, cy - 25, 15, F.tit, branco);
          if (importado) texto(page, 'IMPORTADO · taxas diferentes', cx + 11, cy - 34, 5.6, F.neg, rgb(1, 0.874, 0.541));
          cy -= hPreco + 10;

          // rodapé do bloco: ficha técnica (desenhada de baixo para cima)
          var qtdCx = (p.log && p.log.qtd) || d.cx;
          var fichas = [
            ['EAN', p.ean], ['Idade', p.idade], ['Embalagem', mm(p.log && p.log.emb)],
            ['Caixa master', mm(p.log && p.log.cx)], ['Qtd / caixa', qtdCx ? qtdCx + ' un.' : ''],
            ['Pedido mín.', d.pedido_min ? d.pedido_min + ' un.' : ''],
            ['Entrega', p.entrega]
          ].filter(function (f) { return f[1]; });
          var colW = (cw - 10) / 2, linhaH = 24, nLin = Math.ceil(fichas.length / 2);
          var fichaTopo = y + P + nLin * linhaH;
          fichas.forEach(function (f, k) {
            var fxk = cx + (k % 2) * (colW + 10), fyk = fichaTopo - Math.floor(k / 2) * linhaH;
            page.drawRectangle({ x: fxk, y: fyk - linhaH + 2, width: colW, height: 0.5, color: linha });
            texto(page, f[0].toUpperCase(), fxk, fyk - 8, 6, F.neg, navy, 0.5);
            texto(page, quebrarLinhas(limpar(f[1]), F.neg, 8.4, colW, 1)[0] || '', fxk, fyk - 17, 8.4, F.neg, navy);
          });

          // aviso logo acima da ficha técnica; descrição ocupa o espaço que sobrar
          var limite = fichaTopo + 8;
          var avisoLinhas = [], avH = 0;
          if (p.aviso) {
            avisoLinhas = quebrarLinhas(limpar(p.aviso.texto), F.txt, 7.4, cw - 18, 2);
            avH = 14 + avisoLinhas.length * 9.5 + 5;
          }
          var descMax = Math.floor((cy - limite - (avH ? avH + 6 : 0)) / 11);
          quebrarLinhas(limpar(p.desc), F.txt, 8.6, cw, Math.max(0, descMax)).forEach(function (l) {
            texto(page, l, cx, cy - 2, 8.6, F.txt, navy, 0.85); cy -= 11;
          });
          if (p.aviso) {
            var aTopo = limite + avH;
            caixaRedonda(page, cx, limite, cw, avH, 6, { color: rgb(1, 0.953, 0.847),
                          borderColor: rgb(0.973, 0.62, 0.11), borderWidth: 0.8 });
            texto(page, '! ' + p.aviso.titulo, cx + 9, aTopo - 12, 7.6, F.neg, rgb(0.54, 0.35, 0.05));
            avisoLinhas.forEach(function (l, k) {
              texto(page, l, cx + 9, aTopo - 23 - k * 9.5, 7.4, F.txt, rgb(0.42, 0.29, 0.06));
            });
          }
        }

        texto(page, 'Medidas em mm (C × L × A) · imagens ilustrativas · preços sujeitos a alteração sem aviso prévio',
              M, 18, 7, F.txt, navy, 0.45);
      }
    }
    return idx - inicio;
  }

  /* ── Selo de preço e véu ──────────────────────────────────────────────── */

  // Véu branco sobre a área de um produto indisponível. Caixa em % da página, igual ao HTML.
  function desenharVeu(page, fonte, rgb, v) {
    var num = function (valor, padrao) { return (valor == null ? padrao : valor) / 100; };
    var larg = num(v.width, 94) * PW;
    var alt  = num(v.height, 50) * PH;
    var x    = num(v.left, 0) * PW;
    var y    = PH - num(v.top, 0) * PH - alt;

    page.drawRectangle({ x: x, y: y, width: larg, height: alt, color: rgb(1, 1, 1), opacity: 0.84 });

    var texto = limpar(v.texto || 'Indisponível no momento');
    if (!texto) return;
    var tam = PW * 0.0245;
    var rotuloY = v.textoY != null ? v.textoY : (v.top == null ? 0 : v.top) + (v.height == null ? 50 : v.height) / 2;
    page.drawText(texto, {
      x: x + (larg - fonte.widthOfTextAtSize(texto, tam)) / 2,
      y: PH - rotuloY / 100 * PH - tam * 0.35,
      size: tam, font: fonte, color: rgb(0.2, 0.2, 0.2)
    });
  }

  function desenharSelo(page, F, rgb, item, icms) {
    var d = item.d;
    var texto = limpar(preco(d[icms], icms));
    var ref = limpar(item.ref);
    var importado = icms === 'expind' && (d.origem || 'IMP') === 'IMP';
    var aviso = importado ? 'IMPORTADO · taxas dif.' : null;

    var fRef = 6.2, fVal = 10.4, fAviso = 5.4, padX = 5.6, padY = 3.2, vao = 1.4;

    var larg = Math.max(
      F.txt.widthOfTextAtSize(ref, fRef),
      F.neg.widthOfTextAtSize(texto, fVal),
      aviso ? F.neg.widthOfTextAtSize(aviso, fAviso) : 0
    ) + padX * 2;
    var alt = padY * 2 + fRef + vao + fVal + (aviso ? vao + fAviso : 0);

    var x = Math.min(Math.max(d.x / 100 * PW, 3), PW - larg - 3);
    var y = Math.min(Math.max(PH - (d.y / 100 * PH) - alt, 3), PH - alt - 3);

    var fundo = icms === 'expind' ? rgb(0.055, 0.431, 0.353) : rgb(0.627, 0.118, 0.118);
    caixaRedonda(page, x, y, larg, alt, 3.5, { color: fundo, opacity: 0.9 });

    var cur = y + alt - padY - fRef * 0.82;
    page.drawText(ref, { x: x + padX, y: cur, size: fRef, font: F.txt, color: rgb(1, 1, 1), opacity: 0.7 });
    cur -= fRef * 0.18 + vao + fVal * 0.82;
    page.drawText(texto, { x: x + padX, y: cur, size: fVal, font: F.neg, color: rgb(1, 1, 1) });
    if (aviso) {
      cur -= fVal * 0.18 + vao + fAviso * 0.82;
      page.drawText(aviso, { x: x + padX, y: cur, size: fAviso, font: F.neg, color: rgb(1, 0.874, 0.541) });
    }
  }

  /* ── Sumário (cartões coloridos, como o sumario.html, com links) ─────── */

  function montarSumario(pdf, PDFLib, F, logo, plano, secoes, icms) {
    var rgb = PDFLib.rgb, H = function (h) { return hex(h, PDFLib); };
    var page = pdf.insertPage(1);
    page.setSize(PW, PH);
    var navy = H(NAVY), branco = rgb(1, 1, 1);
    var rot = (ROTULO_ICMS[icms] || ROTULO_ICMS.p18);
    var links = [];

    function centro(t, f, tam, y, cor, op) {
      t = limpar(t);
      page.drawText(t, { x: (PW - f.widthOfTextAtSize(t, tam)) / 2, y: y, size: tam, font: f, color: cor, opacity: op == null ? 1 : op });
    }
    function encurtar(txt, f, tam, largura) {
      if (f.widthOfTextAtSize(txt, tam) <= largura) return txt;
      var t = txt;
      while (t.length > 4 && f.widthOfTextAtSize(t + '…', tam) > largura) t = t.slice(0, -1);
      return t + '…';
    }

    // fundo + cabeçalho
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: H(CREME) });
    page.drawCircle({ x: PW - 18, y: PH - 150, size: 40, color: H('#e9dcc2'), opacity: 0.55 });
    page.drawCircle({ x: 14, y: 150, size: 30, color: H('#e9dcc2'), opacity: 0.45 });
    var yTopo = PH - 30;
    if (logo) {
      var lw = 84, lh = lw * logo.height / logo.width;
      page.drawImage(logo, { x: (PW - lw) / 2, y: yTopo - lh, width: lw, height: lh });
      yTopo -= lh + 8;
    }
    centro('Sumário', F.tit, 34, yTopo - 30, navy);
    centro('Explore nossas categorias e descubra o brinquedo ideal', F.txt, 9.5, yTopo - 47, navy, 0.62);

    // selo da tabela de preço aplicada
    var tSelo = 'Preços · ' + rot.texto;
    var wSelo = F.neg.widthOfTextAtSize(limpar(tSelo), 8.5) + 26;
    var ySelo = yTopo - 74;
    caixaRedonda(page, (PW - wSelo) / 2, ySelo, wSelo, 19, 9.5, { color: icms === 'expind' ? H(VERDE) : navy });
    centro(tSelo, F.neg, 8.5, ySelo + 6.2, branco);

    // faixa de cores das categorias
    var nP = CATEGORIAS.length, pw = 17, pg = 4, x0 = (PW - (nP * pw + (nP - 1) * pg)) / 2;
    CATEGORIAS.forEach(function (c, i) {
      caixaRedonda(page, x0 + i * (pw + pg), ySelo - 15, pw, 5, 2.5, { color: H(c.bar) });
    });

    // ── cartões ──
    var MARGEM = 34, VAO_COL = 14, TOPO = ySelo - 30, BASE = 44;
    var colW = (PW - MARGEM * 2 - VAO_COL) / 2;
    var colX = [MARGEM, MARGEM + colW + VAO_COL];

    var cards = plano.map(function (bloco) {
      var subs = (secoes[bloco.cat.arquivo] || []).filter(function (s) { return bloco.ancoras[s.id] != null; });
      return { bloco: bloco, subs: subs };
    });

    // medidas base (encolhem juntas se não couber)
    var BASEM = { padT: 10, cab: 24, div: 7, item: 13.4, padB: 8, vao: 10 };
    function altura(c, m) { return m.padT + m.cab + m.div + c.subs.length * m.item + m.padB; }
    function planejar(m) {
      var total = cards.reduce(function (a, c) { return a + altura(c, m) + m.vao; }, 0);
      // corte sequencial que deixa as duas colunas com altura parecida
      var melhor = { corte: cards.length, maior: Infinity };
      for (var k = 1; k <= cards.length; k++) {
        var esq = 0;
        for (var j = 0; j < k; j++) esq += altura(cards[j], m) + m.vao;
        var maior = Math.max(esq, total - esq);
        if (maior < melhor.maior) melhor = { corte: k, maior: maior };
      }
      return melhor;
    }
    // encolhe se não couber; se sobrar espaço, abre um pouco o respiro (até 30%)
    var m = BASEM, plan = planejar(m), disp = TOPO - BASE;
    var s = plan.maior > disp ? Math.max(0.6, disp / plan.maior) : Math.min(1.3, disp / plan.maior);
    if (s !== 1) {
      m = { padT: BASEM.padT * s, cab: BASEM.cab * Math.min(1, Math.max(s, 0.85)), div: BASEM.div * s,
            item: BASEM.item * s, padB: BASEM.padB * s, vao: BASEM.vao * s };
      plan = planejar(m);
      if (plan.maior > disp) {              // arredondamentos: garante que cabe
        var s2 = disp / plan.maior;
        ['padT', 'div', 'item', 'padB', 'vao'].forEach(function (k) { m[k] *= s2; });
        plan = planejar(m);
      }
    }

    var col = 0, y = TOPO;
    cards.forEach(function (c, idx) {
      if (idx === plan.corte) { col = 1; y = TOPO; }
      var cat = c.bloco.cat, bloco = c.bloco;
      var corBar = H(cat.bar), corBg = H(cat.bg), corTxt = H(cat.txt);
      var hC = altura(c, m), x = colX[col], yb = y - hC;
      var escuro = cat.arquivo === LANCAMENTOS.arquivo;

      // sombra suave + barra + corpo
      caixaRedonda(page, x + 0.6, yb - 1.6, colW, hC, 11, { color: navy, opacity: 0.07 });
      caixaRedonda(page, x, yb, colW, hC, 11, { color: corBar });
      caixaRedonda(page, x + 6, yb, colW - 6, hC, [0, 11, 11, 0], { color: corBg });

      var px = x + 6 + 14, pr = x + colW - 12;
      var yCab = y - m.padT - m.cab + 6;

      // número grande esmaecido + título
      var nx = px;
      if (cat.num) {
        page.drawText(cat.num, { x: px, y: yCab - 1, size: 21, font: F.tit, color: corTxt, opacity: escuro ? 0.35 : 0.2 });
        nx = px + F.tit.widthOfTextAtSize(cat.num, 21) + 7;
      } else {
        // estrela de lançamento no lugar do número
        page.drawSvgPath('M 7,0 L 9,5 L 14,5.3 L 10,8.6 L 11.4,13.6 L 7,10.8 L 2.6,13.6 L 4,8.6 L 0,5.3 L 5,5 Z',
                         { x: px, y: yCab + 12, color: H(LANCAMENTOS.bar) });
        nx = px + 20;
      }
      var faixa = 'p.' + String(bloco.primeira).padStart(2, '0') + '–' + String(bloco.primeira + bloco.total - 1).padStart(2, '0');
      var wFaixa = F.neg.widthOfTextAtSize(faixa, 6.4) + 12;
      var tituloMax = pr - wFaixa - 8 - nx;
      page.drawText(encurtar(limpar(cat.nome), F.tit2, 12.5, tituloMax), { x: nx, y: yCab + 1, size: 12.5, font: F.tit2, color: escuro ? branco : corTxt });
      caixaRedonda(page, pr - wFaixa, yCab, wFaixa, 12, 6, { color: branco, opacity: escuro ? 0.16 : 0.32 });
      page.drawText(faixa, { x: pr - wFaixa + 6, y: yCab + 3.6, size: 6.4, font: F.neg, color: escuro ? branco : corTxt, opacity: 0.75 });
      links.push({ pagina: bloco.primeira, x: x, y: yCab - 6, w: colW, h: m.cab });

      // divisória
      var yDiv = y - m.padT - m.cab;
      page.drawRectangle({ x: px, y: yDiv, width: pr - px, height: 0.6, color: escuro ? branco : rgb(0, 0, 0), opacity: escuro ? 0.18 : 0.08 });

      // itens
      var yi = yDiv - m.div - m.item * 0.62;
      c.subs.forEach(function (sub) {
        var pag = bloco.primeira + bloco.ancoras[sub.id];
        var num = String(pag).padStart(2, '0');
        var wn = F.neg.widthOfTextAtSize(num, 7);
        page.drawCircle({ x: px + 6, y: yi + 2.8, size: 1.7, color: escuro ? H(LANCAMENTOS.bar) : corBar });
        page.drawText(encurtar(limpar(sub.nome), F.neg, 8.6, pr - px - 26 - wn),
                      { x: px + 14, y: yi, size: 8.6, font: F.neg, color: escuro ? H(LANCAMENTOS.txt) : corTxt });
        page.drawText(num, { x: pr - 8 - wn, y: yi + 0.6, size: 7, font: F.neg, color: escuro ? branco : corTxt, opacity: 0.5 });
        links.push({ pagina: pag, x: px, y: yi - m.item * 0.3, w: pr - px, h: m.item });
        yi -= m.item;
      });

      y = yb - m.vao;
    });

    // rodapé
    centro('Catálogo Digital 2026 · 78 anos construindo histórias', F.neg, 7.6, 26, navy, 0.55);
    centro('Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · ' + pdf.getPageCount() +
           ' páginas · preços por unidade, sujeitos a alteração sem aviso prévio · imagens ilustrativas',
           F.txt, 6.8, 15, navy, 0.45);

    // links clicáveis (falha silenciosa: o PDF continua válido sem eles)
    try {
      var ctx = pdf.context;
      var refs = links.map(function (l) {
        var alvo = pdf.getPage(l.pagina - 1);
        return ctx.register(ctx.obj({
          Type: 'Annot', Subtype: 'Link',
          Rect: [l.x, l.y, l.x + l.w, l.y + l.h],
          Border: [0, 0, 0],
          Dest: [alvo.ref, PDFLib.PDFName.of('XYZ'), null, PH, null]
        }));
      });
      page.node.set(PDFLib.PDFName.of('Annots'), ctx.obj(refs));
    } catch (e) { /* sem links */ }
  }

  /* ── Fontes ───────────────────────────────────────────────────────────── */

  async function embutirFontes(pdf, PDFLib) {
    var padrao = {
      tit: await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold),
      txt: await pdf.embedFont(PDFLib.StandardFonts.Helvetica)
    };
    padrao.tit2 = padrao.neg = padrao.tit;
    try {
      if (!window.fontkit) await carregarScript(FONTKIT);
      pdf.registerFontkit(window.fontkit);
      var chaves = Object.keys(FONTES), F = {};
      var bytes = await Promise.all(chaves.map(function (k) {
        return fetch(FONTES[k], { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('fonte'); return r.arrayBuffer();
        });
      }));
      for (var i = 0; i < chaves.length; i++) F[chaves[i]] = await pdf.embedFont(bytes[i], { subset: true });
      F.padrao = false;
      return F;
    } catch (e) {
      padrao.padrao = true;
      return padrao;
    }
  }

  /* ── Interface ────────────────────────────────────────────────────────── */

  function estilo() {
    if (document.getElementById('xpdf-css')) return;
    var s = document.createElement('style');
    s.id = 'xpdf-css';
    s.textContent = [
      '.xpdf-fundo{position:fixed;inset:0;z-index:9000;background:rgba(20,28,40,.55);backdrop-filter:blur(3px);',
      'display:flex;align-items:center;justify-content:center;padding:20px;font-family:Quicksand,sans-serif}',
      '.xpdf-cx{background:#f5e5d6;border-radius:18px;padding:24px;width:100%;max-width:400px;max-height:calc(100vh - 40px);',
      'overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.35)}',
      '.xpdf-tit{font-family:Fredoka,Quicksand,sans-serif;font-size:1.05rem;font-weight:700;color:#1B3A5C;margin-bottom:4px}',
      '.xpdf-sub{font-size:.76rem;color:#1B3A5C;opacity:.65;font-weight:600;line-height:1.45;margin-bottom:16px}',
      '.xpdf-rot{font-size:.62rem;font-weight:800;color:#1B3A5C;opacity:.6;text-transform:uppercase;',
      'letter-spacing:.6px;margin:2px 0 7px}',
      '.xpdf-rot span{text-transform:none;letter-spacing:0;font-weight:600;opacity:.8;margin-left:4px}',
      '.xpdf-icms{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px}',
      '.xpdf-ic{background:#fff;border:1.5px solid rgba(27,58,92,.16);border-radius:9px;padding:8px 6px;cursor:pointer;',
      'font-family:inherit;font-size:.74rem;font-weight:700;color:#1B3A5C;transition:.15s}',
      '.xpdf-ic:hover{border-color:#1B3A5C}',
      '.xpdf-ic.on{background:#1B3A5C;border-color:#1B3A5C;color:#fff}',
      '.xpdf-ic.exp{grid-column:1/-1;color:#0E6E5A;border-color:rgba(14,110,90,.35)}',
      '.xpdf-ic.exp.on{background:#0E6E5A;border-color:#0E6E5A;color:#fff}',
      '.xpdf-op{display:block;width:100%;text-align:left;background:#fff;border:1.5px solid rgba(27,58,92,.16);',
      'border-radius:11px;padding:10px 13px;margin-bottom:8px;cursor:pointer;font-family:inherit;transition:.15s}',
      '.xpdf-op:hover{border-color:#1B3A5C;transform:translateY(-1px)}',
      '.xpdf-op b{display:block;font-size:.85rem;color:#1B3A5C;font-weight:700}',
      '.xpdf-op span{font-size:.68rem;color:#1B3A5C;opacity:.6;font-weight:600}',
      '.xpdf-chk{display:flex;align-items:center;gap:8px;font-size:.76rem;font-weight:600;color:#1B3A5C;',
      'background:#fff;border:1.5px solid rgba(27,58,92,.16);border-radius:11px;padding:9px 12px;margin-bottom:14px;cursor:pointer}',
      '.xpdf-chk input{width:15px;height:15px;accent-color:#1B3A5C;cursor:pointer}',
      '.xpdf-fech{width:100%;background:none;border:none;padding:8px;margin-top:4px;cursor:pointer;',
      'font-family:inherit;font-size:.75rem;font-weight:700;color:#1B3A5C;opacity:.55}',
      '.xpdf-barra{height:7px;background:rgba(27,58,92,.13);border-radius:5px;overflow:hidden;margin:14px 0 9px}',
      '.xpdf-barra i{display:block;height:100%;width:0;background:#A01E1E;border-radius:5px;transition:width .25s}',
      '.xpdf-st{font-size:.72rem;font-weight:700;color:#1B3A5C;opacity:.75;min-height:32px;line-height:1.4}',
      '.xpdf-erro{font-size:.75rem;font-weight:600;color:#A01E1E;line-height:1.5}'
    ].join('');
    document.head.appendChild(s);
  }

  function fechar() {
    var f = document.getElementById('xpdf-fundo');
    if (f) f.remove();
  }

  function caixa(html) {
    estilo();
    fechar();
    var f = document.createElement('div');
    f.className = 'xpdf-fundo';
    f.id = 'xpdf-fundo';
    f.innerHTML = '<div class="xpdf-cx">' + html + '</div>';
    document.body.appendChild(f);
    return f;
  }

  function abrir() {
    var escolhido = icmsAtual();
    var icmsBtns = Object.keys(ROTULO_ICMS).map(function (k) {
      var r = ROTULO_ICMS[k];
      return '<button class="xpdf-ic' + (k === 'expind' ? ' exp' : '') + (k === escolhido ? ' on' : '') +
             '" data-icms="' + k + '">' + (k === 'expind' ? 'EXP-IND · Exportação Indireta' : r.curto) + '</button>';
    }).join('');
    var ops = Object.keys(QUALIDADES).map(function (k) {
      var q = QUALIDADES[k];
      return '<button class="xpdf-op" data-q="' + k + '"><b>' + q.rotulo + '</b><span>' + q.nota + '</span></button>';
    }).join('');
    var f = caixa(
      '<div class="xpdf-tit">Baixar o catálogo completo</div>' +
      '<div class="xpdf-sub">Capa, sumário, lançamentos e as 7 categorias num PDF só, com os preços da tabela que você escolher.</div>' +
      '<div class="xpdf-rot">Tabela de preço</div>' +
      '<div class="xpdf-icms">' + icmsBtns + '</div>' +
      '<label class="xpdf-chk"><input type="checkbox" id="xpdf-lanc" checked><span>Incluir os <b>lançamentos da 2ª onda</b> logo após o sumário</span></label>' +
      '<div class="xpdf-rot">Qualidade <span>quanto maior, mais demora e mais pesa</span></div>' +
      ops +
      '<button class="xpdf-fech">Cancelar</button>'
    );
    f.querySelector('.xpdf-fech').onclick = fechar;
    f.addEventListener('click', function (e) { if (e.target === f) fechar(); });
    Array.prototype.forEach.call(f.querySelectorAll('.xpdf-ic'), function (b) {
      b.onclick = function () {
        escolhido = b.getAttribute('data-icms');
        Array.prototype.forEach.call(f.querySelectorAll('.xpdf-ic'), function (x) { x.classList.toggle('on', x === b); });
      };
    });
    Array.prototype.forEach.call(f.querySelectorAll('.xpdf-op'), function (b) {
      b.onclick = function () {
        var chk = document.getElementById('xpdf-lanc');
        gerar(b.getAttribute('data-q'), { icms: escolhido, lancamentos: !chk || chk.checked });
      };
    });
  }

  /* ── Geração ──────────────────────────────────────────────────────────── */

  async function gerar(nivel, opcoes) {
    opcoes = opcoes || {};
    cancelado = false;
    var q = QUALIDADES[nivel] || QUALIDADES.media;
    var icms = ROTULO_ICMS[opcoes.icms] ? opcoes.icms : icmsAtual();
    var comLanc = opcoes.lancamentos !== false;
    var rot = ROTULO_ICMS[icms] || ROTULO_ICMS.p18;

    var f = caixa(
      '<div class="xpdf-tit">Montando o PDF · ' + rot.texto + '</div>' +
      '<div class="xpdf-sub">Pode deixar esta aba aberta em segundo plano.</div>' +
      '<div class="xpdf-barra"><i id="xpdf-i"></i></div>' +
      '<div class="xpdf-st" id="xpdf-st">Carregando…</div>' +
      '<button class="xpdf-fech">Cancelar</button>'
    );
    var barra = document.getElementById('xpdf-i');
    var st = document.getElementById('xpdf-st');
    f.querySelector('.xpdf-fech').onclick = function () { cancelado = true; fechar(); };

    function passo(pct, txt) {
      barra.style.width = Math.max(0, Math.min(100, pct)) + '%';
      st.textContent = txt;
    }

    function erro(msg) {
      caixa('<div class="xpdf-tit">Não deu para gerar</div><div class="xpdf-erro">' + msg + '</div>' +
            '<button class="xpdf-fech">Fechar</button>')
        .querySelector('.xpdf-fech').onclick = fechar;
    }

    try {
      if (!window.PDFLib) {
        passo(1, 'Carregando o gerador…');
        await carregarScript(CDNS);
      }
      var PDFLib = window.PDFLib;
      var rgb = PDFLib.rgb;

      // 1 · lê as 7 páginas e planeja a numeração
      passo(3, 'Lendo as categorias…');
      var blocos = [];
      for (var i = 0; i < CATEGORIAS.length; i++) {
        if (cancelado) return;
        blocos.push(await lerCategoria(CATEGORIAS[i]));
        passo(3 + (i + 1) / CATEGORIAS.length * 5, 'Lendo as categorias… ' + (i + 1) + '/7');
      }

      // lançamentos entram logo depois do sumário
      var gruposLanc = [], paginasLanc = 0, fotosLanc = {}, semFotoLanc = 0;
      if (comLanc) {
        passo(8, 'Lendo os lançamentos…');
        var precosCat = {};
        blocos.forEach(function (b) {
          Object.keys(b.precos).forEach(function (r) { if (!precosCat[r]) precosCat[r] = b.precos[r]; });
        });
        try { gruposLanc = await lerLancamentos(precosCat); } catch (e) { gruposLanc = []; }
        var ocultos = await lerLancamentosOcultos();
        if (ocultos.length) {
          gruposLanc = gruposLanc.map(function (g) {
            return { id: g.id, titulo: g.titulo, itens: g.itens.filter(function (p) {
              return ocultos.indexOf(String(p.ref).replace('.', '')) < 0; }) };
          }).filter(function (g) { return g.itens.length; });
        }
        gruposLanc.forEach(function (g) { paginasLanc += paginasDoGrupo(g); });
        var filaFoto = [], feitas = 0;
        gruposLanc.forEach(function (g) {
          g.itens.forEach(function (p) {
            fotosLanc[p.ref] = [];
            (p.fotos || []).forEach(function (u, k) { filaFoto.push({ p: p, k: k, u: u }); });
          });
        });
        var totalFotos = filaFoto.length || 1;
        var trabalhador = async function () {
          while (filaFoto.length) {
            if (cancelado) return;
            var t = filaFoto.shift();
            fotosLanc[t.p.ref][t.k] = await fotoLancamento(t.u, t.k ? 480 : 1000);
            if (!t.k && !fotosLanc[t.p.ref][0]) semFotoLanc++;
            feitas++;
            passo(8 + feitas / totalFotos * 10, 'Fotos dos lançamentos… ' + feitas + '/' + totalFotos);
          }
        };
        await Promise.all([1, 2, 3, 4, 5, 6].map(trabalhador));
        if (cancelado) return;
      }

      var fila = [{ url: new URL(CAPA, location.href).href, selos: [], veus: [] }];
      var plano = [];
      var numero = 3 + paginasLanc; // 1 = capa · 2 = sumário · depois os lançamentos
      if (paginasLanc) {
        var ancLanc = {}, acum = 0;
        gruposLanc.forEach(function (g) { ancLanc[g.id] = acum; acum += paginasDoGrupo(g); });
        plano.push({ cat: { num: '', arquivo: LANCAMENTOS.arquivo, nome: LANCAMENTOS.nome,
                            bar: LANCAMENTOS.bar, bg: LANCAMENTOS.bg, txt: LANCAMENTOS.txt },
                     primeira: 3, total: paginasLanc, ancoras: ancLanc });
      }
      blocos.forEach(function (b) {
        plano.push({ cat: b.cat, primeira: numero, total: b.paginas.length, ancoras: b.ancoras });
        b.paginas.forEach(function (p, k) { fila.push({ url: p.url, selos: b.selos[k], veus: (b.veus || [])[k] || [] }); });
        numero += b.paginas.length;
      });
      var totalPag = fila.length + 1 + paginasLanc;

      // 2 · monta o documento
      var pdf = await PDFLib.PDFDocument.create();
      pdf.setTitle('Catálogo Xalingo 2026 — ' + rot.texto);
      pdf.setAuthor('Xalingo S.A. Indústria e Comércio');
      pdf.setCreationDate(new Date());
      passo(18, 'Carregando as fontes…');
      var F = await embutirFontes(pdf, PDFLib);
      var logo = null;
      try {
        var rl = await fetch(LOGO, { cache: 'force-cache' });
        if (rl.ok) logo = await pdf.embedPng(new Uint8Array(await rl.arrayBuffer()));
      } catch (e) { logo = null; }

      // baixa com janela deslizante de 4 para não ficar serial
      var JANELA = 4;
      var buffers = new Array(fila.length);
      var baixar = function (k) {
        if (k >= fila.length || buffers[k]) return;
        buffers[k] = fetch(fila[k].url, { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.blob();
        });
      };
      for (var j = 0; j < JANELA; j++) baixar(j);

      var falhas = 0;
      for (var k = 0; k < fila.length; k++) {
        if (cancelado) return;
        baixar(k + JANELA);
        passo(19 + (k / fila.length) * 73,
          'Página ' + (k + 1) + ' de ' + fila.length + (falhas ? ' · ' + falhas + ' com problema' : ''));
        try {
          var blob = await buffers[k];
          var bytes = q.larguraMax
            ? await recomprimir(blob, q.larguraMax, q.jpeg)
            : new Uint8Array(await blob.arrayBuffer());
          var img = await pdf.embedJpg(bytes);
          var page = pdf.addPage();
          page.setSize(PW, PH);
          page.drawImage(img, { x: 0, y: 0, width: PW, height: PH });
          fila[k].veus.forEach(function (v) { desenharVeu(page, F.txt, rgb, v); });
          fila[k].selos.forEach(function (s) { desenharSelo(page, F, rgb, s, icms); });
        } catch (e) {
          falhas++;
          pdf.addPage().setSize(PW, PH);
        }
        buffers[k] = null;
        if (k % 8 === 0) await new Promise(function (r) { setTimeout(r, 0); }); // deixa a aba respirar
      }

      // 3 · lançamentos e sumário entram depois da capa, com os destinos já existindo
      if (cancelado) return;
      if (paginasLanc) {
        passo(93, 'Desenhando os lançamentos…');
        await desenharLancamentos(pdf, PDFLib, F, gruposLanc, fotosLanc, 1, icms);
      }
      passo(94, 'Montando o sumário…');
      // seções: as da página aberta (traduzidas); o que faltar vem da própria página da categoria
      var secoes = lerSecoesDaPagina();
      secoes[LANCAMENTOS.arquivo] = gruposLanc.map(function (g) { return { id: g.id, nome: limpar(g.titulo) }; });
      blocos.forEach(function (b) {
        var kk = b.cat.arquivo.toLowerCase();
        if (!(secoes[kk] && secoes[kk].length)) secoes[kk] = b.secoes;
      });
      montarSumario(pdf, PDFLib, F, logo, plano, secoes, icms);

      // 4 · salva
      passo(96, 'Fechando o arquivo… (esta parte demora um pouco)');
      await new Promise(function (r) { setTimeout(r, 60); });
      var saida = await pdf.save({ useObjectStreams: false });

      var url = URL.createObjectURL(new Blob([saida], { type: 'application/pdf' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Catalogo-Xalingo-2026-' + rot.arquivo + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);

      passo(100, 'Pronto — ' + totalPag + ' páginas, ' + (saida.length / 1048576).toFixed(0) + ' MB.' +
        (falhas ? ' ' + falhas + ' página(s) não carregaram e ficaram em branco.' : '') +
        (semFotoLanc ? ' ' + semFotoLanc + ' lançamento(s) sem foto.' : '') +
        (F.padrao ? ' (fontes do catálogo indisponíveis — usada Helvetica)' : ''));
      setTimeout(fechar, 4000);

    } catch (e) {
      if (cancelado) return;
      var msg = (location.protocol === 'file:')
        ? 'Abrindo o arquivo direto do disco o navegador bloqueia a leitura das outras páginas. Rode pelo site publicado (ou por um servidor local) e tente de novo.'
        : 'Falhou em: ' + (e && e.message ? e.message : e) + '.<br><br>Se foi falta de memória, tente a qualidade Leve.';
      erro(msg);
    }
  }

  /* ── Recompressão opcional ────────────────────────────────────────────── */

  async function recomprimir(blob, larguraMax, q) {
    var bmp = await createImageBitmap(blob);
    var esc = Math.min(1, larguraMax / bmp.width);
    var cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * esc);
    cv.height = Math.round(bmp.height * esc);
    var ctx = cv.getContext('2d');
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    bmp.close && bmp.close();
    var saida = await new Promise(function (r) { cv.toBlob(r, 'image/jpeg', q); });
    cv.width = cv.height = 0;
    return new Uint8Array(await saida.arrayBuffer());
  }

  window.XalingoPDF = { abrir: abrir, gerar: gerar };
})();
