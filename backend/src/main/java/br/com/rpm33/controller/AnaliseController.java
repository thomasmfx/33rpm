package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.AnaliseVendas;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/analises")
public class AnaliseController {

  private final IFachada fachada;

  public AnaliseController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0055: vendas ENTREGUE por mês e categoria, entre as datas informadas. */
  @GetMapping("/vendas")
  public ResponseEntity<Object> vendas(@ModelAttribute AnaliseVendas consulta) {
    Resultado resultado = fachada.consultar(consulta);
    return resultado.temErro()
        ? ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()))
        : ResponseEntity.ok(resultado.primeira());
  }
}
