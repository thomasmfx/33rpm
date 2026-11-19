package br.com.rpm33.controller;

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
import br.com.rpm33.service.CarrinhoService;

/** RF0031, RF0032, RN0032, RN0044 e RNF0042. Toda resposta é o carrinho atualizado. */
@RestController
@RequestMapping("/api/carrinhos/{clienteId}")
public class CarrinhoController {

  private final CarrinhoService carrinhoService;

  public CarrinhoController(CarrinhoService carrinhoService) {
    this.carrinhoService = carrinhoService;
  }

  @GetMapping
  public Carrinho consultar(@PathVariable Long clienteId) {
    return carrinhoService.consultar(clienteId);
  }

  /** Inclusão: soma ao que já está no carrinho e renova o prazo do bloqueio. */
  @PostMapping("/itens")
  public Carrinho incluir(@PathVariable Long clienteId, @RequestBody ItemCarrinho item) {
    item.setClienteId(clienteId);
    return carrinhoService.incluir(item);
  }

  @PutMapping("/itens/{discoId}")
  public Carrinho alterarQuantidade(@PathVariable Long clienteId, @PathVariable Long discoId,
      @RequestBody ItemCarrinho item) {
    item.setClienteId(clienteId);
    item.setDiscoId(discoId);
    return carrinhoService.alterarQuantidade(item);
  }

  @DeleteMapping("/itens/{discoId}")
  public Carrinho remover(@PathVariable Long clienteId, @PathVariable Long discoId) {
    return carrinhoService.remover(clienteId, discoId);
  }

  @DeleteMapping
  public Carrinho esvaziar(@PathVariable Long clienteId) {
    return carrinhoService.esvaziar(clienteId);
  }

  /** RNF0042: dispensa os itens que caíram pelo prazo. */
  @DeleteMapping("/expirados")
  public Carrinho descartarExpirados(@PathVariable Long clienteId) {
    return carrinhoService.descartarExpirados(clienteId);
  }

  /** RN0032: confere o carrinho contra o estoque antes do checkout. */
  @PostMapping("/revalidacao")
  public Carrinho revalidar(@PathVariable Long clienteId) {
    return carrinhoService.revalidar(clienteId);
  }
}
