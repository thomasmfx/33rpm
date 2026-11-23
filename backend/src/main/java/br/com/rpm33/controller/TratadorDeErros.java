package br.com.rpm33.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.rpm33.service.AutenticacaoException;
import br.com.rpm33.service.IaIndisponivelException;
import br.com.rpm33.service.RegraNegocioException;

/** As recusas dos serviços chegam à interface como { "mensagens": [...] }. */
@RestControllerAdvice
public class TratadorDeErros {

  private static final Logger LOG = LoggerFactory.getLogger(TratadorDeErros.class);

  @ExceptionHandler(AutenticacaoException.class)
  public ResponseEntity<Map<String, List<String>>> autenticacao(AutenticacaoException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(Map.of("mensagens", e.getMensagens()));
  }

  @ExceptionHandler(RegraNegocioException.class)
  public ResponseEntity<Map<String, List<String>>> regraNegocio(RegraNegocioException e) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", e.getMensagens()));
  }

  /** O detalhe técnico vai para o log do servidor; o cliente recebe só o aviso. */
  @ExceptionHandler(IaIndisponivelException.class)
  public ResponseEntity<Map<String, List<String>>> iaIndisponivel(IaIndisponivelException e) {
    LOG.warn("Assistente sem resposta da IA: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("mensagens",
        List.of("O assistente não conseguiu responder agora. Tente de novo em instantes.")));
  }
}
