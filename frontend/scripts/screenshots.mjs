import { chromium } from 'playwright';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:3300';
// bin/ fica fora do git: as capturas são material da apresentação, não do código
const DESTINO = fileURLToPath(new URL('../../bin/screenshots/', import.meta.url));
const CLIENTE = '1'; // Ana Paula Ribeiro, primeiro cliente de POST /api/dev/reset
const ADMINISTRADOR = '1'; // ADM-000001, de db/administradores.sql

// ids do banco: a carga do acervo segue a ordem do mock, Thriller é o 3º e
// The Dark Side Of The Moon o 5º
const THRILLER = 3;
const DARK_SIDE = 5;

// telas do cliente precisam de sessão simulada; as da curadoria, da sessão do
// admin, senão a guarda de rota mostra o 403
const CARRINHO = [
  { discoId: THRILLER, quantidade: 1 },
  { discoId: DARK_SIDE, quantidade: 2 },
];

const API = process.env.API_URL ?? 'http://localhost:8080/api';

/** RN0044: o carrinho mora no servidor; cada tela começa com ele vazio ou com o CARRINHO. */
async function prepararCarrinho(comCarrinho) {
  await fetch(`${API}/carrinhos/${CLIENTE}`, { method: 'DELETE' });
  if (!comCarrinho) return;
  for (const item of CARRINHO) {
    await fetch(`${API}/carrinhos/${CLIENTE}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }
}

// prefixo numérico com zero à esquerda: com 12 telas, '1_' viria antes de
// '10_' na ordem alfabética do explorador de arquivos
const TELAS = [
  // a home tem ~270px de respiro entre o hero e o primeiro carrossel: em 1080
  // nenhuma janela pega os dois sem cortar um deles
  { nome: '01_home', rota: '/', altura: 1400 },
  { nome: '02_acervo', rota: '/acervo' },
  { nome: '03_disco', rota: `/disco/${DARK_SIDE}` },
  { nome: '04_carrinho', rota: '/carrinho', sessao: true, carrinho: true },
  {
    nome: '05_checkout',
    rota: '/checkout',
    sessao: true,
    carrinho: true,
    // a etapa de pagamento é a que mostra frete, cupom e cartão juntos
    acao: async (page) => {
      await page.locator('[data-testid="opcao-endereco"]', { hasText: 'Casa' }).click();
      await page.getByTestId('btn-continuar-entrega').click();
      await page.getByTestId('frete-valor').waitFor();
      await page.getByTestId('btn-continuar-pagamento').click();
      await page.locator('[data-testid="cupom-opcao"][data-codigo="PROMO-AP-50"]').click();
      await page
        .locator('[data-testid="cartao-opcao"][data-final="1002"] [data-testid="cartao-checkbox"]')
        .check({ force: true });
      await page.waitForTimeout(1200);
    },
  },
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
      // a resposta vem do Dify e leva alguns segundos
      await page
        .getByText('Procurando no acervo…')
        .waitFor({ state: 'hidden', timeout: 60000 });
      await estabilizar(page);
    },
  },
  { nome: '09_curadoria-clientes', rota: '/curadoria/clientes', admin: true },
  { nome: '10_curadoria-inventario', rota: '/curadoria/inventario', admin: true },
  { nome: '11_curadoria-pedidos', rota: '/curadoria/pedidos', admin: true },
  { nome: '12_curadoria-dashboard', rota: '/curadoria/dashboard', admin: true },
];


async function estabilizar(page) {
  await page.waitForLoadState('load');
  // os discos chegam da API depois do load; antes disso as capas nem estão no DOM
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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

  await prepararCarrinho(Boolean(tela.carrinho));
  await page.addInitScript(
    ({ sessao }) => {
      localStorage.removeItem('33rpm:sessao');
      if (sessao) localStorage.setItem('33rpm:sessao', JSON.stringify(sessao));
    },
    {
      sessao: tela.admin
        ? { papel: 'administrador', id: ADMINISTRADOR }
        : tela.sessao && { papel: 'cliente', id: CLIENTE },
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
console.log(`\n${arquivos.length} arquivos em bin/screenshots/`);
