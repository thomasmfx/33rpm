package br.com.rpm33.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ClienteFiltro;
import br.com.rpm33.service.IFachada;
import br.com.rpm33.service.Resultado;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

  private final IFachada fachada;

  public ClienteController(IFachada fachada) {
    this.fachada = fachada;
  }

  /** RF0021 */
  @PostMapping
  public ResponseEntity<Object> cadastrar(@RequestBody Cliente cliente) {
    return resposta(fachada.inserir(cliente), HttpStatus.CREATED);
  }

  /** RF0024 */
  @GetMapping
  public ResponseEntity<Object> consultar(@ModelAttribute ClienteFiltro filtro) {
    Resultado resultado = fachada.consultar(filtro);
    if (resultado.temErro()) {
      return erro(resultado);
    }
    return ResponseEntity.ok(resultado.getEntidades());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> buscar(@PathVariable Long id) {
    Cliente alvo = new Cliente();
    alvo.setId(id);
    Resultado resultado = fachada.consultar(alvo);
    return resultado.temErro() ? ResponseEntity.notFound().build()
        : ResponseEntity.ok(resultado.primeira());
  }

  /** RF0022 */
  @PutMapping("/{id}")
  public ResponseEntity<Object> alterar(@PathVariable Long id, @RequestBody Cliente cliente) {
    cliente.setId(id);
    return resposta(fachada.alterar(cliente), HttpStatus.OK);
  }

  /** RF0028: altera só a senha, sem tocar no resto do cadastro. */
  @PutMapping("/{id}/senha")
  public ResponseEntity<Object> alterarSenha(@PathVariable Long id, @RequestBody Cliente cliente) {
    cliente.setId(id);
    return resposta(fachada.alterar(cliente), HttpStatus.OK);
  }

  /** RNF0034: altera só os endereços, sem tocar no resto do cadastro. */
  @PutMapping("/{id}/enderecos")
  public ResponseEntity<Object> alterarEnderecos(@PathVariable Long id,
      @RequestBody Cliente cliente) {
    cliente.setId(id);
    return resposta(fachada.alterar(cliente), HttpStatus.OK);
  }

  /** RF0036: cartões alterados sem tocar no resto do cadastro. */
  @PutMapping("/{id}/cartoes")
  public ResponseEntity<Object> alterarCartoes(@PathVariable Long id,
      @RequestBody Cliente cliente) {
    cliente.setId(id);
    return resposta(fachada.alterar(cliente), HttpStatus.OK);
  }

  /** RF0023: inativação. O cadastro não é apagado. */
  @DeleteMapping("/{id}")
  public ResponseEntity<Object> inativar(@PathVariable Long id) {
    Cliente alvo = new Cliente();
    alvo.setId(id);
    return resposta(fachada.excluir(alvo), HttpStatus.OK);
  }

  @PutMapping("/{id}/ativacao")
  public ResponseEntity<Object> ativar(@PathVariable Long id, @RequestBody Cliente cliente) {
    cliente.setId(id);
    return resposta(fachada.alterar(cliente), HttpStatus.OK);
  }

  /** Autenticação simples: e-mail e senha conferidos contra o hash guardado. */
  @PostMapping("/login")
  public ResponseEntity<Object> entrar(@RequestBody Cliente credenciais) {
    Resultado resultado = fachada.consultar(credenciais);
    return resultado.temErro()
        ? ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("mensagens", resultado.getMensagens()))
        : ResponseEntity.ok(resultado.primeira());
  }

  private ResponseEntity<Object> resposta(Resultado resultado, HttpStatus sucesso) {
    return resultado.temErro() ? erro(resultado)
        : ResponseEntity.status(sucesso).body(resultado.primeira());
  }

  private ResponseEntity<Object> erro(Resultado resultado) {
    return ResponseEntity.badRequest().body(Map.of("mensagens", resultado.getMensagens()));
  }
}
