package br.com.rpm33.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** RN0033: só um PROMOCIONAL por compra; os de TROCA se combinam. */
@Entity
@Table(name = "tipo_cupom")
public class TipoCupom {

  public static final String TROCA = "TROCA";
  public static final String PROMOCIONAL = "PROMOCIONAL";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "desc_tipo", length = 40)
  private String desc;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getDesc() {
    return desc;
  }

  public void setDesc(String desc) {
    this.desc = desc;
  }
}
