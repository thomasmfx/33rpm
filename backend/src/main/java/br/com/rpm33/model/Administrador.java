package br.com.rpm33.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/**
 * Quem opera a curadoria. Tabela própria: o administrador não tem CPF, endereço
 * nem cartão, então não cabe nas regras do cadastro de cliente (RN0021 a RN0026).
 */
@Entity
@Table(name = "administrador")
public class Administrador extends EntidadeDominio {

  @Column(length = 20)
  private String codigo;

  @Column(length = 120)
  private String nome;

  @Column(length = 120)
  private String email;

  /** RNF0033: só o hash BCrypt é guardado, e ele nunca sai na resposta. */
  @Column(length = 72)
  @JsonProperty(access = Access.WRITE_ONLY)
  private String senha;

  /** RNF0032: só existe na requisição, para conferir a digitação. */
  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private String confirmarSenha;

  @Column(name = "is_ativo")
  private Boolean isAtivo;

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
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

  public String getConfirmarSenha() {
    return confirmarSenha;
  }

  public void setConfirmarSenha(String confirmarSenha) {
    this.confirmarSenha = confirmarSenha;
  }

  public Boolean getIsAtivo() {
    return isAtivo;
  }

  public void setIsAtivo(Boolean isAtivo) {
    this.isAtivo = isAtivo;
  }
}
