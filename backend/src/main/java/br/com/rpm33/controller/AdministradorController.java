package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/administradores")
public class AdministradorController {

  private final IFachada fachada;

  public AdministradorController(IFachada fachada) {
    this.fachada = fachada;
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> buscar(@PathVariable Long id) {
    Administrador alvo = new Administrador();
    alvo.setId(id);
    Resultado resultado = fachada.consultar(alvo);
    return resultado.temErro() ? ResponseEntity.notFound().build()
        : ResponseEntity.ok(resultado.primeira());
  }

  /** Nome e e-mail do próprio administrador. */
  @PutMapping("/{id}")
  public ResponseEntity<Object> alterar(@PathVariable Long id,
      @RequestBody Administrador administrador) {
    administrador.setId(id);
    administrador.setSenha(null);
    return resposta(fachada.alterar(administrador));
  }

  /** RF0028 para o administrador: a senha muda sozinha. */
  @PutMapping("/{id}/senha")
  public ResponseEntity<Object> alterarSenha(@PathVariable Long id,
      @RequestBody Administrador administrador) {
    Administrador somenteSenha = new Administrador();
    somenteSenha.setId(id);
    somenteSenha.setSenha(administrador.getSenha());
    somenteSenha.setConfirmarSenha(administrador.getConfirmarSenha());
    return resposta(fachada.alterar(somenteSenha));
  }

  private ResponseEntity<Object> resposta(Resultado resultado) {
    return resultado.temErro()
        ? ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()))
        : ResponseEntity.ok(resultado.primeira());
  }
}
