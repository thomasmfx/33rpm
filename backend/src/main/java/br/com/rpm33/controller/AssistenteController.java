package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.InteracaoAssistente;
import br.com.rpm33.model.MensagemAssistente;
import br.com.rpm33.service.AssistenteService;

/** RNF0044: o chat de recomendação do cliente e o feedback de cada resposta. */
@RestController
@RequestMapping("/api/assistente")
public class AssistenteController {

  private final AssistenteService assistenteService;

  public AssistenteController(AssistenteService assistenteService) {
    this.assistenteService = assistenteService;
  }

  @PostMapping("/mensagens")
  @ResponseStatus(HttpStatus.CREATED)
  public InteracaoAssistente conversar(@RequestBody MensagemAssistente mensagem) {
    return assistenteService.conversar(mensagem);
  }

  /** RNF0044 item 3: { "isUtil": true } para útil, false para não útil. */
  @PutMapping("/interacoes/{id}/avaliacao")
  public InteracaoAssistente avaliar(@PathVariable Long id,
      @RequestBody InteracaoAssistente avaliacao) {
    return assistenteService.avaliar(id, avaliacao.getIsUtil());
  }

  /** avaliacao: util, nao-util ou pendente; sem ela, todas. */
  @GetMapping("/interacoes")
  public List<InteracaoAssistente> listar(@RequestParam(required = false) String avaliacao) {
    return assistenteService.listar(avaliacao);
  }
}
