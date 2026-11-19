package br.com.rpm33.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Carrinho;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.ItemCarrinho;
import br.com.rpm33.model.ItemPedido;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.ItemCarrinhoRepository;

/**
 * Carrinho no servidor (RF0031, RF0032). Cada item bloqueia o estoque do disco (RN0044)
 * até a compra ou o fim do prazo, contado da última inclusão do cliente. Vencido o prazo,
 * todos os itens saem juntos (RN0045) e ficam à vista até o cliente incluí-los de novo ou
 * dispensá-los (RNF0042). Toda operação começa derrubando o carrinho vencido, então a
 * rotina agendada não precisa ter passado para o cliente ver o carrinho certo.
 */
@Service
public class CarrinhoService {

  private final ItemCarrinhoRepository itemCarrinhoRepository;
  private final ClienteRepository clienteRepository;
  private final EstoqueService estoqueService;
  private final RegistradorLog registradorLog;
  private final int prazoMinutos;
  private final int avisoMinutos;

  public CarrinhoService(ItemCarrinhoRepository itemCarrinhoRepository,
      ClienteRepository clienteRepository, EstoqueService estoqueService,
      RegistradorLog registradorLog, @Value("${app.carrinho.prazo-minutos}") int prazoMinutos,
      @Value("${app.carrinho.aviso-minutos}") int avisoMinutos) {
    this.itemCarrinhoRepository = itemCarrinhoRepository;
    this.clienteRepository = clienteRepository;
    this.estoqueService = estoqueService;
    this.registradorLog = registradorLog;
    this.prazoMinutos = prazoMinutos;
    this.avisoMinutos = avisoMinutos;
  }

  /** RF0031, RF0032, RN0031 e RN0044: soma ao que já está no carrinho e renova o prazo. */
  @Transactional
  public Carrinho incluir(ItemCarrinho entrada) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(entrada.getClienteId(), erros);
    conferirItem(entrada, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    expirar(cliente);

    ItemCarrinho atual = itemCarrinhoRepository
        .findByClienteIdAndDiscoId(cliente.getId(), entrada.getDiscoId()).orElse(null);
    // RNF0042: incluir de novo um item expirado recomeça a quantidade, não soma a ela
    boolean noCarrinho = atual != null && !Boolean.TRUE.equals(atual.getIsExpirado());
    int total = entrada.getQuantidade() + (noCarrinho ? atual.getQuantidade() : 0);
    List<String> recusa = disponibilidade(cliente.getId(), entrada.getDiscoId(), total);
    if (!recusa.isEmpty()) {
      throw new RegraNegocioException(recusa);
    }

    ItemCarrinho item = atual == null ? new ItemCarrinho() : atual;
    item.setClienteId(cliente.getId());
    item.setDiscoId(entrada.getDiscoId());
    item.setQuantidade(total);
    item.setIsExpirado(false);
    item.setDataInclusao(LocalDateTime.now());
    itemCarrinhoRepository.save(item);
    registrar(atual == null ? OperacaoLog.INSERIR : OperacaoLog.ALTERAR, item, cliente.getEmail());
    return montar(cliente.getId());
  }

  /**
   * RF0032: a quantidade nova de um item. RN0044 (CDU03 A1.3 e O11): aumentar é incluir
   * itens, então o acréscimo fica bloqueado e o prazo recomeça; reduzir não renova.
   */
  @Transactional
  public Carrinho alterarQuantidade(ItemCarrinho entrada) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(entrada.getClienteId(), erros);
    conferirItem(entrada, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    expirar(cliente);

    ItemCarrinho atual = itemCarrinhoRepository
        .findByClienteIdAndDiscoId(cliente.getId(), entrada.getDiscoId())
        .filter(item -> !Boolean.TRUE.equals(item.getIsExpirado())).orElse(null);
    if (atual == null) {
      throw new RegraNegocioException("O disco não está no carrinho.");
    }
    List<String> recusa =
        disponibilidade(cliente.getId(), entrada.getDiscoId(), entrada.getQuantidade());
    if (!recusa.isEmpty()) {
      throw new RegraNegocioException(recusa);
    }
    if (entrada.getQuantidade() > atual.getQuantidade()) {
      atual.setDataInclusao(LocalDateTime.now());
    }
    atual.setQuantidade(entrada.getQuantidade());
    registrar(OperacaoLog.ALTERAR, atual, cliente.getEmail());
    return montar(cliente.getId());
  }

