package br.com.rpm33.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Notificacao;
import br.com.rpm33.model.NotificacaoFiltro;
import br.com.rpm33.service.NotificacaoService;

/** RN0046 */
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

  private final NotificacaoService notificacaoService;

  public NotificacaoController(NotificacaoService notificacaoService) {
    this.notificacaoService = notificacaoService;
  }

  @GetMapping
  public List<Notificacao> consultar(@ModelAttribute NotificacaoFiltro filtro) {
    return notificacaoService.consultar(filtro);
  }

  @PutMapping("/{id}/leitura")
  public Notificacao marcarComoLida(@PathVariable Long id) {
    return notificacaoService.marcarComoLida(id);
  }
}
