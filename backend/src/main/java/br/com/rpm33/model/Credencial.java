package br.com.rpm33.model;

/**
 * E-mail e senha da tela de login. Não é entidade persistente: o SessaoService
 * decide com ela se quem entra é administrador ou cliente.
 */
public class Credencial {

  private String email;
  private String senha;

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