  /** O carrinho como está; o prazo vencido derruba os itens antes de montar. */
  @Transactional
  public Carrinho consultar(Long clienteId) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(clienteId, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    expirar(cliente);
    return montar(cliente.getId());
  }

  /**
   * RF0031: tira um disco. Tirar o que já não está lá não é erro: a compra também limpa o
   * carrinho.
   */
  @Transactional
  public Carrinho remover(Long clienteId, Long discoId) {
    return excluir(clienteId, item -> Objects.equals(item.getDiscoId(), discoId));
  }

  /** RF0031: esvazia o carrinho. */
  @Transactional
  public Carrinho esvaziar(Long clienteId) {
    return excluir(clienteId, item -> true);
  }

  /** RNF0042: dispensa os itens que caíram pelo prazo. */
  @Transactional
  public Carrinho descartarExpirados(Long clienteId) {
    return excluir(clienteId, item -> Boolean.TRUE.equals(item.getIsExpirado()));
  }

  /**
   * RN0032: entre a inclusão e a compra o estoque livre pode ter mudado (disco inativado,
   * bloqueio de outro cliente depois de um prazo vencido). Reduz o que passou do livre,
   * tira o que zerou e devolve o que mudou para a tela avisar.
   */
  @Transactional
  public Carrinho revalidar(Long clienteId) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(clienteId, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    expirar(cliente);
    List<ItemCarrinho> ativos = ativos(cliente.getId());
    List<String> ajustes = new ArrayList<>();
    if (!ativos.isEmpty()) {
      ConsultaDisponibilidade consulta = consulta(cliente.getId(), ativos.stream()
          .map(item -> itemPedido(item.getDiscoId(), item.getQuantidade())).toList());
      estoqueService.conferirDisponibilidade(consulta);
      for (ItemCarrinho item : ativos) {
        ajustar(item, consulta, ajustes, cliente.getEmail());
      }
    }
    Carrinho carrinho = montar(cliente.getId());
    carrinho.setAjustes(ajustes);
    return carrinho;
  }

  /** RN0044 e RN0045: a rotina que desbloqueia os carrinhos com o prazo vencido. */
  @Scheduled(fixedDelayString = "${app.carrinho.intervalo-expiracao}")
  @Transactional
  public void expirarCarrinhosVencidos() {
    for (Long clienteId : itemCarrinhoRepository.clientesComPrazoVencido(limite())) {
      clienteRepository.findById(clienteId).ifPresent(this::expirar);
    }
  }

