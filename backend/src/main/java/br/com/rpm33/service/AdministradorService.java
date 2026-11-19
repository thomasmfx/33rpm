package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.AdministradorRepository;

/**
 * Regras do administrador da curadoria. Não há cadastro nem exclusão: o
 * administrador vem da carga do banco (db/administradores.sql) e só altera os
 * próprios dados e a senha.
 */
@Service
public class AdministradorService {

  private static final Pattern EMAIL = Pattern.compile("^\\S+@\\S+\\.\\S+$");

  private final AdministradorRepository administradorRepository;
  private final RegrasSenha regrasSenha;
  private final RegistradorLog registradorLog;
  private final PasswordEncoder encoder;

  public AdministradorService(AdministradorRepository administradorRepository,
      RegrasSenha regrasSenha, RegistradorLog registradorLog, PasswordEncoder encoder) {
    this.administradorRepository = administradorRepository;
    this.regrasSenha = regrasSenha;
    this.registradorLog = registradorLog;
    this.encoder = encoder;
  }

  /** A carga da sessão. */
  @Transactional(readOnly = true)
  public Optional<Administrador> buscar(Long id) {
    return administradorRepository.findById(id);
  }

  /** Nome e e-mail do próprio administrador. */
  @Transactional
  public Administrador alterar(Long id, Administrador entrada) {
    Administrador atual = encontrar(id);
    List<String> erros = validarDados(entrada, atual.getId());
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    atual.setNome(entrada.getNome().trim());
    atual.setEmail(entrada.getEmail().trim());
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  /** RF0028 para o administrador: a senha muda sozinha. */
  @Transactional
  public Administrador alterarSenha(Long id, String senha, String confirmarSenha) {
    Administrador atual = encontrar(id);
    List<String> erros = regrasSenha.validar(senha, confirmarSenha);
    if (!erros.isEmpty()) {
      throw new RegraNegocioException(erros);
    }
    atual.setSenha(encoder.encode(senha));
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return atual;
  }

  @Transactional(readOnly = true)
  public Administrador autenticar(String email, String senha) {
    Optional<Administrador> encontrado = administradorRepository.findByEmailIgnoreCase(email);
    if (encontrado.isEmpty() || !encoder.matches(senha, encontrado.get().getSenha())) {
      throw new AutenticacaoException("E-mail ou senha inválidos.");
    }
    Administrador administrador = encontrado.get();
    if (Boolean.FALSE.equals(administrador.getIsAtivo())) {
      throw new AutenticacaoException("Cadastro inativo. Procure a curadoria.");
    }
    return administrador;
  }

  private Administrador encontrar(Long id) {
    return administradorRepository.findById(id)
        .orElseThrow(() -> new RegraNegocioException("Administrador não encontrado."));
  }

  private List<String> validarDados(Administrador entrada, Long idAtual) {
    List<String> erros = new ArrayList<>();
    if (entrada.getNome() == null || entrada.getNome().trim().length() < 3) {
      erros.add("Informe o nome, com pelo menos 3 letras.");
    }
    if (entrada.getEmail() == null || !EMAIL.matcher(entrada.getEmail().trim()).matches()) {
      erros.add("Informe um e-mail válido.");
    } else if (administradorRepository.existsByEmailIgnoreCaseAndIdNot(
        entrada.getEmail().trim(), idAtual)) {
      erros.add("Já existe um administrador com este e-mail.");
    }
    return erros;
  }
}
