package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.CotacaoPedido;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.PedidoFiltro;
import br.com.rpm33.service.PedidoService;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

  private final PedidoService pedidoService;

  public PedidoController(PedidoService pedidoService) {
    this.pedidoService = pedidoService;
  }

  /** RF0033 a RF0038 */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Pedido criar(@RequestBody Pedido pedido) {
    return pedidoService.criar(pedido);
  }

  /** Checkout: os valores e as pendências do pedido como está, sem gravar nada. */
  @PostMapping("/cotacao")
  public CotacaoPedido cotar(@RequestBody Pedido pedido) {
    return pedidoService.cotar(pedido);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Pedido> buscar(@PathVariable Long id) {
    return ResponseEntity.of(pedidoService.buscar(id));
  }

  /** Meus pedidos, com clienteId; sem ele, todos, para a curadoria. */
  @GetMapping
  public List<Pedido> consultar(@ModelAttribute PedidoFiltro filtro) {
    return pedidoService.consultar(filtro);
  }

  /** RN0039 (EM TRANSPORTE) e RN0040 (ENTREGUE), pelo administrador. */
  @PutMapping("/{id}/status")
  public Pedido avancar(@PathVariable Long id, @RequestBody Pedido pedido) {
    return pedidoService.avancarStatus(id, pedido.getStatus());
  }

  /** RN0037 e RN0038: valida agora os pagamentos pendentes, sem esperar a operadora. */
  @PostMapping("/validacao-pagamento")
  public List<Pedido> validarPagamentos() {
    return pedidoService.validarPagamentos();
  }
}
