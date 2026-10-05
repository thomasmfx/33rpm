package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.ConsultaDisponibilidade;
import br.com.rpm33.model.EntradaEstoque;
import br.com.rpm33.model.PreviaEntrada;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/estoque")
public class EstoqueController {

  private final IFachada fachada;

  public EstoqueController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0051 e RF0052 */
  @PostMapping("/entradas")
  public ResponseEntity<Object> registrarEntrada(@RequestBody EntradaEstoque entrada) {
    return resposta(fachada.inserir(entrada), HttpStatus.CREATED);
  }

  @GetMapping("/entradas")
  public ResponseEntity<Object> consultarEntradas(
      @RequestParam(required = false) Long discoId) {
    EntradaEstoque filtro = new EntradaEstoque();
    filtro.setDiscoId(discoId);
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  /** RF0052: o preço que a entrada produziria, para a tela mostrar antes de gravar. */
  @PostMapping("/entradas/previa")
  public ResponseEntity<Object> prever(@RequestBody PreviaEntrada previa) {
    return resposta(fachada.consultar(previa), HttpStatus.OK);
  }

  /** RN0031: o carrinho confere cada inclusão e cada mudança de quantidade. */
  @PostMapping("/disponibilidade")
  public ResponseEntity<Object> conferirDisponibilidade(
      @RequestBody ConsultaDisponibilidade consulta) {
    return resposta(fachada.consultar(consulta), HttpStatus.OK);
  }

  private ResponseEntity<Object> resposta(Resultado resultado, HttpStatus sucesso) {
    return resultado.temErro() ? erro(resultado)
        : ResponseEntity.status(sucesso).body(resultado.primeira());
  }

  private ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
