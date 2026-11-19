package br.com.rpm33.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Credencial;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.repository.AdministradorRepository;

/**
 * Login único da loja: o e-mail decide se quem entra é administrador ou
 * cliente. Autenticação simples, sem token: a proteção da curadoria é de rota,
 * na interface (ver CLAUDE.md, delimitações de escopo).
 */
@Service
public class SessaoService {

  private final AdministradorService administradorService;
  private final ClienteService clienteService;
  private final AdministradorRepository administradorRepository;

  public SessaoService(AdministradorService administradorService, ClienteService clienteService,
      AdministradorRepository administradorRepository) {
    this.administradorService = administradorService;
    this.clienteService = clienteService;
    this.administradorRepository = administradorRepository;
  }

  /**
   * E-mail de administrador vai para o serviço do administrador; qualquer outro,
   * para o do cliente, que mantém as mensagens de senha errada e de inativo.
   */
  @Transactional(readOnly = true)
  public EntidadeDominio entrar(Credencial credencial) {
    if (credencial.getEmail() == null || credencial.getSenha() == null) {
      throw new AutenticacaoException("Informe e-mail e senha.");
    }
    if (administradorRepository.existsByEmailIgnoreCase(credencial.getEmail())) {
      return administradorService.autenticar(credencial.getEmail(), credencial.getSenha());
    }
    return clienteService.autenticar(credencial.getEmail(), credencial.getSenha());
  }
}
