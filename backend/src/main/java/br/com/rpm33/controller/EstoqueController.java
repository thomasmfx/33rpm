package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.EntradaEstoque;
import br.com.rpm33.model.PreviaEntrada;
import br.com.rpm33.service.EstoqueService;

@RestController
@RequestMapping("/api/estoque")
public class EstoqueController {

  private final EstoqueService estoqueService;

  public EstoqueController(EstoqueService estoqueService) {
    this.estoqueService = estoqueService;
  }

  /** RF0051 e RF0052 */
  @PostMapping("/entradas")
  @ResponseStatus(HttpStatus.CREATED)
  public EntradaEstoque registrarEntrada(@RequestBody EntradaEstoque entrada) {
    return estoqueService.registrarEntrada(entrada);
  }

  @GetMapping("/entradas")
  public List<EntradaEstoque> consultarEntradas(@RequestParam(required = false) Long discoId) {
    return estoqueService.consultarEntradas(discoId);
  }

  /** RF0052: o preço que a entrada produziria, para a tela mostrar antes de gravar. */
  @PostMapping("/entradas/previa")
  public PreviaEntrada prever(@RequestBody PreviaEntrada previa) {
    return estoqueService.prever(previa);
  }

  /** RN0031: o carrinho confere cada inclusão e cada mudança de quantidade. */
  @PostMapping("/disponibilidade")
  public ConsultaDisponibilidade conferirDisponibilidade(
      @RequestBody ConsultaDisponibilidade consulta) {
    return estoqueService.validarDisponibilidade(consulta);
  }
}
