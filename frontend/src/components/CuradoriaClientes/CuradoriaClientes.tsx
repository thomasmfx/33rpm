import styles from '../../pages/Curadoria/Painel.module.scss';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Drawer,
  Modal,
  SegmentedControl,
  Skeleton,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import type {
  Cliente,
  Endereco,
  FiltrosClientes,
  StatusFiltro,
} from '../../types/cliente';
import {
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
} from '../../utils/filtrarClientes';
import FormCliente, {
  type FormClienteValues,
} from '../FormCliente/FormCliente';
import { useLoja } from '../../contexts/loja';
import {
  linhaDoEndereco,
  mascararCartao,
  ROTULO_TIPO_ENDERECO,
  telefoneCompleto,
} from '../../utils/perfilCliente';
import { mascararCpf } from '../../utils/texto';
import { formatarDataBR } from '../../utils/estoque';
import { CORES_STATUS, pedidosDoCliente, ROTULOS_STATUS } from '../../utils/pedido';
import { formatarBRL } from '../../utils/precificacao';
import type { Pedido } from '../../types/pedido';
import type { EstadoPedidos } from '../CuradoriaPedidos/CuradoriaPedidos';
import { ErroApi } from '../../services/api';
import {
  alterarCliente,
  alterarEnderecos,
  alterarSenha,
  cadastrarCliente,
  inativarCliente,
  listarClientes,
  reativarCliente,
} from '../../services/clientesService';
import CabecalhoPainel from '../CabecalhoPainel/CabecalhoPainel';
import StatusPonto from '../StatusPonto/StatusPonto';
import { EsqueletoLinhas } from '../Esqueleto/Esqueleto';
import { Add, Close, Edit, Filter, Login, Password, Search } from '@carbon/icons-react';

const COLUNAS = '110px minmax(200px, 1.6fr) 130px 90px 90px minmax(300px, auto)';
const PEDIDOS_NO_DETALHE = 5;
const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR');

function mensagensDe(erro: unknown, padrao: string): string[] {
  return erro instanceof ErroApi ? erro.mensagens : [padrao];
}

