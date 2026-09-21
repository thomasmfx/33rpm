package br.com.rpm33.model;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "cliente")
public class Cliente extends EntidadeDominio {

  /** RNF0035: código único, no formato CLI-000001. */
  @Column(length = 20)
  private String codigo;

  @Column(length = 120)
  private String nome;

  @Column(length = 120)
  private String email;

  @Column(length = 11)
  private String cpf;

  @Column(name = "data_nascimento")
  private LocalDate dataNascimento;

  /** RNF0033: guardado como hash BCrypt e nunca devolvido em resposta. */
  @Column(length = 72)
  @JsonProperty(access = Access.WRITE_ONLY)
  private String senha;

  /** RNF0032: segunda digitação, conferida no serviço e nunca persistida. */
  @Transient
  @JsonProperty(access = Access.WRITE_ONLY)
  private String confirmarSenha;

  /** RN0027: atribuído pelo perfil de compra; sem pedidos no banco, permanece 0. */
  private Integer ranking;

  @Column(name = "is_ativo")
  private Boolean isAtivo;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "genero_id")
  private Genero genero;

  @OneToOne(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private Telefone telefone;

  // Set, e não List: duas coleções EAGER em lista quebram o plano de busca do Hibernate
  @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private Set<Endereco> enderecos = new LinkedHashSet<>();

  @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private Set<Cartao> cartoes = new LinkedHashSet<>();

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

  public String getCpf() {
    return cpf;
  }

  public void setCpf(String cpf) {
    this.cpf = cpf;
  }

  public LocalDate getDataNascimento() {
    return dataNascimento;
  }

  public void setDataNascimento(LocalDate dataNascimento) {
    this.dataNascimento = dataNascimento;
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

  public Integer getRanking() {
    return ranking;
  }

  public void setRanking(Integer ranking) {
    this.ranking = ranking;
  }

  public Boolean getIsAtivo() {
    return isAtivo;
  }

  public void setIsAtivo(Boolean isAtivo) {
    this.isAtivo = isAtivo;
  }

  public Genero getGenero() {
    return genero;
  }

  public void setGenero(Genero genero) {
    this.genero = genero;
  }

  public Telefone getTelefone() {
    return telefone;
  }

  public void setTelefone(Telefone telefone) {
    this.telefone = telefone;
  }

  public Set<Endereco> getEnderecos() {
    return enderecos;
  }

  public void setEnderecos(Set<Endereco> enderecos) {
    this.enderecos = enderecos;
  }

  public Set<Cartao> getCartoes() {
    return cartoes;
  }

  public void setCartoes(Set<Cartao> cartoes) {
    this.cartoes = cartoes;
  }
}
