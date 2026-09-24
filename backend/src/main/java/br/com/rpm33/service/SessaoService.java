package br.com.rpm33.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Credencial;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.repository.AdministradorRepository;

/**
 * Login único da loja: o e-mail decide se quem entra é administrador ou
 * cliente. Autenticação simples, sem token: a proteção da curadoria é de rota,
 * na interface (ver CLAUDE.md, delimitações de escopo).
 */
@Service(Credencial.NOME_ENTIDADE)
public class SessaoService implements IService {

  private final IService administradores;
  private final IService clientes;
  private final AdministradorRepository administradorRepository;

  public SessaoService(@Qualifier("Administrador") IService administradores,
      @Qualifier("Cliente") IService clientes, AdministradorRepository administradorRepository) {
    this.administradores = administradores;
    this.clientes = clientes;
    this.administradorRepository = administradorRepository;
  }

  @Override
  public Resultado salvar(EntidadeDominio entidade) {
    return Resultado.erro("A sessão só é consultada.");
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return Resultado.erro("A sessão só é consultada.");
  }

  /**
   * E-mail de administrador vai para o serviço do administrador; qualquer outro,
   * para o do cliente, que mantém as mensagens de senha errada e de inativo.
   */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    Credencial credencial = (Credencial) entidade;
    if (credencial.getEmail() == null || credencial.getSenha() == null) {
      return Resultado.erro("Informe e-mail e senha.");
    }

    if (administradorRepository.existsByEmailIgnoreCase(credencial.getEmail())) {
      Administrador administrador = new Administrador();
      administrador.setEmail(credencial.getEmail());
      administrador.setSenha(credencial.getSenha());
      return administradores.consultar(administrador);
    }

    Cliente cliente = new Cliente();
    cliente.setEmail(credencial.getEmail());
    cliente.setSenha(credencial.getSenha());
    return clientes.consultar(cliente);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("A sessão só é consultada.");
  }
}