function Ranking({ valor }: Readonly<{ valor: number }>) {
  return (
    <span className={styles.ranking} aria-label={`Ranking ${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((posicao) => (
        <span key={posicao} data-cheio={posicao <= valor || undefined} />
      ))}
    </span>
  );
}

interface DetalhesClienteProps {
  cliente: Cliente;
  /** Do mais recente ao mais antigo. */
  pedidos: Pedido[];
  onFechar: () => void;
  onEditar: () => void;
  onNavegarComo: () => void;
  onAbrirPedido: (pedidoId: string) => void;
  onVerPedidos: () => void;
}

function DetalhesCliente({
  cliente,
  pedidos,
  onFechar,
  onEditar,
  onNavegarComo,
  onAbrirPedido,
  onVerPedidos,
}: Readonly<DetalhesClienteProps>) {
  const dados: [string, string][] = [
    ['E-mail', cliente.email],
    ['CPF', mascararCpf(cliente.cpf)],
    ['Nascimento', cliente.dataNascimento ? formatarDataBR(cliente.dataNascimento) : '—'],
    ['Gênero', cliente.genero],
    ['Telefone', `${telefoneCompleto(cliente.telefone)} · ${cliente.telefone.tipo}`],
    ['Ranking', `${cliente.ranking} de 5`],
  ];

  return (
    <div className={styles.drawer} data-testid="detalhes-cliente">
      <div className={styles.drawerTopo}>
        <div className={styles.drawerTitulo}>
          <span className={styles.meta}>{cliente.codigo}</span>
          <h2>{cliente.nome}</h2>
          <StatusPonto cor={cliente.isAtivo ? '#2F7A4E' : '#B83A2A'}>
            {cliente.isAtivo ? 'Ativo' : 'Inativo'}
          </StatusPonto>
        </div>
        <Button variant="default" size="xs" leftSection={<Close size={16} />} onClick={onFechar}>
          Fechar
        </Button>
      </div>

      <div className={styles.kv}>
        {dados.map(([chave, valor]) => (
          <div key={chave} className={styles.kvLinha}>
            <span>{chave}</span>
            <span>{valor}</span>
          </div>
        ))}
      </div>

      <div className={styles.secao}>
        <span className={styles.rotuloSecao}>Endereços</span>
        {cliente.enderecos.map((endereco) => (
          <div key={endereco.id} className={styles.cartao}>
            <div className={styles.cartaoTopo}>
              <strong>{endereco.nome}</strong>
              <span className={styles.tag}>{ROTULO_TIPO_ENDERECO[endereco.tipo]}</span>
            </div>
            {linhaDoEndereco(endereco)}
          </div>
        ))}
      </div>

      <div className={styles.secao}>
        <span className={styles.rotuloSecao}>Cartões</span>
        {cliente.cartoes.length === 0 && (
          <span className={styles.nada}>Nenhum cartão cadastrado.</span>
        )}
        {cliente.cartoes.map((cartao) => (
          <div key={cartao.id} className={styles.cartao}>
            <div className={styles.cartaoTopo}>
              <strong>
                {cartao.bandeira} {mascararCartao(cartao.numero)}
              </strong>
              {cartao.isPreferencial && <span className={styles.tagSelo}>Preferencial</span>}
            </div>
            {cartao.nomeImpresso}
          </div>
        ))}
      </div>

      <div className={styles.secao} data-testid="pedidos-cliente">
        <span className={styles.rotuloSecao}>
          Pedidos{pedidos.length > 0 && ` · ${pedidos.length}`}
        </span>
        {pedidos.length === 0 && <span className={styles.nada}>Nenhum pedido feito.</span>}
        {pedidos.length > 0 && (
          <div className={styles.pedidos}>
            {pedidos.slice(0, PEDIDOS_NO_DETALHE).map((pedido) => (
              <button
                key={pedido.id}
                type="button"
                className={styles.pedidoLinha}
                aria-label={`Ver o pedido ${pedido.id}`}
                onClick={() => onAbrirPedido(pedido.id)}
              >
                <span className={styles.pedidoNumero}>{pedido.id}</span>
                <span className={styles.numero}>{FORMATO_DATA.format(new Date(pedido.data))}</span>
                <StatusPonto cor={CORES_STATUS[pedido.status]}>
                  {ROTULOS_STATUS[pedido.status]}
                </StatusPonto>
                <span className={`${styles.preco} ${styles.direita}`}>
                  {formatarBRL(pedido.total)}
                </span>
              </button>
            ))}
          </div>
        )}
        {pedidos.length > PEDIDOS_NO_DETALHE && (
          <div>
            <Button variant="link" size="xs" onClick={onVerPedidos}>
              Ver os {pedidos.length} pedidos
            </Button>
          </div>
        )}
      </div>

      <div className={styles.drawerRodape}>
        <p className={styles.nada}>
          Navegar como o cliente encerra a sessão de administrador; para voltar à curadoria,
          entre de novo.
        </p>
        <Button size="sm" leftSection={<Edit size={16} />} onClick={onEditar}>
          Editar dados
        </Button>
        <Button size="sm" variant="default" leftSection={<Password size={16} />} onClick={onEditar}>
          Alterar senha
        </Button>
        <Button
          size="sm"
          variant="default"
          leftSection={<Login size={16} />}
          disabled={!cliente.isAtivo}
          onClick={onNavegarComo}
        >
          Navegar como
        </Button>
      </div>
    </div>
  );
}

function CuradoriaClientes() {
  const {
    clientes: todosClientes,
    pedidos,
    carregandoClientes,
    recarregarClientes,
    entrarComoCliente,
  } = useLoja();
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_VAZIOS);
  const [filtrosAplicados] = useDebouncedValue(filtros, 300);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  // esqueleto só na primeira carga; nos refetches as linhas antigas ficam esmaecidas
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroLista, setErroLista] = useState<string[]>([]);
  const [erroForm, setErroForm] = useState<string[]>([]);
  const [isFormClienteVisible, setIsFormClienteVisible] =
    useState<boolean>(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteEmDetalhe, setClienteEmDetalhe] = useState<Cliente | null>(null);
  const [clienteParaAlternarStatus, setClienteParaAlternarStatus] =
    useState<Cliente | null>(null);
  const [isFiltroAberto, { toggle: toggleFiltro }] = useDisclosure(false);

  const qtdFiltrosAtivos = contarFiltrosAtivos(filtros);
  const ativos = todosClientes.filter((cliente) => cliente.isAtivo).length;
  const inativos = todosClientes.length - ativos;

  // RF0024: a consulta é do servidor; a interface só monta os parâmetros
  const buscar = useCallback(async () => {
    setAtualizando(true);
    try {
      setClientes(await listarClientes(filtrosAplicados));
      setErroLista([]);
    } catch (erro) {
      setErroLista(mensagensDe(erro, 'Falha ao consultar os clientes.'));
    } finally {
      setAtualizando(false);
      setCarregando(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    // busca no servidor a cada mudança de filtro; a API é o sistema externo aqui
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void buscar();
  }, [buscar]);

  async function atualizarTudo(): Promise<void> {
    await buscar();
    await recarregarClientes();
  }

  function handleAlterarFiltro<Campo extends keyof FiltrosClientes>(
    campo: Campo,
    valor: FiltrosClientes[Campo],
  ): void {
    setFiltros((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
  }

  function handleLimparFiltros(): void {
    setFiltros(FILTROS_VAZIOS);
  }

  function handleAbrirNovoCliente(): void {
    setClienteEmEdicao(null);
    setErroForm([]);
    setIsFormClienteVisible(true);
  }

  function handleAbrirEdicaoCliente(cliente: Cliente): void {
    setClienteEmDetalhe(null);
    setClienteEmEdicao(cliente);
    setErroForm([]);
    setIsFormClienteVisible(true);
  }

  function handleFecharFormCliente(): void {
    setIsFormClienteVisible(false);
    setClienteEmEdicao(null);
    setErroForm([]);
  }

  async function executarEscrita(escrita: () => Promise<unknown>, padrao: string): Promise<void> {
    setEnviando(true);
    try {
      await escrita();
      handleFecharFormCliente();
      await atualizarTudo();
    } catch (erro) {
      setErroForm(mensagensDe(erro, padrao));
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmitCliente(valores: FormClienteValues): Promise<void> {
    return executarEscrita(
      () =>
        clienteEmEdicao
          ? alterarCliente(clienteEmEdicao.id, valores)
          : cadastrarCliente(valores),
      'Falha ao salvar o cliente.',
    );
  }

  /** RF0028: a senha muda sozinha, sem reenviar o cadastro inteiro. */
  function handleAlterarSenha(senha: string, confirmacao: string): Promise<void> {
    if (!clienteEmEdicao) return Promise.resolve();
    return executarEscrita(
      () => alterarSenha(clienteEmEdicao.id, senha, confirmacao),
      'Falha ao alterar a senha.',
    );
  }

  /** RNF0034: os endereços mudam sozinhos, sem reenviar o cadastro inteiro. */
  function handleAlterarEnderecos(enderecos: Endereco[]): Promise<void> {
    if (!clienteEmEdicao) return Promise.resolve();
    return executarEscrita(
      () => alterarEnderecos(clienteEmEdicao.id, enderecos),
      'Falha ao alterar os endereços.',
    );
  }

  // sai da curadoria antes de trocar a sessão: na ordem inversa a RotaAdmin
  // renderiza sem admin ainda em /curadoria e o 403 pisca antes da Home
  async function handleEntrarComoCliente(clienteId: string): Promise<void> {
    await navegar('/', { flushSync: true });
    entrarComoCliente(clienteId);
  }

  // RF0023: inativar não apaga o cadastro; reativar devolve o acesso
  async function handleConfirmarAlterarStatus(): Promise<void> {
    if (!clienteParaAlternarStatus) return;

    setEnviando(true);
    try {
      if (clienteParaAlternarStatus.isAtivo) {
        await inativarCliente(clienteParaAlternarStatus.id);
      } else {
        await reativarCliente(clienteParaAlternarStatus.id);
      }
      setClienteParaAlternarStatus(null);
      await atualizarTudo();
    } catch (erro) {
      setErroLista(mensagensDe(erro, 'Falha ao alterar o status do cliente.'));
      setClienteParaAlternarStatus(null);
    } finally {
      setEnviando(false);
    }
  }

  function renderLinhas() {
    if (carregando) return <EsqueletoLinhas colunas={COLUNAS} />;

    if (clientes.length === 0) {
      return (
        <p className={styles.vazio} data-testid="lista-vazia">
          Nenhum cliente com esses filtros.
        </p>
      );
    }

    return clientes.map((cliente) => (
      <div
        key={cliente.id}
        className={styles.linhaTabela}
        style={{ gridTemplateColumns: COLUNAS }}
        data-inativo={!cliente.isAtivo || undefined}
        data-testid="cliente-linha"
      >
        <span className={styles.codigo} data-testid="cliente-codigo">
          {cliente.codigo}
        </span>
        <button
          type="button"
          className={styles.celulaNome}
          onClick={() => setClienteEmDetalhe(cliente)}
        >
          <strong data-testid="cliente-nome">{cliente.nome}</strong>
          <span className={styles.sub} data-testid="cliente-email">
            {cliente.email}
          </span>
        </button>
        <span className={styles.numero}>{telefoneCompleto(cliente.telefone)}</span>
        <Ranking valor={cliente.ranking} />
        <StatusPonto cor={cliente.isAtivo ? '#2F7A4E' : '#B83A2A'}>
          {cliente.isAtivo ? 'Ativo' : 'Inativo'}
        </StatusPonto>
        <span className={styles.acoes}>
          <button
            type="button"
            className={styles.acao}
            data-testid="btn-detalhes"
            onClick={() => setClienteEmDetalhe(cliente)}
          >
            Detalhes
          </button>
          <button
            type="button"
            className={styles.acao}
            aria-label={`Editar ${cliente.nome}`}
            data-testid="btn-editar"
            onClick={() => handleAbrirEdicaoCliente(cliente)}
          >
            Editar
          </button>
          <button
            type="button"
            className={styles.acao}
            disabled={!cliente.isAtivo}
            aria-label={`Navegar como ${cliente.nome}`}
            data-testid="btn-entrar-como"
            onClick={() => void handleEntrarComoCliente(cliente.id)}
          >
            Entrar como
          </button>
          <button
            type="button"
            className={cliente.isAtivo ? styles.acaoPerigo : styles.acao}
            aria-label={cliente.isAtivo ? `Inativar ${cliente.nome}` : `Reativar ${cliente.nome}`}
            data-testid="btn-alternar-status"
            onClick={() => setClienteParaAlternarStatus(cliente)}
          >
            {cliente.isAtivo ? 'Inativar' : 'Reativar'}
          </button>
        </span>
      </div>
    ));
  }

  return (
    <div className={styles.painel}>
      {isFormClienteVisible && (
        <Modal
          size={880}
          withCloseButton={false}
          opened={isFormClienteVisible}
          onClose={handleFecharFormCliente}
        >
          {erroForm.length > 0 && (
            <Alert color="red" mb="lg" data-testid="alerta-erro">
              {erroForm.map((mensagem) => (
                <div key={mensagem}>{mensagem}</div>
              ))}
            </Alert>
          )}
          <FormCliente
            key={clienteEmEdicao?.id ?? 'novo'}
            initialValues={clienteEmEdicao ?? undefined}
            isEdit={Boolean(clienteEmEdicao)}
            enviando={enviando}
            onClose={handleFecharFormCliente}
            onSubmit={handleSubmitCliente}
            onAlterarSenha={handleAlterarSenha}
            onAlterarEnderecos={handleAlterarEnderecos}
          />
        </Modal>
      )}

      {clienteParaAlternarStatus && (
        <Modal
          opened={Boolean(clienteParaAlternarStatus)}
          onClose={() => setClienteParaAlternarStatus(null)}
          title={clienteParaAlternarStatus.isAtivo ? 'Inativar cliente' : 'Reativar cliente'}
        >
          <p className={styles.textoModal}>
            {clienteParaAlternarStatus.isAtivo
              ? 'Ao inativar, o cliente perde o acesso à loja e deixa de aparecer nos filtros de ativos. O cadastro continua no banco. Confirmar a inativação de '
              : 'Ao reativar, o cliente volta a ter acesso à loja. Confirmar a reativação de '}
            <strong>{clienteParaAlternarStatus.nome}</strong>?
          </p>
          <div className={styles.rodapeModal}>
            <Button variant="default" size="sm" onClick={() => setClienteParaAlternarStatus(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              color={clienteParaAlternarStatus.isAtivo ? 'red' : 'dark'}
              loading={enviando}
              data-testid="btn-confirmar-status"
              onClick={handleConfirmarAlterarStatus}
            >
              {clienteParaAlternarStatus.isAtivo ? 'Inativar cadastro' : 'Reativar cadastro'}
            </Button>
          </div>
        </Modal>
      )}

      <Drawer
        size={520}
        opened={Boolean(clienteEmDetalhe)}
        onClose={() => setClienteEmDetalhe(null)}
        withCloseButton={false}
      >
        {clienteEmDetalhe && (
          <DetalhesCliente
            cliente={clienteEmDetalhe}
            pedidos={pedidosDoCliente(pedidos, clienteEmDetalhe.id)}
            onFechar={() => setClienteEmDetalhe(null)}
            onEditar={() => handleAbrirEdicaoCliente(clienteEmDetalhe)}
            onNavegarComo={() => void handleEntrarComoCliente(clienteEmDetalhe.id)}
            onAbrirPedido={(pedidoId) =>
              navegar('/curadoria/pedidos', { state: { pedidoId } satisfies EstadoPedidos })
            }
            onVerPedidos={() =>
              navegar('/curadoria/pedidos', {
                state: { busca: clienteEmDetalhe.nome } satisfies EstadoPedidos,
              })
            }
          />
        )}
      </Drawer>

      <CabecalhoPainel
        titulo="Clientes"
        resumo={
          carregandoClientes ? (
            <Skeleton height={12} width={150} />
          ) : (
            `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'} · ${inativos} ${inativos === 1 ? 'inativo' : 'inativos'}`
          )
        }
        acoes={
          <Button
            leftSection={<Add size={20} />}
            data-testid="btn-novo-cliente"
            onClick={handleAbrirNovoCliente}
          >
            Cadastrar cliente
          </Button>
        }
      />

      <div className={styles.barra}>
        <TextInput
          className={styles.busca}
          placeholder="Busque um cliente por nome"
          leftSection={<Search size={16} />}
          aria-label="Buscar cliente por nome"
          data-testid="filtro-nome"
          value={filtros.nome}
          onChange={(event) => handleAlterarFiltro('nome', event.currentTarget.value)}
        />
        <button
          type="button"
          className={styles.botaoFiltros}
          data-ativo={isFiltroAberto || qtdFiltrosAtivos > 0 || undefined}
          aria-expanded={isFiltroAberto}
          data-testid="btn-filtros"
          onClick={toggleFiltro}
        >
          <Filter size={16} />
          {qtdFiltrosAtivos > 0 ? `Filtros · ${qtdFiltrosAtivos}` : 'Filtros'}
        </button>
      </div>

      {isFiltroAberto && (
        <div className={styles.filtros}>
          <TextInput
            label="E-mail"
            placeholder="cliente@email.com"
            size="sm"
            data-testid="filtro-email"
            value={filtros.email}
            onChange={(event) => handleAlterarFiltro('email', event.currentTarget.value)}
          />
          <TextInput
            label="Telefone"
            placeholder="(11) 90000-0000"
            size="sm"
            data-testid="filtro-telefone"
            value={filtros.telefone}
            onChange={(event) => handleAlterarFiltro('telefone', event.currentTarget.value)}
          />
          <TextInput
            label="CPF"
            placeholder="000.000.000-00"
            size="sm"
            data-testid="filtro-cpf"
            value={filtros.cpf}
            onChange={(event) => handleAlterarFiltro('cpf', event.currentTarget.value)}
          />
          <TextInput
            label="Código"
            placeholder="CLI-000001"
            size="sm"
            data-testid="filtro-codigo"
            value={filtros.codigo}
            onChange={(event) => handleAlterarFiltro('codigo', event.currentTarget.value)}
          />
          <div className={styles.filtroLargo}>
            <span className={styles.rotulo}>Status</span>
            <SegmentedControl
              data-testid="filtro-status"
              value={filtros.status}
              onChange={(valor) => handleAlterarFiltro('status', valor as StatusFiltro)}
              data={[
                { label: 'Todos', value: 'todos' },
                { label: 'Ativos', value: 'ativos' },
                { label: 'Inativos', value: 'inativos' },
              ]}
            />
          </div>
          <div className={styles.filtroLargo}>
            <span className={styles.rotulo}>Ranking mínimo</span>
            {/* 1 aceita qualquer ranking: equivale a não filtrar */}
            <SegmentedControl
              data-testid="filtro-ranking"
              value={String(Math.max(1, filtros.rankingMinimo))}
              onChange={(valor) =>
                handleAlterarFiltro('rankingMinimo', Number(valor) === 1 ? 0 : Number(valor))
              }
              data={['1', '2', '3', '4', '5']}
            />
          </div>
          <div className={styles.filtrosRodape}>
            <Button
              variant="link"
              data-testid="btn-limpar-filtros"
              onClick={handleLimparFiltros}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      )}

      {erroLista.length > 0 && (
        <Alert color="red" data-testid="alerta-erro-lista">
          {erroLista.map((mensagem) => (
            <div key={mensagem}>{mensagem}</div>
          ))}
        </Alert>
      )}

      <div className={styles.tabela} data-atualizando={(atualizando && !carregando) || undefined}>
        <div className={styles.cabecalhoTabela} style={{ gridTemplateColumns: COLUNAS }}>
          <span>Código</span>
          <span>Cliente</span>
          <span>Telefone</span>
          <span>Ranking</span>
          <span>Status</span>
          <span className={styles.direita}>Ações</span>
        </div>
        {renderLinhas()}
      </div>
    </div>
  );
}

export default CuradoriaClientes;
