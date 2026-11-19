package br.com.rpm33.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Disco;
import br.com.rpm33.model.DiscoFiltro;
import br.com.rpm33.model.MotivoStatus;
import br.com.rpm33.service.DiscoService;

@RestController
@RequestMapping("/api/discos")
public class DiscoController {

  private final DiscoService discoService;

  public DiscoController(DiscoService discoService) {
    this.discoService = discoService;
  }

  /** RF0015 */
  @GetMapping
  public List<Disco> consultar(@ModelAttribute DiscoFiltro filtro) {
    return discoService.consultar(filtro);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Disco> buscar(@PathVariable Long id) {
    return ResponseEntity.of(discoService.buscar(id));
  }

  /** RF0011 */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Disco cadastrar(@RequestBody Disco disco) {
    return discoService.cadastrar(disco);
  }

  /** RF0014 e RN0014 */
  @PutMapping("/{id}")
  public Disco alterar(@PathVariable Long id, @RequestBody Disco disco) {
    return discoService.alterar(id, disco);
  }

  /** RF0012 e RN0015: inativação lógica. O disco não é apagado. */
  @PutMapping("/{id}/inativacao")
  public Disco inativar(@PathVariable Long id, @RequestBody(required = false) Disco disco) {
    return discoService.inativar(id, motivo(disco));
  }

  /** RF0016 e RN0017 */
  @PutMapping("/{id}/ativacao")
  public Disco ativar(@PathVariable Long id, @RequestBody(required = false) Disco disco) {
    return discoService.ativar(id, motivo(disco));
  }

  /** RF0013 e RN0016: o disparo manual da rotina, pelo botão da curadoria. */
  @PostMapping("/inativacao-automatica")
  public List<Disco> inativarParados() {
    return discoService.inativarParados();
  }

  private static MotivoStatus motivo(Disco corpo) {
    return corpo == null ? null : corpo.getMotivoStatus();
  }
}
