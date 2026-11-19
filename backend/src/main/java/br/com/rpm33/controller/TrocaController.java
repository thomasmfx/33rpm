package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Troca;
import br.com.rpm33.model.TrocaFiltro;
import br.com.rpm33.service.TrocaService;

@RestController
@RequestMapping("/api/trocas")
public class TrocaController {

  private final TrocaService trocaService;

  public TrocaController(TrocaService trocaService) {
    this.trocaService = trocaService;
  }

  /** RF0041: troca de itens ou da compra inteira. */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Troca solicitar(@RequestBody Troca troca) {
    return trocaService.solicitar(troca);
  }

  /** RF0043: filtros status, clienteId e pedidoId. */
  @GetMapping
  public List<Troca> consultar(@ModelAttribute TrocaFiltro filtro) {
    return trocaService.consultar(filtro);
  }

  /** RF0042 (TROCA AUTORIZADA) e RF0044 (TROCADO, com retornoEstoque). */
  @PutMapping("/{id}/status")
  public Troca avancar(@PathVariable Long id, @RequestBody Troca troca) {
    return trocaService.avancarStatus(id, troca);
  }
}
