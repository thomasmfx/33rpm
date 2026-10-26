package br.com.rpm33.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Carrinho;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.EntidadeDominio;
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
@Service("Carrinho")
public class CarrinhoService implements IService {

  private final ItemCarrinhoRepository itemCarrinhoRepository;
  private final ClienteRepository clienteRepository;
  private final IService estoque;
  private final RegistradorLog registradorLog;
  private final int prazoMinutos;
  private final int avisoMinutos;

  public CarrinhoService(ItemCarrinhoRepository itemCarrinhoRepository,
      ClienteRepository clienteRepository, @Qualifier("Estoque") IService estoque,
      RegistradorLog registradorLog, @Value("${app.carrinho.prazo-minutos}") int prazoMinutos,
      @Value("${app.carrinho.aviso-minutos}") int avisoMinutos) {
    this.itemCarrinhoRepository = itemCarrinhoRepository;
    this.clienteRepository = clienteRepository;
    this.estoque = estoque;
    this.registradorLog = registradorLog;
    this.prazoMinutos = prazoMinutos;
    this.avisoMinutos = avisoMinutos;
  }

  /** RF0031, RF0032, RN0031 e RN0044: soma ao que já está no carrinho e renova o prazo. */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    ItemCarrinho entrada = (ItemCarrinho) entidade;
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(entrada.getClienteId(), erros);
    conferirItem(entrada, erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    expirar(cliente);

    ItemCarrinho atual = itemCarrinhoRepository
        .findByClienteIdAndDiscoId(cliente.getId(), entrada.getDiscoId()).orElse(null);
    // RNF0042: incluir de novo um item expirado recomeça a quantidade, não soma a ela
    boolean noCarrinho = atual != null && !Boolean.TRUE.equals(atual.getIsExpirado());
    int total = entrada.getQuantidade() + (noCarrinho ? atual.getQuantidade() : 0);
    List<String> recusa = disponibilidade(cliente.getId(), entrada.getDiscoId(), total);
    if (!recusa.isEmpty()) {
      return Resultado.erro(recusa);
    }

    ItemCarrinho item = atual == null ? new ItemCarrinho() : atual;
    item.setClienteId(cliente.getId());
    item.setDiscoId(entrada.getDiscoId());
    item.setQuantidade(total);
    item.setIsExpirado(false);
    item.setDataInclusao(LocalDateTime.now());
    itemCarrinhoRepository.save(item);
    registrar(atual == null ? OperacaoLog.INSERIR : OperacaoLog.ALTERAR, item, cliente.getEmail());
    return Resultado.com(montar(cliente.getId()));
  }

  /**
   * RF0032: a quantidade nova de um item. RN0044 (CDU03 A1.3 e O11): aumentar é incluir
   * itens, então o acréscimo fica bloqueado e o prazo recomeça; reduzir não renova. Com o
   * carrinho inteiro, a revalidação da RN0032 antes de seguir para o checkout.
   */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    if (entidade instanceof Carrinho carrinho) {
      return revalidar(carrinho);
    }
    ItemCarrinho entrada = (ItemCarrinho) entidade;
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(entrada.getClienteId(), erros);
    conferirItem(entrada, erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    expirar(cliente);

    ItemCarrinho atual = itemCarrinhoRepository
        .findByClienteIdAndDiscoId(cliente.getId(), entrada.getDiscoId())
        .filter(item -> !Boolean.TRUE.equals(item.getIsExpirado())).orElse(null);
    if (atual == null) {
      return Resultado.erro("O disco não está no carrinho.");
    }
    List<String> recusa =
        disponibilidade(cliente.getId(), entrada.getDiscoId(), entrada.getQuantidade());
    if (!recusa.isEmpty()) {
      return Resultado.erro(recusa);
    }
    if (entrada.getQuantidade() > atual.getQuantidade()) {
      atual.setDataInclusao(LocalDateTime.now());
    }
    atual.setQuantidade(entrada.getQuantidade());
    registrar(OperacaoLog.ALTERAR, atual, cliente.getEmail());
    return Resultado.com(montar(cliente.getId()));
  }

  /** O carrinho como está; o prazo vencido derruba os itens antes de montar. */
  @Override
  @Transactional
  public Resultado consultar(EntidadeDominio entidade) {
    Carrinho filtro = (Carrinho) entidade;
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(filtro.getClienteId(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    expirar(cliente);
    return Resultado.com(montar(cliente.getId()));
  }

  /**
   * RF0031: tira um disco, esvazia o carrinho ou, na RNF0042, dispensa os expirados.
   * Tirar o que já não está lá não é erro: a compra também limpa o carrinho.
   */
  @Override
  @Transactional
  public Resultado excluir(EntidadeDominio entidade) {
    Long clienteId = entidade instanceof Carrinho carrinho ? carrinho.getClienteId()
        : ((ItemCarrinho) entidade).getClienteId();
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(clienteId, erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    List<ItemCarrinho> alvo = itemCarrinhoRepository.findByClienteIdOrderByIdAsc(clienteId)
        .stream().filter(item -> deveSair(entidade, item)).toList();
    for (ItemCarrinho item : alvo) {
      itemCarrinhoRepository.delete(item);
      registrar(OperacaoLog.EXCLUIR, item, cliente.getEmail());
    }
    return Resultado.com(montar(clienteId));
  }

  /** RN0044 e RN0045: a rotina que desbloqueia os carrinhos com o prazo vencido. */
  @Scheduled(fixedDelayString = "${app.carrinho.intervalo-expiracao}")
  @Transactional
  public void expirarCarrinhosVencidos() {
    for (Long clienteId : itemCarrinhoRepository.clientesComPrazoVencido(limite())) {
      clienteRepository.findById(clienteId).ifPresent(this::expirar);
    }
  }

  private static boolean deveSair(EntidadeDominio pedido, ItemCarrinho item) {
    if (pedido instanceof Carrinho carrinho) {
      return !Boolean.TRUE.equals(carrinho.getApenasExpirados())
          || Boolean.TRUE.equals(item.getIsExpirado());
    }
    return Objects.equals(item.getDiscoId(), ((ItemCarrinho) pedido).getDiscoId());
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

  /**
   * RN0032: entre a inclusão e a compra o estoque livre pode ter mudado (disco inativado,
   * bloqueio de outro cliente depois de um prazo vencido). Reduz o que passou do livre,
   * tira o que zerou e devolve o que mudou para a tela avisar.
   */
  private Resultado revalidar(Carrinho entrada) {
    List<String> erros = new ArrayList<>();
    Cliente cliente = cliente(entrada.getClienteId(), erros);
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    expirar(cliente);
    List<ItemCarrinho> ativos = ativos(cliente.getId());
    List<String> ajustes = new ArrayList<>();
    if (!ativos.isEmpty()) {
      ConsultaDisponibilidade consulta = consulta(cliente.getId(), ativos.stream()
          .map(item -> itemPedido(item.getDiscoId(), item.getQuantidade())).toList());
      estoque.consultar(consulta);
      for (ItemCarrinho item : ativos) {
        ajustar(item, consulta, ajustes, cliente.getEmail());
      }
    }
    Carrinho carrinho = montar(cliente.getId());
    carrinho.setAjustes(ajustes);
    return Resultado.com(carrinho);
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
      ajustes.add("RN0032: " + titulo + " saiu do carrinho: não está mais disponível.");
      return;
    }
    ajustes.add("RN0032: " + titulo + " passou de " + item.getQuantidade() + " para " + livre
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
    return estoque.consultar(consulta(clienteId, List.of(itemPedido(discoId, quantidade))))
        .getMensagens();
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
