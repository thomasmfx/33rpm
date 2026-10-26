package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Notificacao;
import br.com.rpm33.model.NotificacaoFiltro;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

/** RN0046 */
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

  private final IFachada fachada;

  public NotificacaoController(IFachada fachada) {
    this.fachada = fachada;
  }

  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute NotificacaoFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  @PutMapping("/{id}/leitura")
  public ResponseEntity<Object> marcarComoLida(@PathVariable Long id) {
    Notificacao notificacao = new Notificacao();
    notificacao.setId(id);
    notificacao.setIsLida(true);
    Resultado resultado = fachada.alterar(notificacao);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.primeira());
  }

  private static ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
