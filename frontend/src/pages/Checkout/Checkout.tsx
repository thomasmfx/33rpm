import styles from './Checkout.module.scss';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, NumberInput, Radio, TextInput } from '@mantine/core';
import type { Cartao, Endereco } from '../../types/cliente';
import type { Cupom } from '../../types/cupom';
import type { Pedido } from '../../types/pedido';
import { useLoja } from '../../contexts/loja';
import { alterarCartoes, alterarEnderecos } from '../../services/clientesService';
import {
  calcularFrete,
  calcularSubtotal,
  cuponsDisponiveis,
  dividirIgualmente,
  itensDoCarrinho,
  itensIndisponiveis,
  montarItensPedido,
  montarPagamentoCartao,
  montarPagamentoCupons,
  redistribuir,
  regiaoDoEstado,
  somarCupons,
  trocoDosCupons,
  ultimosDigitos,
  validarCartoes,
  validarCupons,
  valorRestante,
} from '../../utils/checkout';
import { adicionarCartao, atendeTipo, linhaDoEndereco } from '../../utils/perfilCliente';
import { formatarBRL } from '../../utils/precificacao';
import { normalizar } from '../../utils/texto';
import FormEndereco, {
  type FormEnderecoValues,
} from '../../components/FormCliente/FormEndereco';
import FormCartao, {
  type FormCartaoValues,
} from '../../components/FormCliente/FormCartao';
import AvisoReserva from '../../components/AvisoReserva/AvisoReserva';
import Capa from '../../components/Capa/Capa';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import { Add, Checkmark, Ticket } from '@carbon/icons-react';

type Etapa = 0 | 1 | 2;

const TEMPO_PROCESSAMENTO_MS = 1800;

interface EtapaProps {
  numero: Etapa;
  atual: Etapa;
  titulo: string;
  resumo?: string;
  onAlterar: () => void;
  children: ReactNode;
}

/** Etapa do acordeão: concluída mostra o resumo e volta a abrir por "Alterar". */
function EtapaCheckout({ numero, atual, titulo, resumo, onAlterar, children }: Readonly<EtapaProps>) {
  const estado = numero < atual ? 'feita' : numero === atual ? 'atual' : 'futura';

  return (
    <section className={styles.etapa} data-estado={estado} data-testid={`etapa-${numero + 1}`}>
      <div className={styles.etapaTopo}>
        <span className={styles.etapaNumero}>
          {String(numero + 1).padStart(2, '0')}
          {estado === 'feita' && <Checkmark size={12} />}
        </span>
        <h2>{titulo}</h2>
        {estado === 'feita' && (
          <>
            <span className={styles.etapaResumo}>{resumo}</span>
            <button type="button" className={styles.alterar} onClick={onAlterar}>
              Alterar
            </button>
          </>
        )}
      </div>
      {estado === 'atual' && <div className={styles.etapaCorpo}>{children}</div>}
    </section>
  );
}

