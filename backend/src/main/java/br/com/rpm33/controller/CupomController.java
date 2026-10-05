package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.CupomFiltro;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/cupons")
public class CupomController {

  private final IFachada fachada;

  public CupomController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** Checkout e Meus cupons: os cupons do cliente, usados e disponíveis. */
  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute CupomFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro()
        ? ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()))
        : ResponseEntity.ok(resultado.getEntidades());
  }
}