  private Carrinho excluir(Long clienteId, Predicate<ItemCarrinho> deveSair) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(clienteId, erros);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }

    List<ItemCarrinho> alvo = itemCarrinhoRepository.findByClienteIdOrderByIdAsc(clienteId)
        .stream().filter(deveSair).toList();
    for (ItemCarrinho item : alvo) {
      itemCarrinhoRepository.delete(item);
      registrar(OperacaoLog.EXCLUIR, item, cliente.getEmail());
    }
    return montar(clienteId);
  }

  /** RN0044 e RN0045: vencido o prazo da última inclusão, todos os itens saem juntos. */
  private void expirar(Cliente cliente) {
    List<ItemCarrinho> ativos = ativos(cliente.getId());
    LocalDateTime ultima = ultimaInclusao(ativos);
    if (ultima == null || ultima.isAfter(limite())) {
      return;
    }
    for (ItemCarrinho item : ativos) {
      item.setIsExpirado(true);
      registrar(OperacaoLog.ALTERAR, item, RegistradorLog.ROTINA_AUTOMATICA);
    }
  }

  private void ajustar(ItemCarrinho item, ConsultaDisponibilidade consulta, List<String> ajustes,
      String usuario) {
    int livre = consulta.getLivres().getOrDefault(item.getDiscoId(), 0);
    if (item.getQuantidade() <= livre) {
      return;
    }
    String titulo = consulta.getItens().stream()
        .filter(conferido -> conferido.getDisco() != null
            && conferido.getDiscoId().equals(item.getDiscoId()))
        .map(ItemPedido::getTitulo).findFirst().orElse("Disco " + item.getDiscoId());
    if (livre == 0) {
      itemCarrinhoRepository.delete(item);
      registrar(OperacaoLog.EXCLUIR, item, usuario);
      ajustes.add(titulo + " saiu do carrinho: não está mais disponível.");
      return;
    }
    ajustes.add(titulo + " passou de " + item.getQuantidade() + " para " + livre
        + " unidade(s), o que há livre em estoque.");
    item.setQuantidade(livre);
    registrar(OperacaoLog.ALTERAR, item, usuario);
  }

  private Carrinho montar(Long clienteId) {
    List<ItemCarrinho> todos = itemCarrinhoRepository.findByClienteIdOrderByIdAsc(clienteId);
    Carrinho carrinho = new Carrinho();
    carrinho.setClienteId(clienteId);
    carrinho.setItens(todos.stream().filter(item -> !Boolean.TRUE.equals(item.getIsExpirado()))
        .toList());
    carrinho.setExpirados(todos.stream().filter(item -> Boolean.TRUE.equals(item.getIsExpirado()))
        .toList());
    carrinho.setPrazoMinutos(prazoMinutos);
    carrinho.setAvisoMinutos(avisoMinutos);
    LocalDateTime ultima = ultimaInclusao(carrinho.getItens());
    if (ultima != null) {
      long segundos = Duration.between(LocalDateTime.now(), ultima.plusMinutes(prazoMinutos))
          .toSeconds();
      carrinho.setSegundosParaExpirar(Math.max(0, segundos));
    }
    return carrinho;
  }

  /** RN0031 e RN0044, pelo EstoqueService: o próprio carrinho não conta contra o cliente. */
  private List<String> disponibilidade(Long clienteId, Long discoId, int quantidade) {
    return estoqueService.conferirDisponibilidade(
        consulta(clienteId, List.of(itemPedido(discoId, quantidade))));
  }

  private static ConsultaDisponibilidade consulta(Long clienteId, List<ItemPedido> itens) {
    ConsultaDisponibilidade consulta = new ConsultaDisponibilidade();
    consulta.setClienteId(clienteId);
    consulta.setItens(new ArrayList<>(itens));
    return consulta;
  }

  private static ItemPedido itemPedido(Long discoId, int quantidade) {
    ItemPedido item = new ItemPedido();
    item.setDiscoId(discoId);
    item.setQuantidade(quantidade);
    return item;
  }

  private List<ItemCarrinho> ativos(Long clienteId) {
    return itemCarrinhoRepository.findByClienteIdOrderByIdAsc(clienteId).stream()
        .filter(item -> !Boolean.TRUE.equals(item.getIsExpirado())).toList();
  }

  private static LocalDateTime ultimaInclusao(List<ItemCarrinho> itens) {
    return itens.stream().map(ItemCarrinho::getDataInclusao).max(LocalDateTime::compareTo)
        .orElse(null);
  }

  private LocalDateTime limite() {
    return LocalDateTime.now().minusMinutes(prazoMinutos);
  }

  /** RF0023: cadastro inativo não compra. */
  private Cliente cliente(Long clienteId, List<String> erros) {
    Cliente cliente =
        clienteId == null ? null : clienteRepository.findById(clienteId).orElse(null);
    if (cliente == null) {
      erros.add("Cliente não encontrado.");
    } else if (!Boolean.TRUE.equals(cliente.getIsAtivo())) {
      erros.add("Cadastro inativo. Procure a curadoria.");
    }
    return cliente;
  }

  private static void conferirItem(ItemCarrinho entrada, List<String> erros) {
    if (entrada.getDiscoId() == null) {
      erros.add("Informe o disco.");
    }
    if (entrada.getQuantidade() == null || entrada.getQuantidade() < 1) {
      erros.add("Informe uma quantidade maior que zero.");
    }
  }

  private void registrar(String operacao, ItemCarrinho item, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("clienteId", item.getClienteId());
    dados.put("discoId", item.getDiscoId());
    dados.put("quantidade", item.getQuantidade());
    dados.put("isExpirado", item.getIsExpirado());
    dados.put("dataInclusao", String.valueOf(item.getDataInclusao()));
    registradorLog.registrar(operacao, ItemCarrinho.class.getSimpleName(), item.getId(), dados,
        usuario);
  }
}
