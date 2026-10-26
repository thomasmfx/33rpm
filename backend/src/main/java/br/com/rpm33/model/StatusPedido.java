package br.com.rpm33.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "status_pedido")
public class StatusPedido {

  /** RF0038: todo pedido nasce neste status. */
  public static final String EM_PROCESSAMENTO = "EM PROCESSAMENTO";
  /** RN0038: o resultado da validação do pagamento. */
  public static final String APROVADA = "APROVADA";
  public static final String REPROVADA = "REPROVADA";
  public static final String EM_TRANSPORTE = "EM TRANSPORTE";
  public static final String ENTREGUE = "ENTREGUE";
  /** RN0041 a RN0042: valem para o pedido de troca e para a compra trocada inteira. */
  public static final String EM_TROCA = "EM TROCA";
  public static final String TROCA_AUTORIZADA = "TROCA AUTORIZADA";
  public static final String TROCADO = "TROCADO";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(length = 40)
  private String descricao;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getDescricao() {
    return descricao;
  }

  public void setDescricao(String descricao) {
    this.descricao = descricao;
  }
}
