package br.com.rpm33.controller;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import br.com.rpm33.model.Cartao;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.service.PedidoService;
import br.com.rpm33.service.RegraNegocioException;

/**
 * As compras dos clientes de demonstração: a análise de vendas e a curadoria abrem com
 * pedidos de várias categorias, meses e status. Cada compra entra pelas regras da loja
 * (cotação, pedido, validação do pagamento e passos do administrador, tudo pelo PedidoService)
 * e só a data é movida depois, porque o banco carimba a compra com a hora de agora. Roda
 * na subida quando não há pedido, depois do acervo; o POST /api/dev/reset zera os pedidos,
 * e reiniciar o backend os recarrega. Compra de cliente que não existe mais é pulada.
 * Primeiro o histórico de datas fixas, depois as compras recentes, relativas a hoje.
 */
@Component
@Profile("dev")
@Order(2)
public class CargaVendas implements ApplicationRunner {

  /**
   * Os testes de interface montam a mesma massa a partir deste arquivo, e a regressão da
   * análise confere os valores dela: mudou o arquivo, mudam os valores esperados.
   */
  private static final String ARQUIVO = "carga/vendas.json";

  /** De 01/2024 a 11/2026, em datas fixas, para o dashboard; os testes não o usam. */
  private static final String HISTORICO = "carga/vendas-historico.json";

  /** O número que a operadora simulada recusa (app.operadora.cartoes-recusados). */
  private static final String NUMERO_RECUSADO = "4000000000000002";
  /** Para quem não tem cartão no perfil: um número que a operadora aceita. */
  private static final String NUMERO_ACEITO = "4111111111111111";

  private final PedidoService pedidoService;
  private final ClienteRepository clienteRepository;
  private final DiscoRepository discoRepository;
  private final PedidoRepository pedidoRepository;
  private final ObjectMapper objectMapper;

  public CargaVendas(PedidoService pedidoService, ClienteRepository clienteRepository,
      DiscoRepository discoRepository, PedidoRepository pedidoRepository,
      ObjectMapper objectMapper) {
    this.pedidoService = pedidoService;
    this.clienteRepository = clienteRepository;
    this.discoRepository = discoRepository;
    this.pedidoRepository = pedidoRepository;
    this.objectMapper = objectMapper;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (pedidoRepository.count() > 0 || discoRepository.count() == 0) {
      return;
    }
    List<String> falhas = carregar();
    if (!falhas.isEmpty()) {
      throw new IllegalStateException("Carga das vendas recusada: " + String.join(" | ", falhas));
    }
  }

  private List<String> carregar() {
    Map<String, Long> discos = discoRepository.findAll().stream()
        .collect(Collectors.toMap(Disco::getTitulo, Disco::getId, (a, b) -> a));

    List<VendaCarga> vendas = new ArrayList<>(ler(HISTORICO));
    vendas.addAll(ler(ARQUIVO));

    List<String> falhas = new ArrayList<>();
    for (VendaCarga venda : vendas) {
      Optional<Cliente> comprador = clienteRepository.findByEmailIgnoreCase(venda.cliente());
      if (comprador.isEmpty()) {
        continue;
      }
      Cliente cliente = comprador.get();
      // o endereço de entrega é o primeiro que atende entrega: Diego tem um só de cobrança
      Long enderecoId = cliente.getEnderecos().stream().filter(e -> e.atende(Endereco.ENTREGA))
          .map(Endereco::getId).min(Long::compare).orElseThrow();
      List<Map<String, Object>> itens = new ArrayList<>();
      for (ItemCarga item : venda.itens()) {
        Long discoId = discos.get(item.titulo());
        if (discoId == null) {
          falhas.add(item.titulo() + ": disco fora do acervo.");
        } else {
          itens.add(Map.of("discoId", discoId, "quantidade", item.quantidade()));
        }
      }
      if (itens.size() == venda.itens().size()) {
        comprar(venda, cliente, Map.of("clienteId", cliente.getId(), "enderecoId", enderecoId,
            "itens", itens), falhas);
      }
    }
    return falhas;
  }

