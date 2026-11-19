package br.com.rpm33.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.CupomFiltro;
import br.com.rpm33.service.CupomService;

@RestController
@RequestMapping("/api/cupons")
public class CupomController {

  private final CupomService cupomService;

  public CupomController(CupomService cupomService) {
    this.cupomService = cupomService;
  }

  /** Checkout e Meus cupons: os cupons do cliente, usados e disponíveis. */
  @GetMapping
  public List<Cupom> consultar(@ModelAttribute CupomFiltro filtro) {
    return cupomService.consultar(filtro);
  }
}
