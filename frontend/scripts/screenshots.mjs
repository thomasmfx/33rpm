import { chromium } from 'playwright';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3300';
const DESTINO = new URL('../../screenshots/', import.meta.url).pathname;
const CLIENTE = '1'; // Ana Paula Ribeiro, primeiro cliente de POST /api/dev/reset

// telas do cliente precisam de sessão simulada; as da curadoria mostram o admin
const CARRINHO = {
  [CLIENTE]: [
    { discoId: 8883, quantidade: 1 },
    { discoId: 10362, quantidade: 2 },
  ],
};

// prefixo numérico com zero à esquerda: com 12 telas, '1_' viria antes de
// '10_' na ordem alfabética do explorador de arquivos
const TELAS = [
  // a home tem ~270px de respiro entre o hero e o primeiro carrossel: em 1080
  // nenhuma janela pega os dois sem cortar um deles
  { nome: '01_home', rota: '/', altura: 1400 },
  { nome: '02_acervo', rota: '/acervo' },
  { nome: '03_disco', rota: '/disco/10362' }, // The Dark Side Of The Moon
  { nome: '04_carrinho', rota: '/carrinho', sessao: true, carrinho: true },
  { nome: '05_checkout', rota: '/checkout', sessao: true, carrinho: true },
  { nome: '06_meus-pedidos', rota: '/pedidos', sessao: true },
  { nome: '07_cupons', rota: '/cupons', sessao: true },
  {
    nome: '08_assistente',
    rota: '/',
    // conversa de verdade: o chat só com a saudação não mostra a feature
    acao: async (page) => {
      await page.getByRole('button', { name: /abrir assistente/i }).click();
      await page.waitForTimeout(400);
      await page.getByPlaceholder(/me conte/i).fill(
        'algo pra ouvir na chuva',
      );
      await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
    },
  },
  { nome: '09_curadoria-clientes', rota: '/curadoria/clientes' },
  { nome: '10_curadoria-inventario', rota: '/curadoria/inventario' },
  { nome: '11_curadoria-pedidos', rota: '/curadoria/pedidos' },
  { nome: '12_curadoria-dashboard', rota: '/curadoria/dashboard' },
];


async function estabilizar(page) {
  await page.waitForLoadState('load');
  await page
    .waitForFunction(
      () => Array.from(document.images).every((img) => img.complete),
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

await mkdir(DESTINO, { recursive: true });

const navegador = await chromium.launch();
// 16:9 no tamanho de um slide: a imagem preenche o PowerPoint sem tarja e sem
// precisar de redimensionamento
const contexto = await navegador.newContext({
  viewport: { width: 1920, height: 1080 },
  locale: 'pt-BR',
});

const filtro = process.env.TELAS?.split(',').map((n) => n.trim());
const selecionadas = filtro
  ? TELAS.filter((tela) => filtro.includes(tela.nome))
  : TELAS;

for (const tela of selecionadas) {
  const page = await contexto.newPage();
  if (tela.altura) {
    await page.setViewportSize({ width: 1920, height: tela.altura });
  }

  await page.addInitScript(
    ({ cliente, carrinho, comSessao, comCarrinho }) => {
      localStorage.removeItem('33rpm:sessao');
      localStorage.removeItem('33rpm:carrinhos');
      if (comSessao) localStorage.setItem('33rpm:sessao', JSON.stringify(cliente));
      if (comCarrinho) {
        localStorage.setItem('33rpm:carrinhos', JSON.stringify(carrinho));
        localStorage.setItem(
          '33rpm:carrinhoAtualizadoEm',
          JSON.stringify(new Date().toISOString()),
        );
      }
    },
    {
      cliente: CLIENTE,
      carrinho: CARRINHO,
      comSessao: Boolean(tela.sessao),
      comCarrinho: Boolean(tela.carrinho),
    },
  );

  await page.goto(BASE + tela.rota, { waitUntil: 'load' });
  await estabilizar(page);
  if (tela.acao) await tela.acao(page);

  // prévia da tela, não a página inteira: full page gerava imagens de 7000px
  await page.screenshot({ path: join(DESTINO, `${tela.nome}.png`) });
  console.log(`  ${tela.nome}.png  <- ${tela.rota}`);
  await page.close();
}

await navegador.close();

const arquivos = await readdir(DESTINO);
console.log(`\n${arquivos.length} arquivos em screenshots/`);
