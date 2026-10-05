import styles from './Checkout.module.scss';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, NumberInput, Radio, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Cartao, Cliente, Endereco } from '../../types/cliente';
import type { Cotacao } from '../../types/pedido';
import { useLoja } from '../../contexts/loja';
import { ErroApi } from '../../services/api';
import { corpoDoPedido, cotarPedido, criarPedido } from '../../services/pedidosService';
import type { CorpoPedido, EscolhaPedido } from '../../services/pedidosService';
import {
  cuponsDisponiveis,
  dividirIgualmente,
  itensDoCarrinho,
  redistribuir,
  ultimosDigitos,
} from '../../utils/checkout';
import { atendeTipo, linhaDoEndereco } from '../../utils/perfilCliente';
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

// a cotação vai ao servidor a cada mudança; a espera junta as teclas de um valor digitado
const ESPERA_COTACAO_MS = 300;

interface EtapaProps {
  numero: Etapa;
  atual: Etapa;
  titulo: string;
  resumo?: string;
  onAlterar: () => void;
  children: ReactNode;
}

/** Cartões marcados, quanto vai em cada um e o restante que a divisão levou em conta. */
interface Divisao {
  ids: string[];
  /** Como o campo devolve: texto enquanto o cliente apaga e redigita o valor. */
  valores: Record<string, number | string>;
  restante: number | null;
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
  const { clienteAtivo, carregandoClientes, carregandoDiscos, carrinho } = useLoja();

  if (carregandoClientes || carregandoDiscos) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina comAside blocos={[72, 72, 72]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/checkout' }} replace />;
  }

