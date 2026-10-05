package br.com.rpm33.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * RF0035 e RN0023: cópia do endereço de entrega no momento da compra. Editar ou
 * remover o endereço do perfil depois não muda o pedido.
 */
@Embeddable
public class EnderecoEntrega {

  @Column(name = "entrega_nome", length = 60)
  private String nome;

  @Column(name = "entrega_tipo_residencia", length = 30)
  private String tipoResidencia;

  @Column(name = "entrega_tipo_logradouro", length = 30)
  private String tipoLogradouro;

  @Column(name = "entrega_logradouro", length = 120)
  private String logradouro;

  @Column(name = "entrega_numero", length = 10)
  private String numero;

  @Column(name = "entrega_bairro", length = 60)
  private String bairro;

  @Column(name = "entrega_cep", length = 8)
  private String cep;

  @Column(name = "entrega_cidade", length = 80)
  private String cidade;

  @Column(name = "entrega_uf", length = 2)
  private String uf;

  @Column(name = "entrega_pais", length = 40)
  private String pais;

  @Column(name = "entrega_observacoes", columnDefinition = "text")
  private String observacoes;

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
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

  public String getCidade() {
    return cidade;
  }

  public void setCidade(String cidade) {
    this.cidade = cidade;
  }

  public String getUf() {
    return uf;
  }

  public void setUf(String uf) {
    this.uf = uf;
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
