package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.Credencial;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/sessoes")
public class SessaoController {

  private final IFachada fachada;

  public SessaoController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** Login único: devolve quem entrou e com qual papel, para a interface montar a sessão. */
  @PostMapping
  public ResponseEntity<Object> entrar(@RequestBody Credencial credencial) {
    Resultado resultado = fachada.consultar(credencial);
    if (resultado.temErro()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(Map.of("mensagens", resultado.getMensagens()));
    }
    EntidadeDominio usuario = resultado.primeira();
    String papel = usuario instanceof Administrador ? "administrador" : "cliente";
    return ResponseEntity.ok(Map.of("papel", papel, "usuario", usuario));
  }
}
