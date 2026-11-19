package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.Credencial;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.service.SessaoService;

@RestController
@RequestMapping("/api/sessoes")
public class SessaoController {

  private final SessaoService sessaoService;

  public SessaoController(SessaoService sessaoService) {
    this.sessaoService = sessaoService;
  }

  /** Login único: devolve quem entrou e com qual papel, para a interface montar a sessão. */
  @PostMapping
  public Map<String, Object> entrar(@RequestBody Credencial credencial) {
    EntidadeDominio usuario = sessaoService.entrar(credencial);
    String papel = usuario instanceof Administrador ? "administrador" : "cliente";
    return Map.of("papel", papel, "usuario", usuario);
  }
}
