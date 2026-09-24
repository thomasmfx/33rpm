package br.com.rpm33.model;

/**
 * E-mail e senha da tela de login. Não é entidade persistente: trafega pela
 * Fachada como filtro e é resolvida pelo SessaoService, que decide se quem
 * entra é administrador ou cliente.
 */
public class Credencial extends EntidadeDominio {

  public static final String NOME_ENTIDADE = "Sessao";

  private String email;
  private String senha;

  @Override
  public String getNomeEntidade() {
    return NOME_ENTIDADE;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getSenha() {
    return senha;
  }

  public void setSenha(String senha) {
    this.senha = senha;
  }
}
