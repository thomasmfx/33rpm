package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.service.DominioService;

/** RNF0013: as listas de domínio que os formulários oferecem. */
@RestController
@RequestMapping("/api/dominios")
public class DominioController {

  private final DominioService dominioService;

  public DominioController(DominioService dominioService) {
    this.dominioService = dominioService;
  }

  @GetMapping
  public Map<String, Object> listar() {
    return dominioService.listar();
  }
}