  /** Do carrinho pago ao status da massa, na ordem que a curadoria percorreria. */
  private void comprar(VendaCarga venda, Cliente cliente, Map<String, Object> corpo,
      List<String> falhas) {
    String nome = venda.itens().get(0).titulo();
    Long id;
    try {
      BigDecimal restante =
          pedidoService.cotar(objectMapper.convertValue(corpo, Pedido.class)).getRestante();

      Map<String, Object> pedido = new LinkedHashMap<>(corpo);
      pedido.put("pagamentos", List.of(pagamento(venda, cliente, restante)));
      id = pedidoService.criar(objectMapper.convertValue(pedido, Pedido.class)).getId();

      pedidoService.validarPagamentos();
      if (StatusPedido.EM_TRANSPORTE.equals(venda.status())
          || StatusPedido.ENTREGUE.equals(venda.status())) {
        avancar(id, StatusPedido.EM_TRANSPORTE);
      }
      if (StatusPedido.ENTREGUE.equals(venda.status())) {
        avancar(id, StatusPedido.ENTREGUE);
      }
    } catch (RegraNegocioException e) {
      // a recusa já marcou a transação para desfazer: não há como seguir para a próxima compra
      throw new IllegalStateException("Carga das vendas recusada: " + e.getMensagens().stream()
          .map(mensagem -> nome + ": " + mensagem).collect(Collectors.joining(" | ")), e);
    }
    pedidoRepository.retroagir(id, dataDaVenda(venda));

    String status = pedidoRepository.findById(id).orElseThrow().getStatus().getDescricao();
    if (!status.equals(venda.status())) {
      falhas.add(nome + ": ficou " + status + " em vez de " + venda.status() + ".");
    }
  }

  /** O cartão do perfil paga; a recusada e quem não tem cartão usam um cartão novo, sem salvar. */
  private static Map<String, Object> pagamento(VendaCarga venda, Cliente cliente,
      BigDecimal restante) {
    if (StatusPedido.REPROVADA.equals(venda.status())) {
      return Map.of("cartaoNovo", cartaoNovo(cliente, NUMERO_RECUSADO), "valor", restante);
    }
    return cliente.getCartoes().stream().map(Cartao::getId).min(Long::compare)
        .<Map<String, Object>>map(id -> Map.of("cartaoId", id, "valor", restante))
        .orElseGet(() -> Map.of("cartaoNovo", cartaoNovo(cliente, NUMERO_ACEITO),
            "valor", restante));
  }

  private static Map<String, Object> cartaoNovo(Cliente cliente, String numero) {
    return Map.of("numero", numero, "nomeImpresso", cliente.getNome().toUpperCase(),
        "codigoSeguranca", "123", "bandeira", Map.of("desc", "Visa"));
  }

  private void avancar(Long id, String destino) {
    StatusPedido status = new StatusPedido();
    status.setDescricao(destino);
    pedidoService.avancarStatus(id, status);
  }

  /** A data do histórico, ou o dia 15 do mês relativo, para nenhuma compra cair depois de hoje. */
  private static LocalDateTime dataDaVenda(VendaCarga venda) {
    LocalDate dia = venda.data() != null ? venda.data()
        : LocalDate.now().withDayOfMonth(1).minusMonths(venda.mesesAtras()).withDayOfMonth(15);
    return dia.atTime(12, 0);
  }

  private List<VendaCarga> ler(String caminho) {
    try (InputStream arquivo = new ClassPathResource(caminho).getInputStream()) {
      return objectMapper.readValue(arquivo, new TypeReference<List<VendaCarga>>() {
      });
    } catch (IOException e) {
      throw new UncheckedIOException("Não foi possível ler " + caminho, e);
    }
  }

  /**
   * Uma compra da massa: quem comprou, os discos pelo título, quando e o status final. O
   * histórico traz a data; as compras recentes, há quantos meses.
   */
  record VendaCarga(String cliente, List<ItemCarga> itens, Integer mesesAtras, LocalDate data,
      String status) {
  }

  record ItemCarga(String titulo, int quantidade) {
  }
}
