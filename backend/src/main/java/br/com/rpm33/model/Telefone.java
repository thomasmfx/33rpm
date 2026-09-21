package br.com.rpm33.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** RN0026: o telefone é composto por tipo, DDD e número. */
@Entity
@Table(name = "telefone")
public class Telefone extends EntidadeDominio {

  @JsonIgnore
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cliente_id")
  private Cliente cliente;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "tipo_telefone_id")
  private TipoTelefone tipo;

  @Column(length = 2)
  private String ddd;

  @Column(length = 9)
  private String numero;

  public Cliente getCliente() {
    return cliente;
  }

  public void setCliente(Cliente cliente) {
    this.cliente = cliente;
  }

  public TipoTelefone getTipo() {
    return tipo;
  }

  public void setTipo(TipoTelefone tipo) {
    this.tipo = tipo;
  }

  public String getDdd() {
    return ddd;
  }

  public void setDdd(String ddd) {
    this.ddd = ddd;
  }

  public String getNumero() {
    return numero;
  }

  public void setNumero(String numero) {
    this.numero = numero;
  }
}
