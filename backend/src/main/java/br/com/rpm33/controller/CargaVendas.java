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
import br.com.rpm33.model.CotacaoPedido;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.ProcessamentoPagamentos;
import br.com.rpm33.model.StatusPedido;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.PedidoRepository;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

/**
 * As compras dos clientes de demonstração: a análise de vendas e a curadoria abrem com
 * pedidos de várias categorias, meses e status. Cada compra entra pelas regras da loja
 * (cotação, pedido, validação do pagamento e passos do administrador, tudo pela Fachada)
 * e só a data é movida depois, porque o banco carimba a compra com a hora de agora. Roda
 * na subida quando não há pedido, depois do acervo; o POST /api/dev/reset zera os pedidos,
 * e reiniciar o backend os recarrega. Compra de cliente que não existe mais é pulada.
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

  /** O número que a operadora simulada recusa (app.operadora.cartoes-recusados). */
  private static final String NUMERO_RECUSADO = "4000000000000002";
  /** Para quem não tem cartão no perfil: um número que a operadora aceita. */
  private static final String NUMERO_ACEITO = "4111111111111111";

  private final IFachada fachada;
  private final ClienteRepository clienteRepository;
  private final DiscoRepository discoRepository;
  private final PedidoRepository pedidoRepository;
  private final ObjectMapper objectMapper;

  public CargaVendas(IFachada fachada, ClienteRepository clienteRepository,
      DiscoRepository discoRepository, PedidoRepository pedidoRepository,
      ObjectMapper objectMapper) {
    this.fachada = fachada;
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

    List<String> falhas = new ArrayList<>();
    for (VendaCarga venda : ler()) {
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
    CotacaoPedido cotacao = new CotacaoPedido();
    cotacao.setPedido(objectMapper.convertValue(corpo, Pedido.class));
    Resultado cotado = fachada.consultar(cotacao);
    if (cotado.temErro()) {
      cotado.getMensagens().forEach(mensagem -> falhas.add(nome + ": " + mensagem));
      return;
    }
    BigDecimal restante = ((CotacaoPedido) cotado.primeira()).getRestante();

    Map<String, Object> pedido = new LinkedHashMap<>(corpo);
    pedido.put("pagamentos", List.of(pagamento(venda, cliente, restante)));
    Resultado criado = fachada.inserir(objectMapper.convertValue(pedido, Pedido.class));
    if (criado.temErro()) {
      criado.getMensagens().forEach(mensagem -> falhas.add(nome + ": " + mensagem));
      return;
    }
    Long id = criado.primeira().getId();

    fachada.alterar(new ProcessamentoPagamentos());
    if (StatusPedido.EM_TRANSPORTE.equals(venda.status())
        || StatusPedido.ENTREGUE.equals(venda.status())) {
      avancar(id, StatusPedido.EM_TRANSPORTE);
    }
    if (StatusPedido.ENTREGUE.equals(venda.status())) {
      avancar(id, StatusPedido.ENTREGUE);
    }
    pedidoRepository.retroagir(id, dataDaVenda(venda.mesesAtras()));

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
    Pedido alvo = new Pedido();
    alvo.setId(id);
    StatusPedido status = new StatusPedido();
    status.setDescricao(destino);
    alvo.setStatus(status);
    fachada.alterar(alvo);
  }

  /** O dia 15 do mês, para nenhuma compra cair depois de hoje. */
  private static LocalDateTime dataDaVenda(int mesesAtras) {
    return LocalDate.now().withDayOfMonth(1).minusMonths(mesesAtras).withDayOfMonth(15)
        .atTime(12, 0);
  }

  private List<VendaCarga> ler() {
    try (InputStream arquivo = new ClassPathResource(ARQUIVO).getInputStream()) {
      return objectMapper.readValue(arquivo, new TypeReference<List<VendaCarga>>() {
      });
    } catch (IOException e) {
      throw new UncheckedIOException("Não foi possível ler " + ARQUIVO, e);
    }
  }

  /** Uma compra da massa: quem comprou, os discos pelo título, há quantos meses e o status final. */
  record VendaCarga(String cliente, List<ItemCarga> itens, int mesesAtras, String status) {
  }

  record ItemCarga(String titulo, int quantidade) {
  }
}
