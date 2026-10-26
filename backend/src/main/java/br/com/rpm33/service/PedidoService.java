package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import br.com.rpm33.model.BandeiraCartao;
import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ComposicaoPagamento;
import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.CotacaoPedido;
import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.EnderecoEntrega;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.Estado;
import br.com.rpm33.model.ItemCarrinho;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.MovimentoEstoque;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.PagamentoCartao;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.PedidoFiltro;
import br.com.rpm33.model.ProcessamentoPagamentos;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.model.Troca;
import br.com.rpm33.model.ValidacaoPagamento;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.CupomRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.repository.StatusPedidoRepository;
import br.com.rpm33.repository.TrocaRepository;
import br.com.rpm33.repository.ValidacaoPagamentoRepository;
import jakarta.persistence.EntityManager;

/**
 * Criação do pedido (RF0033 a RF0038), validação do pagamento (RN0037, RN0038) e as
 * mudanças de status do administrador (RN0039, RN0040). A cotação do checkout e a
 * gravação passam pela mesma conferência; só a gravação escreve, e só depois de tudo
 * conferido, porque Resultado.erro não desfaz o que já tivesse sido gravado.
 */
@Service("Pedido")
public class PedidoService implements IService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
  private static final BigDecimal FRETE_POR_QUILO = new BigDecimal("8.00");

  /** RN0039 e RN0040: o único passo que o administrador dá a partir de cada status. */
  private static final Map<String, String> AVANCO_ADMINISTRADOR = Map.of(
      StatusPedido.APROVADA, StatusPedido.EM_TRANSPORTE,
      StatusPedido.EM_TRANSPORTE, StatusPedido.ENTREGUE);

  private final ClienteRepository clienteRepository;
  private final PedidoRepository pedidoRepository;
  private final StatusPedidoRepository statusPedidoRepository;
  private final CupomRepository cupomRepository;
  private final ValidacaoPagamentoRepository validacaoPagamentoRepository;
  private final TrocaRepository trocaRepository;
  private final RegrasEndereco regrasEndereco;
  private final RegrasCartao regrasCartao;
  private final IService estoque;
  private final IService pagamento;
  private final IService cupons;
  private final IService carrinho;
  private final RegistradorLog registradorLog;
  private final EntityManager entityManager;
  private final Duration esperaOperadora;

  public PedidoService(ClienteRepository clienteRepository, PedidoRepository pedidoRepository,
      StatusPedidoRepository statusPedidoRepository, CupomRepository cupomRepository,
      ValidacaoPagamentoRepository validacaoPagamentoRepository,
      TrocaRepository trocaRepository, RegrasEndereco regrasEndereco, RegrasCartao regrasCartao,
      @Qualifier("Estoque") IService estoque, @Qualifier("Pagamento") IService pagamento,
      @Qualifier("Cupom") IService cupons, @Qualifier("Carrinho") IService carrinho,
      RegistradorLog registradorLog, EntityManager entityManager,
      @Value("${app.validacao-pagamento.espera}") Duration esperaOperadora) {
    this.clienteRepository = clienteRepository;
    this.pedidoRepository = pedidoRepository;
    this.statusPedidoRepository = statusPedidoRepository;
    this.cupomRepository = cupomRepository;
    this.validacaoPagamentoRepository = validacaoPagamentoRepository;
    this.trocaRepository = trocaRepository;
    this.regrasEndereco = regrasEndereco;
    this.regrasCartao = regrasCartao;
    this.estoque = estoque;
    this.pagamento = pagamento;
    this.cupons = cupons;
    this.carrinho = carrinho;
    this.registradorLog = registradorLog;
    this.entityManager = entityManager;
    this.esperaOperadora = esperaOperadora;
  }

  /**
   * RF0033, RF0036 e RF0038: grava o pedido EM PROCESSAMENTO, já conferido por inteiro.
   * RN0044: a partir daqui é o pedido que reserva os itens, e o carrinho se esvazia deles.
   */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Pedido entrada = (Pedido) entidade;
    Conferencia conferencia = conferir(entrada);
    if (!conferencia.pendencias.isEmpty()) {
      return Resultado.erro(conferencia.pendencias);
    }
    StatusPedido emProcessamento = status(StatusPedido.EM_PROCESSAMENTO);
    Cliente cliente = conferencia.cliente;
    String usuario = cliente.getEmail();
    Endereco enderecoDoPedido = incorporarAoPerfil(entrada, conferencia, usuario);

    Pedido pedido = new Pedido();
    pedido.setCliente(cliente);
    pedido.setClienteId(cliente.getId());
    pedido.setEndereco(enderecoDoPedido);
    pedido.setEnderecoId(enderecoDoPedido == null ? null : enderecoDoPedido.getId());
    pedido.setStatus(emProcessamento);
    pedido.setSubtotal(conferencia.subtotal);
    pedido.setFrete(conferencia.frete);
    pedido.setTotal(conferencia.total);
    // RN0036: só o valor; o cupom sai na aprovação (CDU03 P8.2 e O13)
    pedido.setTroco(conferencia.composicao.getTroco());
    pedido.setEnderecoEntrega(fotografar(conferencia));
    for (ItemPedido conferido : conferencia.itens) {
      ItemPedido item = new ItemPedido();
      item.setPedido(pedido);
      item.setDisco(conferido.getDisco());
      item.setDiscoId(conferido.getDisco().getId());
      // o preço do momento da compra: reprecificar o disco depois não muda o pedido
      item.setPrecoUnitario(conferido.getDisco().getPrecoVenda());
      item.setQuantidade(conferido.getQuantidade());
      pedido.getItens().add(item);
    }
    for (PagamentoConferido conferido : conferencia.pagamentos) {
      PagamentoCartao pagamentoCartao = new PagamentoCartao();
      pagamentoCartao.setPedido(pedido);
      pagamentoCartao.setCartao(conferido.cartaoPerfil);
      pagamentoCartao.setCartaoId(
          conferido.cartaoPerfil == null ? null : conferido.cartaoPerfil.getId());
      pagamentoCartao.setBandeira(conferido.bandeira);
      pagamentoCartao.setNumero(conferido.numero);
      pagamentoCartao.setNomeImpresso(conferido.nomeImpresso);
      pagamentoCartao.setValor(conferido.entrada.getValor().setScale(2, RoundingMode.HALF_UP));
      pedido.getPagamentos().add(pagamentoCartao);
    }
    pedido.getCupons().addAll(conferencia.composicao.getCupons());
    pedidoRepository.save(pedido);

    for (Cupom usado : conferencia.composicao.getCupons()) {
      Cupom consumo = new Cupom();
      consumo.setId(usado.getId());
      consumo.setIsUtilizado(true);
      Resultado consumido = cupons.alterar(consumo);
      if (consumido.temErro()) {
        // outro pedido levou o cupom entre a conferência e a gravação: desfaz tudo
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        return consumido;
      }
    }
    for (ItemPedido item : pedido.getItens()) {
      ItemCarrinho comprado = new ItemCarrinho();
      comprado.setClienteId(cliente.getId());
      comprado.setDiscoId(item.getDiscoId());
      exigir(carrinho.excluir(comprado));
    }

    registradorLog.registrar(OperacaoLog.INSERIR, Pedido.class.getSimpleName(), pedido.getId(),
        dadosDoLog(pedido), usuario);
    return Resultado.com(pedido);
  }

  /**
   * RN0039 e RN0040: o administrador despacha a compra aprovada e confirma a entrega. Com
   * o pedido de processamento, a rotina da RN0037 roda na hora, sem esperar a operadora.
   */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    if (entidade instanceof ProcessamentoPagamentos) {
      return Resultado.de(processarPagamentos(null));
    }
    Pedido entrada = (Pedido) entidade;
    Pedido pedido =
        entrada.getId() == null ? null : pedidoRepository.findById(entrada.getId()).orElse(null);
    if (pedido == null) {
      return Resultado.erro("Pedido não encontrado.");
    }
    String atual = pedido.getStatus().getDescricao();
    String destino = entrada.getStatus() == null ? null : entrada.getStatus().getDescricao();
    if (destino == null || !destino.equals(AVANCO_ADMINISTRADOR.get(atual))) {
      return Resultado.erro(recusaDoAvanco(atual, destino));
    }

    pedido.setStatus(status(destino));
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("statusAnterior", atual);
    dados.put("status", destino);
    registradorLog.registrar(OperacaoLog.ALTERAR, Pedido.class.getSimpleName(), pedido.getId(),
        dados, RegistradorLog.CURADORIA);
    preencher(List.of(pedido));
    return Resultado.com(pedido);
  }

  /** A cotação do checkout, a confirmação pelo id, Meus pedidos e a curadoria. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof CotacaoPedido cotacao) {
      return cotar(cotacao);
    }
    if (entidade instanceof PedidoFiltro filtro) {
      List<Pedido> pedidos = filtro.getClienteId() == null
          ? pedidoRepository.findAllByOrderByDataCadastroDescIdDesc()
          : pedidoRepository.findByClienteIdOrderByDataCadastroDescIdDesc(filtro.getClienteId());
      preencher(pedidos);
      return Resultado.de(pedidos);
    }
    Pedido pedido = (Pedido) entidade;
    Pedido encontrado =
        pedido.getId() == null ? null : pedidoRepository.findById(pedido.getId()).orElse(null);
    if (encontrado == null) {
      return Resultado.erro("Pedido não encontrado.");
    }
    preencher(List.of(encontrado));
    return Resultado.com(encontrado);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("O pedido não é excluído: aprovado ou não, ele fica no histórico.");
  }

  /** RN0037 e RN0038: a operadora simulada responde aos pedidos que já esperaram o bastante. */
  @Scheduled(fixedDelayString = "${app.validacao-pagamento.intervalo}")
  @Transactional
  public void validarPagamentosPendentes() {
    processarPagamentos(LocalDateTime.now().minus(esperaOperadora));
  }

  // ------------------------------------------------------------------
  // Validação do pagamento e status
  // ------------------------------------------------------------------

  /**
   * Sem limite, todos os pendentes. A data do pedido vem do relógio do banco, então
   * comparar com o da aplicação deixaria de fora o pedido gravado há um instante.
   */
  private List<Pedido> processarPagamentos(LocalDateTime feitosAte) {
    List<Pedido> pendentes = feitosAte == null
        ? pedidoRepository.findByStatusDescricaoOrderByIdAsc(StatusPedido.EM_PROCESSAMENTO)
        : pedidoRepository.findByStatusDescricaoAndDataCadastroLessThanEqualOrderByIdAsc(
            StatusPedido.EM_PROCESSAMENTO, feitosAte);
    if (pendentes.isEmpty()) {
      return pendentes;
    }
    StatusPedido aprovada = status(StatusPedido.APROVADA);
    StatusPedido reprovada = status(StatusPedido.REPROVADA);
    for (Pedido pedido : pendentes) {
      validarPagamento(pedido, aprovada, reprovada);
    }
    preencher(pendentes);
    return pendentes;
  }

  /**
   * RN0037: cupons e operadora, pelo PagamentoService. RN0038: APROVADA ou REPROVADA.
   * RF0053, RN0028 e RN0036 (CDU03 P8.2): só a aprovada baixa o estoque e emite o cupom
   * da diferença; na reprovada, sair de EM PROCESSAMENTO já desbloqueia os itens, que
   * nunca saíram do estoque, e os cupons voltam ao cliente, porque a compra não aconteceu.
   */
  private void validarPagamento(Pedido pedido, StatusPedido aprovada, StatusPedido reprovada) {
    ValidacaoPagamento validacao = new ValidacaoPagamento();
    validacao.setPedido(pedido);
    validacao.setPedidoId(pedido.getId());
    exigir(pagamento.consultar(validacao));
    validacaoPagamentoRepository.save(validacao);

    boolean aprovado = Boolean.TRUE.equals(validacao.getAprovado());
    pedido.setStatus(aprovado ? aprovada : reprovada);
    pedido.setValidacao(validacao);
    String origem = "Pedido " + pedido.getId();
    if (aprovado) {
      exigir(estoque.alterar(MovimentoEstoque.de(MovimentoEstoque.BAIXA,
          new ArrayList<>(pedido.getItens()), origem, RegistradorLog.ROTINA_AUTOMATICA)));
      pedido.setCupomGerado(gerarCupomDeTroca(pedido));
    } else {
      for (Cupom usado : pedido.getCupons()) {
        Cupom devolvido = new Cupom();
        devolvido.setId(usado.getId());
        devolvido.setIsUtilizado(false);
        exigir(cupons.alterar(devolvido));
      }
    }

    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("statusAnterior", StatusPedido.EM_PROCESSAMENTO);
    dados.put("status", pedido.getStatus().getDescricao());
    if (!aprovado) {
      dados.put("motivo", validacao.getMotivo());
    }
    if (pedido.getCupomGerado() != null) {
      dados.put("cupomGerado", pedido.getCupomGerado().getCodigo());
    }
    registradorLog.registrar(OperacaoLog.ALTERAR, Pedido.class.getSimpleName(), pedido.getId(),
        dados, RegistradorLog.ROTINA_AUTOMATICA);
  }

  private static String recusaDoAvanco(String atual, String destino) {
    if (StatusPedido.EM_TRANSPORTE.equals(destino)) {
      return "RN0039: só compras APROVADA seguem para EM TRANSPORTE; esta está " + atual + ".";
    }
    if (StatusPedido.ENTREGUE.equals(destino)) {
      return "RN0040: só compras EM TRANSPORTE podem ser entregues; esta está " + atual + ".";
    }
    return "O administrador só despacha compras APROVADA e confirma a entrega das que estão "
        + "EM TRANSPORTE.";
  }

  private StatusPedido status(String descricao) {
    return statusPedidoRepository.findByDescricao(descricao).orElseThrow(
        () -> new IllegalStateException("Status " + descricao + " ausente. Rode db/seed.sql."));
  }

  // ------------------------------------------------------------------
  // Conferência (a mesma para a cotação e para a gravação)
  // ------------------------------------------------------------------

  /** Tudo o que a conferência resolveu: a cotação devolve, a gravação aproveita. */
  private static final class Conferencia {
    private final List<String> pendencias = new ArrayList<>();
    private Cliente cliente;
    private List<ItemPedido> itens = List.of();
    private BigDecimal subtotal = ZERO;
    private int pesoTotal;
    private Endereco enderecoPerfil;
    private Endereco enderecoNovo;
    private String cidade;
    private String uf;
    private Regiao regiao;
    private BigDecimal frete = ZERO;
    private BigDecimal total = ZERO;
    private final List<PagamentoConferido> pagamentos = new ArrayList<>();
    private ComposicaoPagamento composicao;
  }

  /** Um pagamento com o cartão já resolvido: do perfil ou digitado no checkout. */
  private static final class PagamentoConferido {
    private final PagamentoCartao entrada;
    private Cartao cartaoPerfil;
    private Cartao cartaoNovo;
    private BandeiraCartao bandeira;
    private String numero;
    private String nomeImpresso;

    private PagamentoConferido(PagamentoCartao entrada) {
      this.entrada = entrada;
    }
  }

  private Conferencia conferir(Pedido entrada) {
    Conferencia conferencia = new Conferencia();
    conferirItens(entrada, conferencia);

    conferencia.cliente = entrada.getClienteId() == null ? null
        : clienteRepository.findById(entrada.getClienteId()).orElse(null);
    if (conferencia.cliente == null) {
      conferencia.pendencias.add("Cliente não encontrado.");
      conferencia.total = conferencia.subtotal;
      return conferencia;
    }
    if (Boolean.FALSE.equals(conferencia.cliente.getIsAtivo())) {
      conferencia.pendencias.add("Cadastro inativo. Procure a curadoria.");
    }

    conferirEndereco(entrada, conferencia);
    calcularFrete(conferencia);
    conferencia.total = conferencia.subtotal.add(conferencia.frete);
    conferirCartoes(entrada, conferencia);
    // sem itens ou sem destino o total ainda não fecha, e já há pendência explicando:
    // compor o pagamento contra ele só acrescentaria mensagens enganosas
    if (!conferencia.itens.isEmpty() && conferencia.regiao != null) {
      comporPagamento(entrada, conferencia);
    }
    return conferencia;
  }

  /**
   * RN0031 e RN0044 (fig11 1.1.1.1.1), pelo EstoqueService; o subtotal usa o preço atual
   * do banco. O carrinho do próprio cliente não conta contra a compra dele.
   */
  private void conferirItens(Pedido entrada, Conferencia conferencia) {
    ConsultaDisponibilidade consulta = new ConsultaDisponibilidade();
    consulta.setClienteId(entrada.getClienteId());
    consulta.setItens(new ArrayList<>(naoNulo(entrada.getItens())));
    conferencia.pendencias.addAll(estoque.consultar(consulta).getMensagens());

    conferencia.itens = consulta.getItens().stream().filter(item -> item.getDisco() != null)
        .toList();
    for (ItemPedido item : conferencia.itens) {
      BigDecimal quantidade = BigDecimal.valueOf(item.getQuantidade());
      conferencia.subtotal =
          conferencia.subtotal.add(item.getDisco().getPrecoVenda().multiply(quantidade));
      conferencia.pesoTotal += item.getDisco().getPeso() * item.getQuantidade();
    }
  }

  /** RF0035, RN0022 e RN0023: um endereço do perfil que atenda entrega, ou um novo completo. */
  private void conferirEndereco(Pedido entrada, Conferencia conferencia) {
    Endereco novo = entrada.getEnderecoNovo();
    if (entrada.getEnderecoId() != null && novo != null) {
      conferencia.pendencias.add(
          "Escolha um endereço do perfil ou informe um novo, não os dois (RF0035).");
      return;
    }
    if (entrada.getEnderecoId() != null) {
      Endereco endereco = conferencia.cliente.getEnderecos().stream()
          .filter(doPerfil -> doPerfil.getId().equals(entrada.getEnderecoId()))
          .findFirst().orElse(null);
      if (endereco == null) {
        conferencia.pendencias.add("O endereço escolhido não é do cliente.");
      } else if (!endereco.atende(Endereco.ENTREGA)) {
        conferencia.pendencias.add("O endereço escolhido não é de entrega (RN0022).");
      } else {
        conferencia.enderecoPerfil = endereco;
        conferencia.cidade = endereco.getCidade().getDesc();
        conferencia.uf = endereco.getCidade().getEstado().getDesc();
      }
      return;
    }
    if (novo == null) {
      conferencia.pendencias.add("Escolha um endereço de entrega (RF0035).");
      return;
    }

    if (vazio(novo.getTipo())) {
      novo.setTipo(Endereco.ENTREGA);
    }
    novo.setCep(apenasDigitos(novo.getCep()));
    List<String> erros = regrasEndereco.validar(novo);
    if (erros.isEmpty() && !novo.atende(Endereco.ENTREGA)) {
      erros.add("O endereço escolhido não é de entrega (RN0022).");
    }
    Estado estado = erros.isEmpty() ? regrasEndereco.resolverEstado(novo.getCidade(), erros) : null;
    conferencia.pendencias.addAll(erros);
    if (estado != null) {
      conferencia.enderecoNovo = novo;
      conferencia.cidade = novo.getCidade().getDesc().trim();
      conferencia.uf = estado.getDesc();
    }
  }

  /** RF0034 (D6, fig11 1.1.1.1.2): tarifa da região mais R$ 8,00 por quilo iniciado. */
  private void calcularFrete(Conferencia conferencia) {
    conferencia.regiao = conferencia.uf == null ? null : Regiao.da(conferencia.uf);
    if (conferencia.regiao == null || conferencia.itens.isEmpty()) {
      return;
    }
    int quilos = (conferencia.pesoTotal + 999) / 1000;
    conferencia.frete =
        conferencia.regiao.tarifa.add(FRETE_POR_QUILO.multiply(BigDecimal.valueOf(quilos)));
  }

  /** RN0024 e RN0025: cartão do perfil do próprio cliente ou um novo completo, sem repetir. */
  private void conferirCartoes(Pedido entrada, Conferencia conferencia) {
    Set<String> numeros = new HashSet<>();
    boolean repetido = false;
    for (PagamentoCartao pagamentoCartao : naoNulo(entrada.getPagamentos())) {
      PagamentoConferido conferido = new PagamentoConferido(pagamentoCartao);
      if (pagamentoCartao.getCartaoId() != null) {
        Cartao cartao = conferencia.cliente.getCartoes().stream()
            .filter(doPerfil -> doPerfil.getId().equals(pagamentoCartao.getCartaoId()))
            .findFirst().orElse(null);
        if (cartao == null) {
          conferencia.pendencias.add("O cartão escolhido não é do cliente.");
          continue;
        }
        conferido.cartaoPerfil = cartao;
        conferido.bandeira = cartao.getBandeira();
        conferido.numero = cartao.getNumero();
        conferido.nomeImpresso = cartao.getNomeImpresso();
      } else if (pagamentoCartao.getCartaoNovo() != null) {
        Cartao novo = pagamentoCartao.getCartaoNovo();
        novo.setNumero(apenasDigitos(novo.getNumero()));
        novo.setCodigoSeguranca(apenasDigitos(novo.getCodigoSeguranca()));
        List<String> erros = regrasCartao.validarCartoes(List.of(novo));
        BandeiraCartao bandeira =
            erros.isEmpty() ? regrasCartao.resolverBandeira(novo.getBandeira(), erros) : null;
        conferencia.pendencias.addAll(erros);
        if (bandeira == null) {
          continue;
        }
        conferido.cartaoNovo = novo;
        conferido.bandeira = bandeira;
        conferido.numero = novo.getNumero();
        conferido.nomeImpresso = novo.getNomeImpresso().trim();
      } else {
        conferencia.pendencias.add("Escolha o cartão de cada pagamento.");
        continue;
      }
      repetido = repetido || !numeros.add(conferido.numero);
      conferencia.pagamentos.add(conferido);
    }
    if (repetido) {
      conferencia.pendencias.add("O mesmo cartão foi escolhido duas vezes.");
    }
  }

  /** RN0033 a RN0036 (fig11 1.1.1.1.3), pelo PagamentoService. */
  private void comporPagamento(Pedido entrada, Conferencia conferencia) {
    ComposicaoPagamento composicao = new ComposicaoPagamento();
    composicao.setClienteId(conferencia.cliente.getId());
    composicao.setTotal(conferencia.total);
    composicao.setCupons(new ArrayList<>(naoNulo(entrada.getCupons())));
    // todos os valores entram na conta, inclusive os de cartão recusado: a soma precisa
    // refletir o que o cliente digitou, não só o que passou
    composicao.setPagamentos(new ArrayList<>(naoNulo(entrada.getPagamentos())));
    conferencia.pendencias.addAll(pagamento.consultar(composicao).getMensagens());
    conferencia.composicao = composicao;
  }

  private Resultado cotar(CotacaoPedido cotacao) {
    Conferencia conferencia = conferir(cotacao.getPedido());
    ComposicaoPagamento composicao = conferencia.composicao;
    cotacao.setSubtotal(conferencia.subtotal);
    cotacao.setPesoTotal(conferencia.pesoTotal);
    cotacao.setRegiao(conferencia.regiao == null ? null : conferencia.regiao.nome);
    cotacao.setFrete(conferencia.frete);
    cotacao.setTotal(conferencia.total);
    cotacao.setValorCupons(composicao == null ? ZERO : composicao.getValorCupons());
    cotacao.setRestante(composicao == null ? conferencia.total : composicao.getRestante());
    cotacao.setTroco(composicao == null ? ZERO : composicao.getTroco());
    cotacao.setPendencias(conferencia.pendencias);
    return Resultado.com(cotacao);
  }

  // ------------------------------------------------------------------
  // Gravação
  // ------------------------------------------------------------------

  /** RF0036: endereço e cartões novos marcados para o perfil entram por acréscimo. */
  private Endereco incorporarAoPerfil(Pedido entrada, Conferencia conferencia, String usuario) {
    Cliente cliente = conferencia.cliente;
    boolean alterado = false;
    Endereco enderecoDoPedido = conferencia.enderecoPerfil;
    if (conferencia.enderecoNovo != null
        && Boolean.TRUE.equals(entrada.getSalvarEnderecoNoPerfil())) {
      enderecoDoPedido = novoEnderecoDoPerfil(conferencia.enderecoNovo, cliente);
      cliente.getEnderecos().add(enderecoDoPedido);
      alterado = true;
    }
    for (PagamentoConferido conferido : conferencia.pagamentos) {
      if (conferido.cartaoNovo == null
          || !Boolean.TRUE.equals(conferido.entrada.getSalvarNoPerfil())) {
        continue;
      }
      Cartao cartao = new Cartao();
      cartao.setCliente(cliente);
      cartao.setNumero(conferido.numero);
      cartao.setNomeImpresso(conferido.nomeImpresso);
      cartao.setCodigoSeguranca(conferido.cartaoNovo.getCodigoSeguranca());
      cartao.setBandeira(conferido.bandeira);
      // RF0027: o incorporado só vira preferencial para quem ainda não tinha cartão
      cartao.setIsPreferencial(cliente.getCartoes().isEmpty());
      cliente.getCartoes().add(cartao);
      conferido.cartaoPerfil = cartao;
      alterado = true;
    }
    if (alterado) {
      entityManager.flush();
      registradorLog.registrar(OperacaoLog.ALTERAR, cliente, usuario);
    }
    return enderecoDoPedido;
  }

  private Endereco novoEnderecoDoPerfil(Endereco origem, Cliente cliente) {
    List<String> erros = new ArrayList<>();
    Endereco endereco = new Endereco();
    endereco.setCliente(cliente);
    endereco.setNome(origem.getNome().trim());
    endereco.setTipo(origem.getTipo());
    endereco.setTipoResidencia(origem.getTipoResidencia());
    endereco.setTipoLogradouro(origem.getTipoLogradouro());
    endereco.setLogradouro(origem.getLogradouro().trim());
    endereco.setNumero(origem.getNumero().trim());
    endereco.setBairro(origem.getBairro().trim());
    endereco.setCep(origem.getCep());
    endereco.setPais(origem.getPais().trim());
    endereco.setObservacoes(vazio(origem.getObservacoes()) ? null : origem.getObservacoes());
    endereco.setCidade(regrasEndereco.resolverCidade(origem.getCidade(), erros));
    if (!erros.isEmpty()) {
      throw new IllegalStateException(String.join(" ", erros));
    }
    return endereco;
  }

  /** RF0035 e RN0023: o endereço de entrega como estava no momento da compra. */
  private EnderecoEntrega fotografar(Conferencia conferencia) {
    Endereco origem = conferencia.enderecoPerfil != null ? conferencia.enderecoPerfil
        : conferencia.enderecoNovo;
    EnderecoEntrega entrega = new EnderecoEntrega();
    entrega.setNome(origem.getNome().trim());
    entrega.setTipoResidencia(origem.getTipoResidencia());
    entrega.setTipoLogradouro(origem.getTipoLogradouro());
    entrega.setLogradouro(origem.getLogradouro().trim());
    entrega.setNumero(origem.getNumero().trim());
    entrega.setBairro(origem.getBairro().trim());
    entrega.setCep(origem.getCep());
    entrega.setCidade(conferencia.cidade);
    entrega.setUf(conferencia.uf);
    entrega.setPais(origem.getPais().trim());
    entrega.setObservacoes(vazio(origem.getObservacoes()) ? null : origem.getObservacoes());
    return entrega;
  }

  /** RN0036: o que os cupons passaram do total volta ao cliente como cupom de troca. */
  private Cupom gerarCupomDeTroca(Pedido pedido) {
    if (pedido.getTroco().signum() == 0) {
      return null;
    }
    TipoCupom troca = new TipoCupom();
    troca.setDesc(TipoCupom.TROCA);
    Cupom cupom = new Cupom();
    cupom.setCliente(pedido.getCliente());
    cupom.setTipo(troca);
    cupom.setCodigo("TROCA-P%06d".formatted(pedido.getId()));
    cupom.setValor(pedido.getTroco());
    cupom.setPedidoOrigemId(pedido.getId());
    return (Cupom) exigir(cupons.salvar(cupom)).primeira();
  }

  private Map<String, Object> dadosDoLog(Pedido pedido) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("status", pedido.getStatus().getDescricao());
    dados.put("itens", pedido.getItens().stream()
        .map(item -> Map.of("discoId", item.getDiscoId(), "titulo", item.getTitulo(),
            "quantidade", item.getQuantidade(), "precoUnitario", item.getPrecoUnitario()))
        .toList());
    dados.put("subtotal", pedido.getSubtotal());
    dados.put("frete", pedido.getFrete());
    dados.put("total", pedido.getTotal());
    dados.put("pagamentos", pedido.getPagamentos().stream()
        .map(pago -> Map.of("bandeira", pago.getBandeira().getDesc(),
            "finalNumero", pago.getFinalNumero(), "valor", pago.getValor()))
        .toList());
    dados.put("cupons", pedido.getCupons().stream().map(Cupom::getCodigo).toList());
    dados.put("troco", pedido.getTroco());
    EnderecoEntrega entrega = pedido.getEnderecoEntrega();
    dados.put("endereco", entrega.getTipoLogradouro() + " " + entrega.getLogradouro() + ", "
        + entrega.getNumero() + " — " + entrega.getCidade() + "/" + entrega.getUf());
    return dados;
  }

  /** O cupom da RN0036, a validação da RN0037 e as trocas da RF0041 de cada pedido. */
  private void preencher(List<Pedido> pedidos) {
    if (pedidos.isEmpty()) {
      return;
    }
    List<Long> ids = pedidos.stream().map(Pedido::getId).toList();
    Map<Long, Cupom> cuponsGerados = cupomRepository.findByPedidoOrigemIdIn(ids).stream()
        .collect(Collectors.toMap(Cupom::getPedidoOrigemId, Function.identity()));
    Map<Long, ValidacaoPagamento> validacoes = validacaoPagamentoRepository.findByPedidoIdIn(ids)
        .stream().collect(Collectors.toMap(ValidacaoPagamento::getPedidoId, Function.identity()));
    List<Troca> trocas = trocaRepository.findByPedidoIdInOrderByIdAsc(ids);
    Map<Long, Cupom> cuponsDasTrocas = trocas.isEmpty() ? Map.of()
        : cupomRepository.findByTrocaOrigemIdIn(trocas.stream().map(Troca::getId).toList())
            .stream().collect(Collectors.toMap(Cupom::getTrocaOrigemId, Function.identity()));
    Map<Long, List<Troca>> trocasPorPedido =
        trocas.stream().collect(Collectors.groupingBy(Troca::getPedidoId));

    for (Pedido pedido : pedidos) {
      pedido.setCupomGerado(cuponsGerados.get(pedido.getId()));
      if (pedido.getValidacao() == null) {
        pedido.setValidacao(validacoes.get(pedido.getId()));
      }
      List<Troca> daCompra = trocasPorPedido.getOrDefault(pedido.getId(), List.of());
      daCompra.forEach(troca -> {
        troca.setClienteId(pedido.getClienteId());
        troca.setCupomGerado(cuponsDasTrocas.get(troca.getId()));
      });
      pedido.setTrocas(daCompra);
    }
  }

  /** As escritas internas já foram conferidas; uma recusa aqui é defeito, não regra. */
  private static Resultado exigir(Resultado resultado) {
    if (resultado.temErro()) {
      throw new IllegalStateException(String.join(" ", resultado.getMensagens()));
    }
    return resultado;
  }

  private static <T> Collection<T> naoNulo(Collection<T> colecao) {
    return colecao == null ? List.of() : colecao;
  }

  private static String apenasDigitos(String valor) {
    return valor == null ? null : valor.replaceAll("\\D", "");
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }

  /** RF0034 (D6): a tarifa-base sai da região da UF de destino. */
  private enum Regiao {
    SUDESTE("Sudeste", "20.00", "SP", "RJ", "MG", "ES"),
    SUL("Sul", "25.00", "PR", "SC", "RS"),
    CENTRO_OESTE("Centro-Oeste", "30.00", "DF", "GO", "MT", "MS"),
    NORDESTE("Nordeste", "35.00", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"),
    NORTE("Norte", "45.00", "AM", "PA", "AC", "RO", "RR", "AP", "TO");

    private final String nome;
    private final BigDecimal tarifa;
    private final Set<String> ufs;

    Regiao(String nome, String tarifa, String... ufs) {
      this.nome = nome;
      this.tarifa = new BigDecimal(tarifa);
      this.ufs = Set.of(ufs);
    }

    private static Regiao da(String uf) {
      for (Regiao regiao : values()) {
        if (regiao.ufs.contains(uf.trim().toUpperCase())) {
          return regiao;
        }
      }
      return null;
    }
  }
}
