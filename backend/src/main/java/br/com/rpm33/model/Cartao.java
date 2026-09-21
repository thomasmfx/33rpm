package br.com.rpm33.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** RN0024: número, nome impresso, bandeira e código de segurança. */
@Entity
@Table(name = "cartao")
public class Cartao extends EntidadeDominio {

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cliente_id")
  private Cliente cliente;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "bandeira_cartao_id")
  private BandeiraCartao bandeira;

  @Column(length = 20)
  private String numero;

  @Column(name = "nome_impresso", length = 80)
  private String nomeImpresso;

  @Column(name = "codigo_seguranca", length = 4)
  private String codigoSeguranca;

  @Column(name = "is_preferencial")
  private Boolean isPreferencial;

  public Cliente getCliente() {
    return cliente;
  }

  public void setCliente(Cliente cliente) {
    this.cliente = cliente;
  }

  public BandeiraCartao getBandeira() {
    return bandeira;
  }

  public void setBandeira(BandeiraCartao bandeira) {
    this.bandeira = bandeira;
  }

  public String getNumero() {
    return numero;
  }

  public void setNumero(String numero) {
    this.numero = numero;
  }

  public String getNomeImpresso() {
    return nomeImpresso;
  }

  public void setNomeImpresso(String nomeImpresso) {
    this.nomeImpresso = nomeImpresso;
  }

  public String getCodigoSeguranca() {
    return codigoSeguranca;
  }

  public void setCodigoSeguranca(String codigoSeguranca) {
    this.codigoSeguranca = codigoSeguranca;
  }

  public Boolean getIsPreferencial() {
    return isPreferencial;
  }

  public void setIsPreferencial(Boolean isPreferencial) {
    this.isPreferencial = isPreferencial;
  }
}
