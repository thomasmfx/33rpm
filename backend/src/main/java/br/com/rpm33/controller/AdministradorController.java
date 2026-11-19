package br.com.rpm33.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.service.AdministradorService;

@RestController
@RequestMapping("/api/administradores")
public class AdministradorController {

  private final AdministradorService administradorService;

  public AdministradorController(AdministradorService administradorService) {
    this.administradorService = administradorService;
  }

  @GetMapping("/{id}")
  public ResponseEntity<Administrador> buscar(@PathVariable Long id) {
    return ResponseEntity.of(administradorService.buscar(id));
  }

  /** Nome e e-mail do próprio administrador. */
  @PutMapping("/{id}")
  public Administrador alterar(@PathVariable Long id, @RequestBody Administrador administrador) {
    return administradorService.alterar(id, administrador);
  }

  /** RF0028 para o administrador: a senha muda sozinha. */
  @PutMapping("/{id}/senha")
  public Administrador alterarSenha(@PathVariable Long id,
      @RequestBody Administrador administrador) {
    return administradorService.alterarSenha(id, administrador.getSenha(),
        administrador.getConfirmarSenha());
  }
}
