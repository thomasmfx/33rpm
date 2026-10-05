package br.com.rpm33.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.PagamentoCartao;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.PedidoFiltro;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.CupomRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.repository.StatusPedidoRepository;
import jakarta.persistence.EntityManager;

/**
 * Criação do pedido (RF0033 a RF0038). A cotação do checkout e a gravação passam pela
 * mesma conferência; só a gravação escreve, e só depois de tudo conferido, porque
 * Resultado.erro não desfaz o que já tivesse sido gravado.
 */
@Service("Pedido")
public class PedidoService implements IService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
  private static final BigDecimal FRETE_POR_QUILO = new BigDecimal("8.00");

  private final ClienteRepository clienteRepository;
  private final PedidoRepository pedidoRepository;
  private final StatusPedidoRepository statusPedidoRepository;
  private final CupomRepository cupomRepository;
  private final RegrasEndereco regrasEndereco;
  private final RegrasCartao regrasCartao;
  private final IService estoque;
  private final IService pagamento;
  private final IService cupons;
  private final RegistradorLog registradorLog;
  private final EntityManager entityManager;

  public PedidoService(ClienteRepository clienteRepository, PedidoRepository pedidoRepository,
      StatusPedidoRepository statusPedidoRepository, CupomRepository cupomRepository,
      RegrasEndereco regrasEndereco, RegrasCartao regrasCartao,
      @Qualifier("Estoque") IService estoque, @Qualifier("Pagamento") IService pagamento,
      @Qualifier("Cupom") IService cupons, RegistradorLog registradorLog,
      EntityManager entityManager) {
    this.clienteRepository = clienteRepository;
    this.pedidoRepository = pedidoRepository;
    this.statusPedidoRepository = statusPedidoRepository;
    this.cupomRepository = cupomRepository;
    this.regrasEndereco = regrasEndereco;
    this.regrasCartao = regrasCartao;
    this.estoque = estoque;
    this.pagamento = pagamento;
    this.cupons = cupons;
    this.registradorLog = registradorLog;
    this.entityManager = entityManager;
  }

  /** RF0033, RF0036 e RF0038: grava o pedido EM PROCESSAMENTO, já conferido por inteiro. */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Pedido entrada = (Pedido) entidade;
    Conferencia conferencia = conferir(entrada);
    if (!conferencia.pendencias.isEmpty()) {
      return Resultado.erro(conferencia.pendencias);
    }
    StatusPedido emProcessamento = statusPedidoRepository
        .findByDescricao(StatusPedido.EM_PROCESSAMENTO)
        .orElseThrow(() -> new IllegalStateException(
            "Status EM PROCESSAMENTO ausente. Rode db/seed.sql."));
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
    Cupom cupomGerado = gerarCupomDeTroca(conferencia, pedido);

    registradorLog.registrar(OperacaoLog.INSERIR, Pedido.class.getSimpleName(), pedido.getId(),
        dadosDoLog(pedido, cupomGerado), usuario);
    pedido.setCupomGerado(cupomGerado);
    return Resultado.com(pedido);
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return Resultado.erro("O pedido só é criado e consultado nesta fase.");
  }

  /** A cotação do checkout, a confirmação pelo id e Meus pedidos pelo cliente. */
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
      preencherCuponsGerados(pedidos);
      return Resultado.de(pedidos);
    }
    Pedido pedido = (Pedido) entidade;
    Pedido encontrado =
        pedido.getId() == null ? null : pedidoRepository.findById(pedido.getId()).orElse(null);
    if (encontrado == null) {
      return Resultado.erro("Pedido não encontrado.");
    }
    preencherCuponsGerados(List.of(encontrado));
    return Resultado.com(encontrado);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("O pedido só é criado e consultado nesta fase.");
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

  /** RN0031 (fig11 1.1.1.1.1), pelo EstoqueService; o subtotal usa o preço atual do banco. */
  private void conferirItens(Pedido entrada, Conferencia conferencia) {
    ConsultaDisponibilidade consulta = new ConsultaDisponibilidade();
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
  private Cupom gerarCupomDeTroca(Conferencia conferencia, Pedido pedido) {
    BigDecimal troco = conferencia.composicao.getTroco();
    if (troco.signum() == 0) {
      return null;
    }
    TipoCupom troca = new TipoCupom();
    troca.setDesc(TipoCupom.TROCA);
    Cupom cupom = new Cupom();
    cupom.setCliente(conferencia.cliente);
    cupom.setTipo(troca);
    cupom.setCodigo("TROCA-P%06d".formatted(pedido.getId()));
    cupom.setValor(troco);
    cupom.setPedidoOrigemId(pedido.getId());
    return (Cupom) exigir(cupons.salvar(cupom)).primeira();
  }

  private Map<String, Object> dadosDoLog(Pedido pedido, Cupom cupomGerado) {
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
    if (cupomGerado != null) {
      dados.put("cupomGerado", cupomGerado.getCodigo());
    }
    EnderecoEntrega entrega = pedido.getEnderecoEntrega();
    dados.put("endereco", entrega.getTipoLogradouro() + " " + entrega.getLogradouro() + ", "
        + entrega.getNumero() + " — " + entrega.getCidade() + "/" + entrega.getUf());
    return dados;
  }

  private void preencherCuponsGerados(List<Pedido> pedidos) {
    if (pedidos.isEmpty()) {
      return;
    }
    Map<Long, Cupom> porPedido = cupomRepository
        .findByPedidoOrigemIdIn(pedidos.stream().map(Pedido::getId).toList()).stream()
        .collect(Collectors.toMap(Cupom::getPedidoOrigemId, Function.identity()));
    pedidos.forEach(pedido -> pedido.setCupomGerado(porPedido.get(pedido.getId())));
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
