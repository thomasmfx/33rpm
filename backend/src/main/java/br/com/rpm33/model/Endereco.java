package br.com.rpm33.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** RN0023: composição do endereço. Só observações é opcional. */
@Entity
@Table(name = "endereco")
public class Endereco extends EntidadeDominio {

  /** RN0021 e RN0022: um endereço serve para entrega, cobrança, ou os dois. */
  public static final String ENTREGA = "entrega";
  public static final String COBRANCA = "cobranca";
  public static final String AMBOS = "ambos";

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cliente_id")
  private Cliente cliente;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "cidade_id")
  private Cidade cidade;

  /** RF0026: frase curta que identifica o endereço. */
  @Column(length = 60)
  private String nome;

  @Column(length = 30)
  private String tipo;

  @Column(name = "tipo_residencia", length = 30)
  private String tipoResidencia;

  @Column(name = "tipo_logradouro", length = 30)
  private String tipoLogradouro;

  @Column(length = 120)
  private String logradouro;

  @Column(length = 10)
  private String numero;

  @Column(length = 60)
  private String bairro;

  @Column(length = 8)
  private String cep;

  @Column(length = 40)
  private String pais;

  @Column(columnDefinition = "text")
  private String observacoes;

  public boolean atende(String tipoAlvo) {
    return AMBOS.equals(tipo) || tipoAlvo.equals(tipo);
  }

  public Cliente getCliente() {
    return cliente;
  }

  public void setCliente(Cliente cliente) {
    this.cliente = cliente;
  }

  public Cidade getCidade() {
    return cidade;
  }

  public void setCidade(Cidade cidade) {
    this.cidade = cidade;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getTipo() {
    return tipo;
  }

  public void setTipo(String tipo) {
    this.tipo = tipo;
  }

  public String getTipoResidencia() {
    return tipoResidencia;
  }

  public void setTipoResidencia(String tipoResidencia) {
    this.tipoResidencia = tipoResidencia;
  }

  public String getTipoLogradouro() {
    return tipoLogradouro;
  }

  public void setTipoLogradouro(String tipoLogradouro) {
    this.tipoLogradouro = tipoLogradouro;
  }

  public String getLogradouro() {
    return logradouro;
  }

  public void setLogradouro(String logradouro) {
    this.logradouro = logradouro;
  }

  public String getNumero() {
    return numero;
  }

  public void setNumero(String numero) {
    this.numero = numero;
  }

  public String getBairro() {
    return bairro;
  }

  public void setBairro(String bairro) {
    this.bairro = bairro;
  }

  public String getCep() {
    return cep;
  }

  public void setCep(String cep) {
    this.cep = cep;
  }

  public String getPais() {
    return pais;
  }

  public void setPais(String pais) {
    this.pais = pais;
  }

  public String getObservacoes() {
    return observacoes;
  }

  public void setObservacoes(String observacoes) {
    this.observacoes = observacoes;
  }
}
