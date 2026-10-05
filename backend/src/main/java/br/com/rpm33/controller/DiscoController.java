package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Disco;
import br.com.rpm33.model.DiscoFiltro;
import br.com.rpm33.model.InativacaoAutomatica;
import br.com.rpm33.model.MotivoStatus;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/discos")
public class DiscoController {

  private final IFachada fachada;

  public DiscoController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0015 */
  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute DiscoFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> buscar(@PathVariable Long id) {
    Disco alvo = new Disco();
    alvo.setId(id);
    Resultado resultado = fachada.consultar(alvo);
    return resultado.temErro() ? ResponseEntity.notFound().build()
        : ResponseEntity.ok(resultado.primeira());
  }

  /** RF0011 */
  @PostMapping
  public ResponseEntity<Object> cadastrar(@RequestBody Disco disco) {
    return resposta(fachada.inserir(disco), HttpStatus.CREATED);
  }

  /** RF0014 e RN0014 */
  @PutMapping("/{id}")
  public ResponseEntity<Object> alterar(@PathVariable Long id, @RequestBody Disco disco) {
    disco.setId(id);
    // o status só muda pelas rotas próprias, que exigem categoria e justificativa
    disco.setMotivoStatus(null);
    return resposta(fachada.alterar(disco), HttpStatus.OK);
  }

  /** RF0012 e RN0015: inativação lógica. O disco não é apagado. */
  @PutMapping("/{id}/inativacao")
  public ResponseEntity<Object> inativar(@PathVariable Long id,
      @RequestBody(required = false) Disco disco) {
    return resposta(fachada.excluir(somenteStatus(id, disco)), HttpStatus.OK);
  }

  /** RF0016 e RN0017 */
  @PutMapping("/{id}/ativacao")
  public ResponseEntity<Object> ativar(@PathVariable Long id,
      @RequestBody(required = false) Disco disco) {
    return resposta(fachada.alterar(somenteStatus(id, disco)), HttpStatus.OK);
  }

  /** RF0013 e RN0016: o disparo manual da rotina, pelo botão da curadoria. */
  @PostMapping("/inativacao-automatica")
  public ResponseEntity<Object> inativarParados() {
    Resultado resultado = fachada.alterar(new InativacaoAutomatica());
    return resultado.temErro() ? erro(resultado) : ResponseEntity.ok(resultado.getEntidades());
  }

  private Disco somenteStatus(Long id, Disco corpo) {
    Disco alvo = new Disco();
    alvo.setId(id);
    MotivoStatus motivo = corpo == null ? null : corpo.getMotivoStatus();
    alvo.setMotivoStatus(motivo == null ? new MotivoStatus() : motivo);
    return alvo;
  }

  private ResponseEntity<Object> resposta(Resultado resultado, HttpStatus sucesso) {
    return resultado.temErro() ? erro(resultado)
        : ResponseEntity.status(sucesso).body(resultado.primeira());
  }

  private ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