  if (carrinho.length === 0) {
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

  return <PaginaCheckout cliente={clienteAtivo} />;
}

/**
 * Nenhuma regra da compra é calculada aqui: frete, cupons, restante, troco e o
 * que impede o pagamento vêm da cotação do servidor (RF0034, RN0033 a RN0036).
 */
function PaginaCheckout({ cliente }: Readonly<{ cliente: Cliente }>) {
  const {
    carrinho,
    discos,
    meusCupons,
    itensNoCarrinho,
    limparCarrinho,
    recarregarClientes,
    recarregarCupons,
    recarregarPedidos,
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
  const [divisao, setDivisao] = useState<Divisao>({ ids: [], valores: {}, restante: null });

  const [cotacao, setCotacao] = useState<{ chave: string; valores: Cotacao } | null>(null);
  const [erroCotacao, setErroCotacao] = useState<string[]>([]);
  const [isEnviando, setIsEnviando] = useState(false);
  const [errosPedido, setErrosPedido] = useState<string[]>([]);

  const itens = itensDoCarrinho(carrinho, discos);

  const enderecosParaEntrega = cliente.enderecos.filter((endereco) =>
    atendeTipo(endereco, 'entrega'),
  );
  const opcoesEndereco = enderecoAdHoc
    ? [...enderecosParaEntrega, enderecoAdHoc]
    : enderecosParaEntrega;
  const enderecoEscolhido =
    opcoesEndereco.find((endereco) => endereco.id === enderecoSelecionadoId) ?? null;

  const cuponsList = cuponsDisponiveis(meusCupons, cliente.id);
  const cartoesDisponiveis = [...cliente.cartoes, ...cartoesAdHoc];

  // a última cotação que chegou, mesmo que a escolha já tenha mudado desde então
  const valores = cotacao?.valores ?? null;
  const restante = valores?.restante ?? null;

  let endereco: EscolhaPedido['endereco'] = null;
  if (enderecoEscolhido && enderecoEscolhido === enderecoAdHoc) {
    endereco = { novo: enderecoAdHoc, salvarNoPerfil: isSalvarEndereco };
  } else if (enderecoEscolhido) {
    endereco = { id: enderecoEscolhido.id };
  }

  const corpo = corpoDoPedido({
    clienteId: cliente.id,
    itens: carrinho,
    endereco,
    // cupons cobrindo tudo dispensam cartão, mesmo o que ficou marcado de antes
    pagamentos:
      restante === 0
        ? []
        : divisao.ids.flatMap((id) => {
            const cartao = cartoesDisponiveis.find((candidato) => candidato.id === id);
            if (!cartao) return [];
            const novo = cartoesAdHoc.includes(cartao);
            return [
              {
                cartao,
                novo,
                salvarNoPerfil: novo && cartoesAdHocParaSalvarIds.includes(id),
                valor: Number(divisao.valores[id]) || 0,
              },
            ];
          }),
    cupomIds: cuponsSelecionadosIds,
  });
  // o próprio corpo serializado: string estável, que o debounce consegue comparar
  const chave = JSON.stringify(corpo);
  const [chaveAdiada] = useDebouncedValue(chave, ESPERA_COTACAO_MS);
  const emDia = cotacao?.chave === chave;

  useEffect(() => {
    let cancelado = false;
    cotarPedido(JSON.parse(chaveAdiada) as CorpoPedido)
      .then((resposta) => {
        if (cancelado) return;
        setCotacao({ chave: chaveAdiada, valores: resposta });
        setErroCotacao([]);
        // cupom e frete mudam o restante: a divisão entre os cartões acompanha
        setDivisao((atual) =>
          atual.restante === resposta.restante
            ? atual
            : {
                ...atual,
                valores: dividirIgualmente(resposta.restante, atual.ids),
                restante: resposta.restante,
              },
        );
      })
      .catch((erro: unknown) => {
        if (cancelado) return;
        setErroCotacao(
          erro instanceof ErroApi ? erro.mensagens : ['Falha ao calcular os valores do pedido.'],
        );
      });
    return () => {
      cancelado = true;
    };
  }, [chaveAdiada]);

  // o valor só ganha data-testid quando a cotação é da escolha atual: quem lê o
  // data-valor nunca pega o número de uma escolha anterior
  const medida = (testId: string, valor: number | undefined) =>
    emDia && valor !== undefined ? { 'data-testid': testId, 'data-valor': String(valor) } : {};

  const pendencias = valores?.pendencias ?? [];
  const podePagar = emDia && valores !== null && pendencias.length === 0 && !isEnviando;

  function resumoEndereco(): string {
    return enderecoEscolhido ? `${enderecoEscolhido.nome} · ${enderecoEscolhido.cidade}` : '';
  }

  function tagDoEndereco(opcao: Endereco): string {
    if (opcao.id === enderecoAdHoc?.id) {
      return isSalvarEndereco ? 'Salvar no perfil' : 'Só este pedido';
    }
    return opcao.id === enderecosParaEntrega[0]?.id ? 'Padrão' : 'Salvo';
  }

  function handleSubmitEnderecoNovo(valoresEndereco: FormEnderecoValues): void {
    // "Entregar em outro endereço" não pergunta o uso: é sempre de entrega
    const novoEndereco: Endereco = {
      id: crypto.randomUUID().slice(0, 8),
      ...valoresEndereco,
      tipo: 'entrega',
    };
    setEnderecoAdHoc(novoEndereco);
    setEnderecoSelecionadoId(novoEndereco.id);
    setIsFormEnderecoVisible(false);
  }

  // o valor já vem dividido: o cliente só mexe se quiser outra proporção
  function marcarCartoes(ids: string[]): void {
    setDivisao({ ids, valores: dividirIgualmente(restante ?? 0, ids), restante });
  }

  function handleSubmitCartaoNovo(valoresCartao: FormCartaoValues): void {
    const novoCartao: Cartao = { id: crypto.randomUUID().slice(0, 8), ...valoresCartao };
    setCartoesAdHoc((atuais) => [...atuais, novoCartao]);
    if (isSalvarCartao) {
      setCartoesAdHocParaSalvarIds((atuais) => [...atuais, novoCartao.id]);
    }
    setIsSalvarCartao(false);
    setIsFormCartaoVisible(false);
    marcarCartoes([...divisao.ids, novoCartao.id]);
  }

  function handleToggleCartao(cartaoId: string): void {
    marcarCartoes(
      divisao.ids.includes(cartaoId)
        ? divisao.ids.filter((id) => id !== cartaoId)
        : [...divisao.ids, cartaoId],
    );
  }

  // o texto vazio volta para o campo: virar 0 na hora grudaria o zero no que vem depois
  function handleAlterarValorCartao(cartaoId: string, valor: number | string): void {
    setDivisao((atual) => ({
      ...atual,
      valores: redistribuir(atual.valores, atual.restante ?? 0, atual.ids, cartaoId, valor),
    }));
  }

  function handleToggleCupom(cupomId: string): void {
    setCuponsSelecionadosIds((atuais) =>
      atuais.includes(cupomId) ? atuais.filter((id) => id !== cupomId) : [...atuais, cupomId],
    );
  }

  function handleAplicarCodigo(): void {
    const codigo = codigoCupom.trim();
    if (!codigo) return;
    const cupom = cuponsList.find(
      (candidato) => normalizar(candidato.codigo) === normalizar(codigo),
    );
    if (!cupom) {
      setErroCodigo(`O cupom ${codigo.toUpperCase()} não existe ou já foi usado.`);
      return;
    }
    setErroCodigo(null);
    setCodigoCupom('');
    if (!cuponsSelecionadosIds.includes(cupom.id)) handleToggleCupom(cupom.id);
  }

  async function handleFinalizarCompra(): Promise<void> {
    if (!podePagar) return;

    setIsEnviando(true);
    setErrosPedido([]);
    try {
      const pedido = await criarPedido(corpo);
      // sai do checkout antes de esvaziar o carrinho, senão o "carrinho vazio" pisca no caminho
      await navegar(`/pedidos/${pedido.id}/confirmacao`, { flushSync: true });
      limparCarrinho();
      // RF0035 e RF0036: endereço e cartão incorporados e cupons gastos vêm do servidor
      void Promise.all([recarregarClientes(), recarregarCupons(), recarregarPedidos()]);
    } catch (erro) {
      setErrosPedido(erro instanceof ErroApi ? erro.mensagens : ['Falha ao registrar o pedido.']);
      setIsEnviando(false);
    }
  }

  function rotuloPagar(): string {
    if (isEnviando) return 'Registrando o pedido…';
    if (restante === null) return 'Pagar';
    return restante > 0 ? `Pagar ${formatarBRL(restante)}` : 'Confirmar pedido';
  }

  return (
    <main className={styles.main}>
      {isEnviando && (
        <div className={styles.barraProgresso} role="progressbar" aria-label="Registrando o pedido" />
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
                    {opcoesEndereco.map((opcao) => (
                      <Radio.Card
                        key={opcao.id}
                        value={opcao.id}
                        data-testid="opcao-endereco"
                        data-endereco-id={opcao.id}
                      >
                        <Radio.Indicator />
                        <span className={styles.opcaoTexto}>
                          <strong>{opcao.nome}</strong>
                          <span>{linhaDoEndereco(opcao)}</span>
                        </span>
                        <span className={styles.opcaoTag}>{tagDoEndereco(opcao)}</span>
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
                    comTipo={false}
                    extra={
                      <Checkbox
                        label="Salvar no meu perfil"
                        data-testid="checkbox-salvar-endereco"
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
                  data-testid="btn-entregar-outro-endereco"
                  onClick={() => setIsFormEnderecoVisible(true)}
                >
                  <Add size={20} /> Entregar em outro endereço
                </button>
              )}

              <div className={styles.avancar}>
                <Button
                  disabled={!enderecoEscolhido}
                  data-testid="btn-continuar-entrega"
                  onClick={() => setEtapa(1)}
                >
                  Continuar para entrega
                </Button>
                {!enderecoEscolhido && <span className={styles.motivo}>Escolha um endereço</span>}
              </div>
            </EtapaCheckout>

            <EtapaCheckout
              numero={1}
              atual={etapa}
              titulo="Entrega"
              resumo={valores ? `Correios · ${formatarBRL(valores.frete)}` : 'Correios'}
              onAlterar={() => setEtapa(1)}
            >
              {enderecoEscolhido && (
                <>
                  <p className={styles.ajuda}>
                    {valores
                      ? `Frete para a região ${valores.regiao} · ${itensNoCarrinho} ${
                          itensNoCarrinho === 1 ? 'disco' : 'discos'
                        }, ${(valores.pesoTotal / 1000).toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })} kg em embalagem rígida`
                      : 'Calculando o frete…'}
                  </p>
                  <Radio.Group value="correios" aria-label="Modalidade de entrega">
                    <Radio.Card value="correios">
                      <Radio.Indicator />
                      <span className={styles.opcaoTexto}>
                        <strong>Correios</strong>
                        <span>Frete calculado pela região do CEP e pelo peso dos discos</span>
                      </span>
                      <span className={styles.opcaoPreco} {...medida('frete-valor', valores?.frete)}>
                        {valores ? formatarBRL(valores.frete) : '—'}
                      </span>
                    </Radio.Card>
                  </Radio.Group>
                </>
              )}
              <div className={styles.avancar}>
                <Button data-testid="btn-continuar-pagamento" onClick={() => setEtapa(2)}>
                  Continuar para pagamento
                </Button>
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
                        data-testid="cupom-opcao"
                        data-codigo={cupom.codigo}
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
                {valores && valores.troco > 0 && (
                  <p className={styles.ajuda} {...medida('aviso-troco', valores.troco)}>
                    A diferença de {formatarBRL(valores.troco)} volta como um novo cupom de troca
                    (RN0036).
                  </p>
                )}
              </div>

              <div className={styles.bloco}>
                <div className={styles.blocoTopo}>
                  <h3>Cartão de crédito</h3>
                  {restante !== 0 && (
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
                        Você ainda não tem cartões cadastrados. Adicione um para pagar
                        {restante === null ? '.' : ` ${formatarBRL(restante)}.`}
                      </p>
                    )}

                    <div className={styles.opcoes}>
                      {cartoesDisponiveis.map((cartao, indice) => {
                        const selecionado = divisao.ids.includes(cartao.id);
                        const ultimoDeDois =
                          divisao.ids.length === 2 && divisao.ids[1] === cartao.id;
                        const final = ultimosDigitos(cartao.numero);
                        const doPedido = indice >= cliente.cartoes.length;
                        return (
                          <div
                            key={cartao.id}
                            className={styles.cartao}
                            data-selecionado={selecionado || undefined}
                            data-testid="cartao-opcao"
                            data-final={final}
                          >
                            <Checkbox
                              checked={selecionado}
                              data-testid="cartao-checkbox"
                              onChange={() => handleToggleCartao(cartao.id)}
                              aria-label={`Pagar com ${cartao.bandeira} final ${final}`}
                            />
                            <span className={styles.bandeira}>{cartao.bandeira.slice(0, 4)}</span>
                            <span className={styles.opcaoTexto}>
                              <strong>
                                {cartao.bandeira} •••• {final}
                              </strong>
                              <span>
                                {cartao.nomeImpresso}
                                {cartao.isPreferencial && ' · preferencial'}
                                {doPedido &&
                                  (cartoesAdHocParaSalvarIds.includes(cartao.id)
                                    ? ' · salvar no perfil'
                                    : ' · só este pedido')}
                              </span>
                            </span>
                            {selecionado &&
                              (ultimoDeDois ? (
                                <span className={styles.opcaoPreco}>
                                  {formatarBRL(Number(divisao.valores[cartao.id]) || 0)}
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
                                  allowNegative={false}
                                  hideControls
                                  aria-label="Valor neste cartão"
                                  data-testid="cartao-valor"
                                  value={divisao.valores[cartao.id] ?? 0}
                                  onChange={(valor) => handleAlterarValorCartao(cartao.id, valor)}
                                />
                              ))}
                          </div>
                        );
                      })}
                    </div>

                    {divisao.ids.length === 2 && (
                      <p className={styles.ajuda}>
                        O segundo cartão cobre o restante automaticamente.
                      </p>
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
                              data-testid="checkbox-salvar-cartao"
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
                        data-testid="btn-adicionar-cartao-checkout"
                        onClick={() => setIsFormCartaoVisible(true)}
                      >
                        <Add size={20} /> Adicionar cartão
                      </button>
                    )}
                  </>
                )}
              </div>

              {pendencias.length > 0 && (
                <Alert color="orange" title="Antes de pagar">
                  <ul className={styles.lista} data-testid="pendencias-pagamento">
                    {pendencias.map((pendencia) => (
                      <li key={pendencia}>{pendencia}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {erroCotacao.length > 0 && (
                <Alert color="red">
                  {erroCotacao.map((mensagem) => (
                    <div key={mensagem}>{mensagem}</div>
                  ))}
                </Alert>
              )}

              {errosPedido.length > 0 && (
                <Alert color="red" title="O pedido não foi registrado" data-testid="alerta-pedido">
                  {errosPedido.map((mensagem) => (
                    <div key={mensagem}>{mensagem}</div>
                  ))}
                </Alert>
              )}

              <div className={styles.avancar}>
                <Button
                  size="xl"
                  disabled={!podePagar}
                  loading={isEnviando}
                  data-testid="btn-pagar"
                  onClick={() => void handleFinalizarCompra()}
                >
                  {rotuloPagar()}
                </Button>
                {!emDia && (
                  <span className={styles.motivo}>Conferindo os valores com a loja…</span>
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
              <span {...medida('resumo-subtotal', valores?.subtotal)}>
                {valores ? formatarBRL(valores.subtotal) : '—'}
              </span>
            </div>
            <div className={styles.linha}>
              <span>Frete</span>
              {enderecoEscolhido ? (
                <span {...medida('resumo-frete', valores?.frete)}>
                  {valores ? formatarBRL(valores.frete) : '—'}
                </span>
              ) : (
                <span className={styles.apagado}>na etapa 01</span>
              )}
            </div>
            {valores && valores.valorCupons > 0 && (
              <div className={styles.linha} data-desconto>
                <span>Cupons</span>
                <span {...medida('resumo-cupons', valores.valorCupons)}>
                  − {formatarBRL(valores.valorCupons)}
                </span>
              </div>
            )}
          </div>

          <div className={styles.total}>
            <span>Total</span>
            <strong {...medida('resumo-total', valores?.restante)}>
              {valores ? formatarBRL(valores.restante) : '—'}
            </strong>
          </div>

          <AvisoReserva texto="Seus discos ficam reservados até o fim do contador." />
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
