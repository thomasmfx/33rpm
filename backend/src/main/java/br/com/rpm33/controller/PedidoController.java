package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.CotacaoPedido;
import br.com.rpm33.model.Pedido;
import br.com.rpm33.model.PedidoFiltro;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

  private final IFachada fachada;

  public PedidoController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0033 a RF0038 */
  @PostMapping
  public ResponseEntity<Object> criar(@RequestBody Pedido pedido) {
    return resposta(fachada.inserir(pedido), HttpStatus.CREATED);
  }

  /** Checkout: os valores e as pendências do pedido como está, sem gravar nada. */
  @PostMapping("/cotacao")
  public ResponseEntity<Object> cotar(@RequestBody Pedido pedido) {
    CotacaoPedido cotacao = new CotacaoPedido();
    cotacao.setPedido(pedido);
    return resposta(fachada.consultar(cotacao), HttpStatus.OK);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> buscar(@PathVariable Long id) {
    Pedido alvo = new Pedido();
    alvo.setId(id);
    Resultado resultado = fachada.consultar(alvo);
    return resultado.temErro() ? ResponseEntity.notFound().build()
        : ResponseEntity.ok(resultado.primeira());
  }

  /** Meus pedidos */
  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute PedidoFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  private ResponseEntity<Object> resposta(Resultado resultado, HttpStatus sucesso) {
    return resultado.temErro() ? erro(resultado)
        : ResponseEntity.status(sucesso).body(resultado.primeira());
  }

  private ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
