package br.com.rpm33.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** RN0015 e RN0017: categorias de inativação e de ativação; "OUTRO" existe nas duas. */
@Entity
@Table(name = "categoria_status")
public class CategoriaStatus {

  public static final String INATIVACAO = "inativacao";
  public static final String ATIVACAO = "ativacao";

  /** RN0016: a inativação automática é sempre desta categoria. */
  public static final String FORA_DE_MERCADO = "FORA DE MERCADO";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "desc_categoria", length = 60)
  private String desc;

  @Column(length = 12)
  private String tipo;

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

  public String getTipo() {
    return tipo;
  }

  public void setTipo(String tipo) {
    this.tipo = tipo;
  }
}
