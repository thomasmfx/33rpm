package br.com.rpm33.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.AnaliseVendas;
import br.com.rpm33.service.AnaliseService;

@RestController
@RequestMapping("/api/analises")
public class AnaliseController {

  private final AnaliseService analiseService;

  public AnaliseController(AnaliseService analiseService) {
    this.analiseService = analiseService;
  }

  /** RF0055: vendas ENTREGUE por mês e categoria, entre as datas informadas. */
  @GetMapping("/vendas")
  public AnaliseVendas vendas(@ModelAttribute AnaliseVendas consulta) {
    return analiseService.consultarVendas(consulta);
  }
}
