package br.com.rpm33.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.rpm33.service.AutenticacaoException;
import br.com.rpm33.service.RegraNegocioException;

/** As recusas dos serviços chegam à interface como { "mensagens": [...] }. */
@RestControllerAdvice
public class TratadorDeErros {

  @ExceptionHandler(AutenticacaoException.class)
  public ResponseEntity<Map<String, List<String>>> autenticacao(AutenticacaoException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(Map.of("mensagens", e.getMensagens()));
  }

  @ExceptionHandler(RegraNegocioException.class)
  public ResponseEntity<Map<String, List<String>>> regraNegocio(RegraNegocioException e) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", e.getMensagens()));
  }
}
