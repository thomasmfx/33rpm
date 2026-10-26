package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Carrinho;
import br.com.rpm33.model.ItemCarrinho;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

/** RF0031, RF0032, RN0032, RN0044 e RNF0042. Toda resposta é o carrinho atualizado. */
@RestController
@RequestMapping("/api/carrinhos/{clienteId}")
public class CarrinhoController {

  private final IFachada fachada;

  public CarrinhoController(IFachada fachada) {
    this.fachada = fachada;
  }

  @GetMapping
  public ResponseEntity<Object> consultar(@PathVariable Long clienteId) {
    return resposta(fachada.consultar(carrinho(clienteId, false)));
  }

  /** Inclusão: soma ao que já está no carrinho e renova o prazo do bloqueio. */
  @PostMapping("/itens")
  public ResponseEntity<Object> incluir(@PathVariable Long clienteId,
      @RequestBody ItemCarrinho item) {
    item.setClienteId(clienteId);
    return resposta(fachada.inserir(item));
  }

  @PutMapping("/itens/{discoId}")
  public ResponseEntity<Object> alterarQuantidade(@PathVariable Long clienteId,
      @PathVariable Long discoId, @RequestBody ItemCarrinho item) {
    item.setClienteId(clienteId);
    item.setDiscoId(discoId);
    return resposta(fachada.alterar(item));
  }

  @DeleteMapping("/itens/{discoId}")
  public ResponseEntity<Object> remover(@PathVariable Long clienteId,
      @PathVariable Long discoId) {
    ItemCarrinho item = new ItemCarrinho();
    item.setClienteId(clienteId);
    item.setDiscoId(discoId);
    return resposta(fachada.excluir(item));
  }

  @DeleteMapping
  public ResponseEntity<Object> esvaziar(@PathVariable Long clienteId) {
    return resposta(fachada.excluir(carrinho(clienteId, false)));
  }

  /** RNF0042: dispensa os itens que caíram pelo prazo. */
  @DeleteMapping("/expirados")
  public ResponseEntity<Object> descartarExpirados(@PathVariable Long clienteId) {
    return resposta(fachada.excluir(carrinho(clienteId, true)));
  }

  /** RN0032: confere o carrinho contra o estoque antes do checkout. */
  @PostMapping("/revalidacao")
  public ResponseEntity<Object> revalidar(@PathVariable Long clienteId) {
    return resposta(fachada.alterar(carrinho(clienteId, false)));
  }

  private static Carrinho carrinho(Long clienteId, boolean apenasExpirados) {
    Carrinho carrinho = new Carrinho();
    carrinho.setClienteId(clienteId);
    carrinho.setApenasExpirados(apenasExpirados);
    return carrinho;
  }

  private static ResponseEntity<Object> resposta(Resultado resultado) {
    return resultado.temErro()
        ? ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()))
        : ResponseEntity.ok(resultado.primeira());
  }
}
