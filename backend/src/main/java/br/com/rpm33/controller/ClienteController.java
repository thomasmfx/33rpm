package br.com.rpm33.controller;

import java.util.List;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ClienteFiltro;
import br.com.rpm33.service.ClienteService;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

  private final ClienteService clienteService;

  public ClienteController(ClienteService clienteService) {
    this.clienteService = clienteService;
  }

  /** RF0021 */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Cliente cadastrar(@RequestBody Cliente cliente) {
    return clienteService.cadastrar(cliente);
  }

  /** RF0024 */
  @GetMapping
  public List<Cliente> consultar(@ModelAttribute ClienteFiltro filtro) {
    return clienteService.consultar(filtro);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Cliente> buscar(@PathVariable Long id) {
    return ResponseEntity.of(clienteService.buscar(id));
  }

  /** RF0022 */
  @PutMapping("/{id}")
  public Cliente alterar(@PathVariable Long id, @RequestBody Cliente cliente) {
    return clienteService.alterar(id, cliente);
  }

  /** RF0028: altera só a senha, sem tocar no resto do cadastro. */
  @PutMapping("/{id}/senha")
  public Cliente alterarSenha(@PathVariable Long id, @RequestBody Cliente cliente) {
    return clienteService.alterarSenha(id, cliente.getSenha(), cliente.getConfirmarSenha());
  }

  /** RNF0034: altera só os endereços, sem tocar no resto do cadastro. */
  @PutMapping("/{id}/enderecos")
  public Cliente alterarEnderecos(@PathVariable Long id, @RequestBody Cliente cliente) {
    return clienteService.alterarEnderecos(id, cliente.getEnderecos());
  }

  /** RF0036: cartões alterados sem tocar no resto do cadastro. */
  @PutMapping("/{id}/cartoes")
  public Cliente alterarCartoes(@PathVariable Long id, @RequestBody Cliente cliente) {
    return clienteService.alterarCartoes(id, cliente.getCartoes());
  }

  /** RNF0044: só os gêneros e estilos preferidos, sem tocar no resto do cadastro. */
  @PutMapping("/{id}/preferencias")
  public Cliente alterarPreferencias(@PathVariable Long id, @RequestBody Cliente cliente) {
    return clienteService.alterarPreferencias(id, cliente.getPreferencias());
  }

  /** RF0023: inativação. O cadastro não é apagado. */
  @DeleteMapping("/{id}")
  public Cliente inativar(@PathVariable Long id) {
    return clienteService.inativar(id);
  }

  @PutMapping("/{id}/ativacao")
  public Cliente ativar(@PathVariable Long id) {
    return clienteService.ativar(id);
  }

  /** Autenticação simples: e-mail e senha conferidos contra o hash guardado. */
  @PostMapping("/login")
  public Cliente entrar(@RequestBody Cliente credenciais) {
    return clienteService.autenticar(credenciais.getEmail(), credenciais.getSenha());
  }
}
