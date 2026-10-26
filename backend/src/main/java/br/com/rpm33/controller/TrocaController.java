package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Troca;
import br.com.rpm33.model.TrocaFiltro;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/trocas")
public class TrocaController {

  private final IFachada fachada;

  public TrocaController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0041: troca de itens ou da compra inteira. */
  @PostMapping
  public ResponseEntity<Object> solicitar(@RequestBody Troca troca) {
    Resultado resultado = fachada.inserir(troca);
    return resultado.temErro() ? erro(resultado)
        : ResponseEntity.status(HttpStatus.CREATED).body(resultado.primeira());
  }

  /** RF0043: filtros status, clienteId e pedidoId. */
  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute TrocaFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  /** RF0042 (TROCA AUTORIZADA) e RF0044 (TROCADO, com retornoEstoque). */
  @PutMapping("/{id}/status")
  public ResponseEntity<Object> avancar(@PathVariable Long id, @RequestBody Troca troca) {
    troca.setId(id);
    Resultado resultado = fachada.alterar(troca);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.primeira());
  }

  private static ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
