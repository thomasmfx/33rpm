import styles from './Checkout.module.scss';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Divider,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  Radio,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Cartao, Endereco } from '../../types/cliente';
import type { Cupom } from '../../types/cupom';
import type { Pedido } from '../../types/pedido';
import { useLoja } from '../../contexts/loja';
import { AVISO_ANTES_MINUTOS } from '../../utils/carrinho';
import {
  calcularFrete,
  calcularSubtotal,
  cuponsDisponiveis,
  itensDoCarrinho,
  itensIndisponiveis,
  montarItensPedido,
  montarPagamentoCartao,
  montarPagamentoCupons,
  regiaoDoEstado,
  somarCupons,
  trocoDosCupons,
  ultimosDigitos,
  validarCartoes,
  validarCupons,
  valorRestante,
} from '../../utils/checkout';
import { adicionarCartao, atendeTipo, resumirEndereco } from '../../utils/perfilCliente';
import { formatarBRL } from '../../utils/precificacao';
import FormEndereco, {
  type FormEnderecoValues,
} from '../../components/FormCliente/FormEndereco';
import FormCartao, {
  type FormCartaoValues,
} from '../../components/FormCliente/FormCartao';

function Checkout() {
  const {
    clienteAtivo,
    carrinho,
    discos,
    cupons,
    setClientes,
    registrarPedido,
    minutosParaExpirar,
    sincronizarCarrinho,
  } = useLoja();
  const navegar = useNavigate();

  const [etapaAtiva, setEtapaAtiva] = useState(0);

  const [enderecoAdHoc, setEnderecoAdHoc] = useState<Endereco | null>(null);
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState<string | null>(null);
  const [isSalvarEndereco, setIsSalvarEndereco] = useState(false);
  const [isFormEnderecoVisible, setIsFormEnderecoVisible] = useState(false);

  const [cuponsSelecionadosIds, setCuponsSelecionadosIds] = useState<string[]>([]);

  const [cartoesAdHoc, setCartoesAdHoc] = useState<Cartao[]>([]);
  const [cartoesAdHocParaSalvarIds, setCartoesAdHocParaSalvarIds] = useState<string[]>([]);
  const [isSalvarCartao, setIsSalvarCartao] = useState(false);
  const [isFormCartaoVisible, setIsFormCartaoVisible] = useState(false);
  const [cartoesSelecionadosIds, setCartoesSelecionadosIds] = useState<string[]>([]);
  const [valoresPorCartao, setValoresPorCartao] = useState<Record<string, number>>({});

  const itens = itensDoCarrinho(carrinho, discos);
  const indisponiveis = itensIndisponiveis(itens);

  if (!clienteAtivo) {
    return (
      <main className={styles.main}>
        <Stack gap="md" align="flex-start" mt="6em">
          <Title order={1} size="32">Escolha um perfil para comprar</Title>
          <Text fw={300}>
            O 33rpm simula sessão de cliente e não tem login — escolha um perfil no menu do
            topo antes de finalizar a compra.
          </Text>
          <Anchor component={Link} to="/acervo" fw={700}>Voltar para o acervo</Anchor>
        </Stack>
      </main>
    );
  }

  if (itens.length === 0) {
    return (
      <main className={styles.main}>
        <Stack gap="md" align="flex-start" mt="6em">
          <Title order={1} size="32">Seu carrinho está vazio</Title>
          <Text fw={300}>Adicione discos ao carrinho antes de finalizar a compra.</Text>
          <Anchor component={Link} to="/acervo" fw={700}>Explorar o acervo</Anchor>
        </Stack>
      </main>
    );
  }

  if (indisponiveis.length > 0) {
    return (
      <main className={styles.main}>
        <Stack gap="md" mt="6em">
          <Title order={1} size="32">Ajuste seu carrinho</Title>
          <Alert color="red" title="Estoque insuficiente" icon={<IconAlertTriangle size={18} />}>
            <Stack gap={4}>
              <Text size="sm">
                O estoque destes discos caiu abaixo da quantidade que está no seu carrinho:
              </Text>
              {indisponiveis.map(({ disco, quantidade }) => (
                <Text size="sm" key={disco.id}>
                  {disco.title} — no carrinho: {quantidade}, disponível: {disco.estoque}
                </Text>
              ))}
              <Group mt="xs">
                <Button size="xs" color="dark" onClick={sincronizarCarrinho}>
                  Ajustar carrinho automaticamente
                </Button>
              </Group>
            </Stack>
          </Alert>
          <Anchor component={Link} to="/carrinho" fw={700}>Ajustar carrinho</Anchor>
        </Stack>
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

  const cuponsList = cuponsDisponiveis(cupons, cliente.id);
  const cuponsSelecionados = cuponsList.filter((cupom) =>
    cuponsSelecionadosIds.includes(cupom.id),
  );
  const mensagemCupons = validarCupons(cuponsSelecionados, total);
  const restante = valorRestante(cuponsSelecionados, total);
  const troco = trocoDosCupons(cuponsSelecionados, total);

  const cartoesDisponiveis = [...cliente.cartoes, ...cartoesAdHoc];
  const cartoesSelecionados = cartoesDisponiveis.filter((cartao) =>
    cartoesSelecionadosIds.includes(cartao.id),
  );
  const pagamentoCartoes = cartoesSelecionados.map((cartao) =>
    montarPagamentoCartao(cartao, valoresPorCartao[cartao.id] ?? 0),
  );

  const somaCartoes =
    Math.round(
      pagamentoCartoes.reduce((soma, cartao) => soma + cartao.valor, 0) * 100,
    ) / 100;
  const faltaDistribuir = Math.round((restante - somaCartoes) * 100) / 100;
  const mensagemCartoes = validarCartoes(
    pagamentoCartoes,
    restante,
    cuponsSelecionados.length > 0,
  );

  const haPendenciaNoPagamento = Boolean(mensagemCupons) || Boolean(mensagemCartoes);

  function handleFecharFormEndereco(): void {
    setIsFormEnderecoVisible(false);
    setIsSalvarEndereco(false);
  }

  function handleSubmitEnderecoNovo(valores: FormEnderecoValues): void {
    const novoEndereco: Endereco = { id: crypto.randomUUID().slice(0, 8), ...valores };
    setEnderecoAdHoc(novoEndereco);
    setEnderecoSelecionadoId(novoEndereco.id);
    setIsFormEnderecoVisible(false);
  }

  function handleFecharFormCartao(): void {
    setIsFormCartaoVisible(false);
    setIsSalvarCartao(false);
  }

  function handleSubmitCartaoNovo(valores: FormCartaoValues): void {
    const novoCartao: Cartao = { id: crypto.randomUUID().slice(0, 8), ...valores };
    setCartoesAdHoc((atuais) => [...atuais, novoCartao]);
    setCartoesSelecionadosIds((atuais) => [...atuais, novoCartao.id]);
    if (isSalvarCartao) {
      setCartoesAdHocParaSalvarIds((atuais) => [...atuais, novoCartao.id]);
    }
    setIsSalvarCartao(false);
    setIsFormCartaoVisible(false);
  }

  function handleToggleCupom(cupomId: string): void {
    setCuponsSelecionadosIds((atuais) =>
      atuais.includes(cupomId) ? atuais.filter((id) => id !== cupomId) : [...atuais, cupomId],
    );
  }

  function handleToggleCartao(cartaoId: string): void {
    setCartoesSelecionadosIds((atuais) =>
      atuais.includes(cartaoId)
        ? atuais.filter((id) => id !== cartaoId)
        : [...atuais, cartaoId],
    );
  }

  function handleAlterarValorCartao(cartaoId: string, valor: number): void {
    setValoresPorCartao((atuais) => ({ ...atuais, [cartaoId]: valor }));
  }

  function handleDividirIgualmente(): void {
    if (cartoesSelecionadosIds.length === 0) return;

    const restanteCentavos = Math.round(restante * 100);
    const partes = cartoesSelecionadosIds.length;
    const baseCentavos = Math.floor(restanteCentavos / partes);
    const sobraCentavos = restanteCentavos - baseCentavos * partes;

    setValoresPorCartao((atuais) => {
      const novos = { ...atuais };
      cartoesSelecionadosIds.forEach((id, indice) => {
        novos[id] = (baseCentavos + (indice === 0 ? sobraCentavos : 0)) / 100;
      });
      return novos;
    });
  }

  function handleFinalizarCompra(): void {
    if (!enderecoEscolhido) return;

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

    registrarPedido(pedido, cupomTroca);

    if (isSalvarEndereco && enderecoAdHoc) {
      setClientes((atuais) =>
        atuais.map((registro) =>
          registro.id === cliente.id
            ? { ...registro, enderecos: [...registro.enderecos, enderecoAdHoc] }
            : registro,
        ),
      );
    }

    const cartoesParaSalvar = cartoesAdHoc.filter((cartao) =>
      cartoesAdHocParaSalvarIds.includes(cartao.id),
    );
    if (cartoesParaSalvar.length > 0) {
      setClientes((atuais) =>
        atuais.map((registro) =>
          registro.id === cliente.id
            ? {
                ...registro,
                cartoes: cartoesParaSalvar.reduce(
                  (cartoesAtuais, cartao) => adicionarCartao(cartoesAtuais, cartao),
                  registro.cartoes,
                ),
              }
            : registro,
        ),
      );
    }

    navegar('/pedidos');
  }

  return (
    <main className={styles.main}>
      {isFormEnderecoVisible && (
        <Modal
          opened={isFormEnderecoVisible}
          onClose={handleFecharFormEndereco}
          centered
          size="lg"
          withCloseButton={false}
        >
          <Checkbox
            label="Salvar este endereço no meu perfil"
            checked={isSalvarEndereco}
            onChange={(evento) => setIsSalvarEndereco(evento.currentTarget.checked)}
            mb="md"
          />
          <FormEndereco onCancelar={handleFecharFormEndereco} onSubmit={handleSubmitEnderecoNovo} />
        </Modal>
      )}

      {isFormCartaoVisible && (
        <Modal
          opened={isFormCartaoVisible}
          onClose={handleFecharFormCartao}
          centered
          size="lg"
          withCloseButton={false}
        >
          <Checkbox
            label="Salvar este cartão no meu perfil"
            checked={isSalvarCartao}
            onChange={(evento) => setIsSalvarCartao(evento.currentTarget.checked)}
            mb="md"
          />
          <FormCartao onCancelar={handleFecharFormCartao} onSubmit={handleSubmitCartaoNovo} />
        </Modal>
      )}

      <Title order={1} size="40">Finalizar compra</Title>

      {minutosParaExpirar !== null && minutosParaExpirar <= AVISO_ANTES_MINUTOS && (
        <Alert color="orange" mb="md">
          Sua reserva está prestes a expirar:{' '}
          {minutosParaExpirar === 1
            ? 'resta 1 minuto'
            : `restam ${minutosParaExpirar} minutos`}
          . Vale
          concluir a compra logo.
        </Alert>
      )}

      <Stepper
        active={etapaAtiva}
        onStepClick={(etapa) => {
          if (etapa < etapaAtiva) setEtapaAtiva(etapa);
        }}
        allowNextStepsSelect={false}
        color="dark"
      >
        <Stepper.Step label="Entrega">
          <Stack gap="md" mt="md">
            {opcoesEndereco.length === 0 ? (
              <Text size="sm" fw={300}>
                Você ainda não tem nenhum endereço de entrega cadastrado.
              </Text>
            ) : (
              <Radio.Group
                label="Endereço de entrega"
                value={enderecoSelecionadoId ?? ''}
                onChange={setEnderecoSelecionadoId}
              >
                <Stack gap="sm" mt="xs">
                  {opcoesEndereco.map((endereco) => (
                    <Radio
                      key={endereco.id}
                      value={endereco.id}
                      label={
                        <div>
                          <Text size="sm" fw={600}>{endereco.nome}</Text>
                          <Text size="xs" fw={300} c="dimmed">{resumirEndereco(endereco)}</Text>
                        </div>
                      }
                    />
                  ))}
                </Stack>
              </Radio.Group>
            )}

            <Group>
              <Button variant="default" size="sm" onClick={() => setIsFormEnderecoVisible(true)}>
                Usar outro endereço
              </Button>
            </Group>

            {enderecoEscolhido && (
              <Text size="sm">
                Frete para a região {regiaoDoEstado(enderecoEscolhido.estado)}:{' '}
                <Text span fw={600}>{formatarBRL(frete)}</Text>
              </Text>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Pagamento">
          <Stack gap="lg" mt="md">
            <Paper withBorder p="md">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Subtotal</Text>
                  <Text size="sm">{formatarBRL(subtotal)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Frete</Text>
                  <Text size="sm">{formatarBRL(frete)}</Text>
                </Group>

                <Divider my={2} />

                <Group justify="space-between">
                  <Text fw={600}>Total do pedido</Text>
                  <Text fw={700} size="lg">{formatarBRL(total)}</Text>
                </Group>

                {cuponsSelecionados.length > 0 && (
                  <>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Cupons aplicados</Text>
                      <Text size="sm" c="green">
                        − {formatarBRL(somarCupons(cuponsSelecionados))}
                      </Text>
                    </Group>
                    {troco > 0 && (
                      <Text size="xs" c="dimmed">
                        A diferença de {formatarBRL(troco)} volta como um novo
                        cupom de troca.
                      </Text>
                    )}
                  </>
                )}

                <Divider my={2} />

                <Group justify="space-between">
                  <Text fw={600}>A pagar no cartão</Text>
                  <Text fw={700}>{formatarBRL(restante)}</Text>
                </Group>

                {restante > 0 && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {faltaDistribuir === 0
                        ? 'Distribuído nos cartões'
                        : 'Falta distribuir'}
                    </Text>
                    <Text
                      size="sm"
                      fw={600}
                      c={
                        faltaDistribuir === 0
                          ? 'green'
                          : faltaDistribuir < 0
                            ? 'red'
                            : 'orange'
                      }
                    >
                      {faltaDistribuir === 0
                        ? formatarBRL(somaCartoes)
                        : formatarBRL(Math.abs(faltaDistribuir)) +
                          (faltaDistribuir < 0 ? ' a mais' : '')}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>

            <div>
              <Text fw={600} mb="xs">Cupons</Text>

              {cuponsList.length === 0 ? (
                <Text size="sm" fw={300} c="dimmed">
                  Nenhum cupom disponível para este cliente.
                </Text>
              ) : (
                <Stack gap="sm">
                  {(['promocional', 'troca'] as const).map((tipo) => {
                    const cuponsDoTipo = cuponsList.filter((cupom) => cupom.tipo === tipo);
                    if (cuponsDoTipo.length === 0) return null;

                    return (
                      <div key={tipo}>
                        <Text size="xs" fw={500} c="dimmed" mb={4}>
                          {tipo === 'promocional' ? 'Promocionais' : 'Troca'}
                        </Text>
                        <Stack gap={6}>
                          {cuponsDoTipo.map((cupom) => (
                            <Checkbox
                              key={cupom.id}
                              label={`${cupom.codigo} — ${formatarBRL(cupom.valor)}`}
                              checked={cuponsSelecionadosIds.includes(cupom.id)}
                              onChange={() => handleToggleCupom(cupom.id)}
                            />
                          ))}
                        </Stack>
                      </div>
                    );
                  })}
                </Stack>
              )}

              {mensagemCupons && (
                <Alert color="orange" mt="sm">{mensagemCupons}</Alert>
              )}

            </div>

            <Divider />

            <div>
              <Text fw={600} mb="xs">Cartões</Text>

              {restante === 0 ? (
                <Text size="sm" fw={300} c="dimmed">
                  Os cupons cobrem o valor total — nenhum cartão é necessário.
                </Text>
              ) : (
                <>
                  {cartoesDisponiveis.length === 0 && (
                    <Text size="sm" fw={300} c="dimmed" mb="sm">
                      Você ainda não tem cartões cadastrados. Adicione um para pagar{' '}
                      {formatarBRL(restante)}.
                    </Text>
                  )}

                  {cartoesDisponiveis.length > 0 && (
                    <Stack gap="sm" mb="sm">
                      {cartoesDisponiveis.map((cartao) => {
                        const isSelecionado = cartoesSelecionadosIds.includes(cartao.id);
                        return (
                          <Group key={cartao.id} align="flex-end" wrap="nowrap">
                            <Checkbox
                              label={`${cartao.bandeira} •••• ${ultimosDigitos(cartao.numero)}`}
                              checked={isSelecionado}
                              onChange={() => handleToggleCartao(cartao.id)}
                              flex={1}
                            />
                            {isSelecionado && (
                              <NumberInput
                                w={140}
                                prefix="R$ "
                                decimalScale={2}
                                fixedDecimalScale
                                min={0}
                                value={valoresPorCartao[cartao.id] ?? 0}
                                onChange={(valor) =>
                                  handleAlterarValorCartao(cartao.id, Number(valor) || 0)
                                }
                              />
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  )}

                  <Group>
                    <Button variant="default" size="sm" onClick={() => setIsFormCartaoVisible(true)}>
                      Adicionar cartão
                    </Button>
                    {cartoesSelecionadosIds.length > 0 && (
                      <Button variant="subtle" color="black" size="sm" onClick={handleDividirIgualmente}>
                        Dividir igualmente
                      </Button>
                    )}
                  </Group>

                  {mensagemCartoes && (
                    <Alert color="orange" mt="sm">{mensagemCartoes}</Alert>
                  )}
                </>
              )}
            </div>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Revisão">
          <Stack gap="lg" mt="md">
            <div>
              <Text fw={600} mb="sm">Itens</Text>
              <Stack gap="sm">
                {itens.map(({ disco, quantidade }) => (
                  <Group key={disco.id} justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap" gap="sm">
                      <div className={styles.capa}>
                        <Image src={disco.coverSrc} alt={disco.title} w={56} h={56} fit="cover" />
                      </div>
                      <div>
                        <Text size="sm" fw={600}>{disco.title}</Text>
                        <Text size="xs" fw={300} c="dimmed">Quantidade: {quantidade}</Text>
                      </div>
                    </Group>
                    <Text size="sm" fw={600}>{formatarBRL(disco.price * quantidade)}</Text>
                  </Group>
                ))}
              </Stack>
            </div>

            <Divider />

            <div>
              <Text fw={600} mb={4}>Endereço de entrega</Text>
              {enderecoEscolhido && (
                <Text size="sm" fw={300}>
                  {enderecoEscolhido.nome} — {resumirEndereco(enderecoEscolhido)}
                </Text>
              )}
            </div>

            <div>
              <Text fw={600} mb={4}>Pagamento</Text>
              <Stack gap={2}>
                {cuponsSelecionados.map((cupom) => (
                  <Text size="sm" fw={300} key={cupom.id}>
                    Cupom {cupom.codigo}: -{formatarBRL(cupom.valor)}
                  </Text>
                ))}
                {pagamentoCartoes.map((cartaoPago) => (
                  <Text size="sm" fw={300} key={cartaoPago.cartaoId}>
                    {cartaoPago.bandeira} •••• {cartaoPago.ultimosDigitos}: {formatarBRL(cartaoPago.valor)}
                  </Text>
                ))}
              </Stack>
            </div>

            <Divider />

            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Subtotal</Text>
                <Text size="sm">{formatarBRL(subtotal)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Frete</Text>
                <Text size="sm">{formatarBRL(frete)}</Text>
              </Group>
              <Group justify="space-between" align="center">
                <Text fw={600}>Total</Text>
                <Title order={2} size="28">{formatarBRL(total)}</Title>
              </Group>
            </Stack>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between">
        <Button variant="default" disabled={etapaAtiva === 0} onClick={() => setEtapaAtiva((atual) => atual - 1)}>
          Voltar
        </Button>

        {etapaAtiva === 0 && (
          <Button color="dark" disabled={!enderecoEscolhido} onClick={() => setEtapaAtiva(1)}>
            Continuar
          </Button>
        )}

        {etapaAtiva === 1 && (
          <Button color="dark" disabled={haPendenciaNoPagamento} onClick={() => setEtapaAtiva(2)}>
            Continuar
          </Button>
        )}

        {etapaAtiva === 2 && (
          <Button
            color="dark"
            size="md"
            disabled={haPendenciaNoPagamento || indisponiveis.length > 0}
            onClick={handleFinalizarCompra}
          >
            Finalizar compra
          </Button>
        )}
      </Group>
    </main>
  );
}

export default Checkout;