function Checkout() {
  const {
    clienteAtivo,
    carregandoClientes,
    carrinho,
    discos,
    cupons,
    itensNoCarrinho,
    recarregarClientes,
    registrarPedido,
    sincronizarCarrinho,
  } = useLoja();
  const navegar = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>(0);

  const [enderecoAdHoc, setEnderecoAdHoc] = useState<Endereco | null>(null);
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState<string | null>(null);
  const [isSalvarEndereco, setIsSalvarEndereco] = useState(false);
  const [isFormEnderecoVisible, setIsFormEnderecoVisible] = useState(false);

  const [cuponsSelecionadosIds, setCuponsSelecionadosIds] = useState<string[]>([]);
  const [codigoCupom, setCodigoCupom] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

  const [cartoesAdHoc, setCartoesAdHoc] = useState<Cartao[]>([]);
  const [cartoesAdHocParaSalvarIds, setCartoesAdHocParaSalvarIds] = useState<string[]>([]);
  const [isSalvarCartao, setIsSalvarCartao] = useState(false);
  const [isFormCartaoVisible, setIsFormCartaoVisible] = useState(false);
  const [cartoesSelecionadosIds, setCartoesSelecionadosIds] = useState<string[]>([]);
  const [valoresPorCartao, setValoresPorCartao] = useState<Record<string, number>>({});
  const [isProcessando, setIsProcessando] = useState(false);

  const itens = itensDoCarrinho(carrinho, discos);
  const indisponiveis = itensIndisponiveis(itens);

  if (carregandoClientes) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina comAside blocos={[72, 72, 72]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/checkout' }} replace />;
  }

  if (itens.length === 0 && !isProcessando) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          titulo="Seu carrinho está vazio"
          descricao="Adicione discos ao carrinho antes de finalizar a compra."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  if (indisponiveis.length > 0) {
    return (
      <main className={styles.main}>
        <div className={styles.ajuste}>
          <h1>Ajuste seu carrinho</h1>
          <Alert color="red" title="Estoque insuficiente">
            <p>O estoque destes discos caiu abaixo da quantidade que está no seu carrinho:</p>
            <ul className={styles.lista}>
              {indisponiveis.map(({ disco, quantidade }) => (
                <li key={disco.id}>
                  {disco.title}: no carrinho {quantidade}, disponível {disco.estoque}
                </li>
              ))}
            </ul>
          </Alert>
          <div className={styles.acoes}>
            <Button onClick={sincronizarCarrinho}>Ajustar carrinho automaticamente</Button>
            <Button variant="default" component={Link} to="/carrinho">
              Voltar ao carrinho
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const cliente = clienteAtivo;

  const enderecosParaEntrega = cliente.enderecos.filter((endereco) =>
    atendeTipo(endereco, 'entrega'),
  );
  const opcoesEndereco = enderecoAdHoc
    ? [...enderecosParaEntrega, enderecoAdHoc]
    : enderecosParaEntrega;
  const enderecoEscolhido =
    opcoesEndereco.find((endereco) => endereco.id === enderecoSelecionadoId) ?? null;

  const subtotal = calcularSubtotal(itens);
  const frete = calcularFrete(itens, enderecoEscolhido);
  const total = subtotal + frete;
  const pesoTotal = itens.reduce(
    (soma, item) => soma + item.disco.dimensoes.peso * item.quantidade,
    0,
  );

  const cuponsList = cuponsDisponiveis(cupons, cliente.id);
  const cuponsSelecionados = cuponsList.filter((cupom) =>
    cuponsSelecionadosIds.includes(cupom.id),
  );
  const mensagemCupons = validarCupons(cuponsSelecionados, total);
  const restante = valorRestante(cuponsSelecionados, total);
  const troco = trocoDosCupons(cuponsSelecionados, total);
  const descontoCupons = Math.min(somarCupons(cuponsSelecionados), total);

  const cartoesDisponiveis = [...cliente.cartoes, ...cartoesAdHoc];
  const cartoesSelecionados = cartoesDisponiveis.filter((cartao) =>
    cartoesSelecionadosIds.includes(cartao.id),
  );
  const pagamentoCartoes = cartoesSelecionados.map((cartao) =>
    montarPagamentoCartao(cartao, valoresPorCartao[cartao.id] ?? 0),
  );
  const mensagemCartoes = validarCartoes(
    pagamentoCartoes,
    restante,
    cuponsSelecionados.length > 0,
  );

  const pendencia = mensagemCupons ?? mensagemCartoes;

  function resumoEndereco(): string {
    return enderecoEscolhido ? `${enderecoEscolhido.nome} · ${enderecoEscolhido.cidade}` : '';
  }

  function tagDoEndereco(endereco: Endereco): string {
    if (endereco.id === enderecoAdHoc?.id) return isSalvarEndereco ? 'Salvar no perfil' : 'Só este pedido';
    return endereco.id === enderecosParaEntrega[0]?.id ? 'Padrão' : 'Salvo';
  }

  function handleSubmitEnderecoNovo(valores: FormEnderecoValues): void {
    const novoEndereco: Endereco = { id: crypto.randomUUID().slice(0, 8), ...valores };
    setEnderecoAdHoc(novoEndereco);
    setEnderecoSelecionadoId(novoEndereco.id);
    setIsFormEnderecoVisible(false);
  }

  function handleSubmitCartaoNovo(valores: FormCartaoValues): void {
    const novoCartao: Cartao = { id: crypto.randomUUID().slice(0, 8), ...valores };
    setCartoesAdHoc((atuais) => [...atuais, novoCartao]);
    if (isSalvarCartao) {
      setCartoesAdHocParaSalvarIds((atuais) => [...atuais, novoCartao.id]);
    }
    setIsSalvarCartao(false);
    setIsFormCartaoVisible(false);
    selecionarCartoes([...cartoesSelecionadosIds, novoCartao.id], restante);
  }

  // o valor já vem dividido: o cliente só mexe se quiser outra proporção
  function selecionarCartoes(ids: string[], valorAPagar: number): void {
    setCartoesSelecionadosIds(ids);
    setValoresPorCartao(dividirIgualmente(valorAPagar, ids));
  }

  function handleToggleCartao(cartaoId: string): void {
    const ids = cartoesSelecionadosIds.includes(cartaoId)
      ? cartoesSelecionadosIds.filter((id) => id !== cartaoId)
      : [...cartoesSelecionadosIds, cartaoId];
    selecionarCartoes(ids, restante);
  }

  function handleAlterarValorCartao(cartaoId: string, valor: number): void {
    setValoresPorCartao((atuais) =>
      redistribuir(atuais, restante, cartoesSelecionadosIds, cartaoId, valor),
    );
  }

  function alternarCupons(ids: string[]): void {
    setCuponsSelecionadosIds(ids);
    const novosSelecionados = cuponsList.filter((cupom) => ids.includes(cupom.id));
    // cupom muda o restante, então a divisão dos cartões precisa acompanhar
    selecionarCartoes(cartoesSelecionadosIds, valorRestante(novosSelecionados, total));
  }

  function handleToggleCupom(cupomId: string): void {
    alternarCupons(
      cuponsSelecionadosIds.includes(cupomId)
        ? cuponsSelecionadosIds.filter((id) => id !== cupomId)
        : [...cuponsSelecionadosIds, cupomId],
    );
  }

  function handleAplicarCodigo(): void {
    const codigo = codigoCupom.trim();
    if (!codigo) return;
    const cupom = cuponsList.find((candidato) => normalizar(candidato.codigo) === normalizar(codigo));
    if (!cupom) {
      setErroCodigo(`O cupom ${codigo.toUpperCase()} não existe ou já foi usado.`);
      return;
    }
    setErroCodigo(null);
    setCodigoCupom('');
    if (!cuponsSelecionadosIds.includes(cupom.id)) {
      alternarCupons([...cuponsSelecionadosIds, cupom.id]);
    }
  }

  async function handleFinalizarCompra(): Promise<void> {
    if (!enderecoEscolhido || pendencia || isProcessando) return;

    const idCupomTroca = troco > 0 ? crypto.randomUUID().slice(0, 8) : null;
    const cupomTroca: Cupom | null = idCupomTroca
      ? {
          id: idCupomTroca,
          codigo: `TROCA-${idCupomTroca.toUpperCase()}`,
          tipo: 'troca',
          valor: troco,
          clienteId: cliente.id,
          isUtilizado: false,
        }
      : null;

    const pedido: Pedido = {
      // id definitivo viria do backend (RNF0021)
      id: `ped-${crypto.randomUUID().slice(0, 8)}`,
      clienteId: cliente.id,
      data: new Date().toISOString(),
      itens: montarItensPedido(itens),
      enderecoEntrega: enderecoEscolhido,
      subtotal,
      frete,
      total,
      cupons: montarPagamentoCupons(cuponsSelecionados),
      cartoes: pagamentoCartoes,
      status: 'EM PROCESSAMENTO',
      cupomTrocaGeradoId: idCupomTroca,
      troca: null,
      validacaoPagamento: null,
    };

    setIsProcessando(true);
    // sem operadora de verdade, a pausa é o que mostra que o pagamento está sendo tratado
    await new Promise((resolver) => setTimeout(resolver, TEMPO_PROCESSAMENTO_MS));

    let perfilNaoSalvo = false;
    try {
      // RF0035 e RF0036: endereço e cartão do checkout viram perfil no servidor
      if (isSalvarEndereco && enderecoAdHoc) {
        await alterarEnderecos(cliente.id, [...cliente.enderecos, enderecoAdHoc]);
      }

      const cartoesParaSalvar = cartoesAdHoc.filter((cartao) =>
        cartoesAdHocParaSalvarIds.includes(cartao.id),
      );
      if (cartoesParaSalvar.length > 0) {
        const cartoes = cartoesParaSalvar.reduce(
          (cartoesAtuais, cartao) => adicionarCartao(cartoesAtuais, cartao),
          cliente.cartoes,
        );
        await alterarCartoes(cliente.id, cartoes);
        await recarregarClientes();
      } else if (isSalvarEndereco && enderecoAdHoc) {
        await recarregarClientes();
      }
    } catch {
      perfilNaoSalvo = true;
    }

    // registrar esvazia o carrinho: no mesmo tique da navegação, o React troca de
    // tela direto e o checkout vazio nunca chega a aparecer
    registrarPedido(pedido, cupomTroca);
    navegar(`/pedidos/${pedido.id}/confirmacao`, { state: { perfilNaoSalvo } });
  }

  const rotuloPagar = isProcessando
    ? 'Processando pagamento…'
    : restante > 0
      ? `Pagar ${formatarBRL(restante)}`
      : 'Confirmar pedido';

  return (
    <main className={styles.main}>
      {isProcessando && (
        <div
          className={styles.barraProgresso}
          style={{ animationDuration: `${TEMPO_PROCESSAMENTO_MS}ms` }}
          role="progressbar"
          aria-label="Processando pagamento"
        />
      )}
      <div className={styles.layout}>
        <div className={styles.coluna}>
          <h1>Finalizar compra</h1>

          <div className={styles.etapas}>
            <EtapaCheckout
              numero={0}
              atual={etapa}
              titulo="Endereço"
              resumo={resumoEndereco()}
              onAlterar={() => setEtapa(0)}
            >
              {opcoesEndereco.length > 0 && (
                <Radio.Group
                  value={enderecoSelecionadoId}
                  onChange={setEnderecoSelecionadoId}
                  aria-label="Endereço de entrega"
                >
                  <div className={styles.opcoes}>
                    {opcoesEndereco.map((endereco) => (
                      <Radio.Card key={endereco.id} value={endereco.id} data-testid="opcao-endereco">
                        <Radio.Indicator />
                        <span className={styles.opcaoTexto}>
                          <strong>{endereco.nome}</strong>
                          <span>{linhaDoEndereco(endereco)}</span>
                        </span>
                        <span className={styles.opcaoTag}>{tagDoEndereco(endereco)}</span>
                      </Radio.Card>
                    ))}
                  </div>
                </Radio.Group>
              )}

              {opcoesEndereco.length === 0 && !isFormEnderecoVisible && (
                <p className={styles.ajuda}>Você ainda não tem endereço de entrega cadastrado.</p>
              )}

              {isFormEnderecoVisible ? (
                <div className={styles.formInline}>
                  <FormEndereco
                    titulo="Entregar em outro endereço"
                    rotuloSalvar="Usar este endereço"
                    extra={
                      <Checkbox
                        label="Salvar no meu perfil"
                        checked={isSalvarEndereco}
                        onChange={(evento) => setIsSalvarEndereco(evento.currentTarget.checked)}
                      />
                    }
                    onCancelar={() => setIsFormEnderecoVisible(false)}
                    onSubmit={handleSubmitEnderecoNovo}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.adicionar}
                  onClick={() => setIsFormEnderecoVisible(true)}
                >
                  <Add size={20} /> Entregar em outro endereço
                </button>
              )}

              <div className={styles.avancar}>
                <Button disabled={!enderecoEscolhido} onClick={() => setEtapa(1)}>
                  Continuar para entrega
                </Button>
                {!enderecoEscolhido && <span className={styles.motivo}>Escolha um endereço</span>}
              </div>
            </EtapaCheckout>

            <EtapaCheckout
              numero={1}
              atual={etapa}
              titulo="Entrega"
              resumo={`Correios · ${formatarBRL(frete)}`}
              onAlterar={() => setEtapa(1)}
            >
              {enderecoEscolhido && (
                <>
                  <p className={styles.ajuda}>
                    Frete para a região {regiaoDoEstado(enderecoEscolhido.estado)} ·{' '}
                    {itensNoCarrinho} {itensNoCarrinho === 1 ? 'disco' : 'discos'},{' '}
                    {(pesoTotal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg em
                    embalagem rígida
                  </p>
                  <Radio.Group value="correios" aria-label="Modalidade de entrega">
                    <Radio.Card value="correios">
                      <Radio.Indicator />
                      <span className={styles.opcaoTexto}>
                        <strong>Correios</strong>
                        <span>Frete calculado pela região do CEP e pelo peso dos discos</span>
                      </span>
                      <span className={styles.opcaoPreco}>{formatarBRL(frete)}</span>
                    </Radio.Card>
                  </Radio.Group>
                </>
              )}
              <div className={styles.avancar}>
                <Button onClick={() => setEtapa(2)}>Continuar para pagamento</Button>
              </div>
            </EtapaCheckout>

            <EtapaCheckout
              numero={2}
              atual={etapa}
              titulo="Pagamento"
              onAlterar={() => setEtapa(2)}
            >
              <div className={styles.bloco}>
                <h3>Cupons</h3>
                {cuponsList.length > 0 && (
                  <div className={styles.cupons}>
                    {cuponsList.map((cupom) => (
                      <button
                        key={cupom.id}
                        type="button"
                        className={styles.cupom}
                        aria-pressed={cuponsSelecionadosIds.includes(cupom.id)}
                        onClick={() => handleToggleCupom(cupom.id)}
                      >
                        {cuponsSelecionadosIds.includes(cupom.id) ? (
                          <Checkmark size={16} />
                        ) : (
                          <Ticket size={16} />
                        )}
                        <span className={styles.cupomCodigo}>{cupom.codigo}</span>
                        {formatarBRL(cupom.valor)}
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.codigo}>
                  <TextInput
                    size="sm"
                    placeholder="Tem outro código?"
                    aria-label="Código do cupom"
                    value={codigoCupom}
                    error={erroCodigo}
                    styles={{ input: { textTransform: 'uppercase' } }}
                    onChange={(evento) => {
                      setCodigoCupom(evento.currentTarget.value);
                      setErroCodigo(null);
                    }}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault();
                        handleAplicarCodigo();
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={handleAplicarCodigo}>
                    Aplicar
                  </Button>
                </div>
                {troco > 0 && (
                  <p className={styles.ajuda}>
                    A diferença de {formatarBRL(troco)} volta como um novo cupom de troca.
                  </p>
                )}
                {mensagemCupons && <Alert color="orange">{mensagemCupons}</Alert>}
              </div>

              <div className={styles.bloco}>
                <div className={styles.blocoTopo}>
                  <h3>Cartão de crédito</h3>
                  {restante > 0 && (
                    <span className={styles.ajuda}>Marque mais de um para dividir o valor</span>
                  )}
                </div>

                {restante === 0 ? (
                  <Alert color="green">
                    Os cupons cobrem o valor total. Nenhum cartão é necessário.
                  </Alert>
                ) : (
                  <>
                    {cartoesDisponiveis.length === 0 && !isFormCartaoVisible && (
                      <p className={styles.ajuda}>
                        Você ainda não tem cartões cadastrados. Adicione um para pagar{' '}
                        {formatarBRL(restante)}.
                      </p>
                    )}

                    <div className={styles.opcoes}>
                      {cartoesDisponiveis.map((cartao, indice) => {
                        const selecionado = cartoesSelecionadosIds.includes(cartao.id);
                        const ultimoDeDois =
                          cartoesSelecionadosIds.length === 2 &&
                          cartoesSelecionadosIds[1] === cartao.id;
                        return (
                          <div key={cartao.id} className={styles.cartao} data-selecionado={selecionado || undefined}>
                            <Checkbox
                              checked={selecionado}
                              onChange={() => handleToggleCartao(cartao.id)}
                              aria-label={`Pagar com ${cartao.bandeira} final ${ultimosDigitos(cartao.numero)}`}
                            />
                            <span className={styles.bandeira}>{cartao.bandeira.slice(0, 4)}</span>
                            <span className={styles.opcaoTexto}>
                              <strong>
                                {cartao.bandeira} •••• {ultimosDigitos(cartao.numero)}
                              </strong>
                              <span>
                                {cartao.nomeImpresso}
                                {cartao.isPreferencial && ' · preferencial'}
                                {indice >= cliente.cartoes.length && ' · só este pedido'}
                              </span>
                            </span>
                            {selecionado &&
                              (ultimoDeDois ? (
                                <span className={styles.opcaoPreco}>
                                  {formatarBRL(valoresPorCartao[cartao.id] ?? 0)}
                                </span>
                              ) : (
                                <NumberInput
                                  size="sm"
                                  w={140}
                                  prefix="R$ "
                                  decimalScale={2}
                                  fixedDecimalScale
                                  decimalSeparator=","
                                  thousandSeparator="."
                                  min={0}
                                  hideControls
                                  aria-label="Valor neste cartão"
                                  value={valoresPorCartao[cartao.id] ?? 0}
                                  onChange={(valor) =>
                                    handleAlterarValorCartao(cartao.id, Number(valor) || 0)
                                  }
                                />
                              ))}
                          </div>
                        );
                      })}
                    </div>

                    {cartoesSelecionadosIds.length === 2 && !mensagemCartoes && (
                      <p className={styles.ajuda}>O segundo cartão cobre o restante automaticamente.</p>
                    )}

                    {isFormCartaoVisible ? (
                      <div className={styles.formInline}>
                        <FormCartao
                          titulo="Novo cartão"
                          rotuloSalvar="Usar este cartão"
                          comPreferencial={false}
                          extra={
                            <Checkbox
                              label="Salvar no meu perfil"
                              checked={isSalvarCartao}
                              onChange={(evento) => setIsSalvarCartao(evento.currentTarget.checked)}
                            />
                          }
                          onCancelar={() => setIsFormCartaoVisible(false)}
                          onSubmit={handleSubmitCartaoNovo}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.adicionar}
                        onClick={() => setIsFormCartaoVisible(true)}
                      >
                        <Add size={20} /> Adicionar cartão
                      </button>
                    )}

                    {mensagemCartoes && cartoesSelecionadosIds.length > 0 && (
                      <Alert color="orange">{mensagemCartoes}</Alert>
                    )}
                  </>
                )}
              </div>

              <div className={styles.avancar}>
                <Button
                  size="xl"
                  disabled={Boolean(pendencia) || isProcessando}
                  data-testid="btn-pagar"
                  onClick={handleFinalizarCompra}
                >
                  {rotuloPagar}
                </Button>
                {pendencia && <span className={styles.motivo}>{pendencia}</span>}
                {isProcessando && (
                  <span className={styles.motivo}>Conferindo os dados com a operadora…</span>
                )}
              </div>
            </EtapaCheckout>
          </div>
        </div>

        <aside className={styles.resumo}>
          <div className={styles.resumoTopo}>
            <h2>Seu pedido</h2>
            <span className={styles.meta}>
              {itensNoCarrinho} {itensNoCarrinho === 1 ? 'disco' : 'discos'}
            </span>
          </div>

          <ul className={styles.itens}>
            {itens.map(({ disco, quantidade }) => (
              <li key={disco.id} className={styles.item}>
                <Capa src={disco.coverThumb ?? disco.coverSrc} alt={disco.title} />
                <span className={styles.itemTexto}>
                  <strong>{disco.title}</strong>
                  <span>
                    {disco.artist} · {quantidade}×
                  </span>
                </span>
                <span>{formatarBRL(disco.price * quantidade)}</span>
              </li>
            ))}
          </ul>

          <div className={styles.valores}>
            <div className={styles.linha}>
              <span>Subtotal</span>
              <span>{formatarBRL(subtotal)}</span>
            </div>
            <div className={styles.linha}>
              <span>Frete</span>
              {enderecoEscolhido ? (
                <span>{formatarBRL(frete)}</span>
              ) : (
                <span className={styles.apagado}>na etapa 01</span>
              )}
            </div>
            {descontoCupons > 0 && (
              <div className={styles.linha} data-desconto>
                <span>Cupons</span>
                <span>− {formatarBRL(descontoCupons)}</span>
              </div>
            )}
          </div>

          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatarBRL(restante)}</strong>
          </div>

          <AvisoReserva texto="Seus discos ficam reservados até o fim do contador." />
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
