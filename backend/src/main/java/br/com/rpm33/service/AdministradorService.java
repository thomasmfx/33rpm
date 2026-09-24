package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Administrador;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.AdministradorRepository;

/**
 * Regras do administrador da curadoria. Não há cadastro nem exclusão: o
 * administrador vem da carga do banco (db/administradores.sql) e só altera os
 * próprios dados e a senha.
 */
@Service("Administrador")
public class AdministradorService implements IService {

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

  @Override
  public Resultado salvar(EntidadeDominio entidade) {
    return Resultado.erro("O administrador vem da carga do banco; não há cadastro pela API.");
  }

  /** Dados cadastrais ou só a senha, conforme o que veio preenchido (como no cliente). */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    Administrador entrada = (Administrador) entidade;
    Optional<Administrador> encontrado = administradorRepository.findById(entrada.getId());
    if (encontrado.isEmpty()) {
      return Resultado.erro("Administrador não encontrado.");
    }
    Administrador atual = encontrado.get();

    if (apenasSenha(entrada)) {
      List<String> erros = regrasSenha.validar(entrada.getSenha(), entrada.getConfirmarSenha());
      if (!erros.isEmpty()) {
        return Resultado.erro(erros);
      }
      atual.setSenha(encoder.encode(entrada.getSenha()));
      registradorLog.registrar(OperacaoLog.ALTERAR, atual);
      return Resultado.com(atual);
    }

    List<String> erros = validarDados(entrada, atual.getId());
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }
    atual.setNome(entrada.getNome().trim());
    atual.setEmail(entrada.getEmail().trim());
    registradorLog.registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  /** Carga da sessão pelo id ou autenticação por e-mail e senha. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    Administrador administrador = (Administrador) entidade;
    if (administrador.getId() != null) {
      return administradorRepository.findById(administrador.getId())
          .map(Resultado::com)
          .orElseGet(() -> Resultado.erro("Administrador não encontrado."));
    }
    if (administrador.getEmail() != null && administrador.getSenha() != null) {
      return autenticar(administrador.getEmail(), administrador.getSenha());
    }
    return Resultado.erro("Informe o administrador pelo id ou por e-mail e senha.");
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("O administrador não é excluído pela API.");
  }

  private Resultado autenticar(String email, String senha) {
    Optional<Administrador> encontrado = administradorRepository.findByEmailIgnoreCase(email);
    if (encontrado.isEmpty() || !encoder.matches(senha, encontrado.get().getSenha())) {
      return Resultado.erro("E-mail ou senha inválidos.");
    }
    Administrador administrador = encontrado.get();
    if (Boolean.FALSE.equals(administrador.getIsAtivo())) {
      return Resultado.erro("Cadastro inativo. Procure a curadoria.");
    }
    return Resultado.com(administrador);
  }

  private boolean apenasSenha(Administrador entrada) {
    return entrada.getSenha() != null && entrada.getNome() == null && entrada.getEmail() == null;
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
