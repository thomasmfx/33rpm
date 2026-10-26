package br.com.rpm33.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

  List<Pedido> findByClienteIdOrderByDataCadastroDescIdDesc(Long clienteId);

  List<Pedido> findAllByOrderByDataCadastroDescIdDesc();

  /** RN0037: os pedidos à espera da validação, os mais antigos primeiro. */
  List<Pedido> findByStatusDescricaoOrderByIdAsc(String status);

  List<Pedido> findByStatusDescricaoAndDataCadastroLessThanEqualOrderByIdAsc(String status,
      LocalDateTime limite);

  /**
   * RN0028 e RN0044: o pedido EM PROCESSAMENTO ainda não baixou o estoque, mas os
   * itens dele já não estão livres para outra compra.
   */
  @Query("select i.discoId, sum(i.quantidade) from ItemPedido i "
      + "where i.discoId in :discoIds and i.pedido.status.descricao = 'EM PROCESSAMENTO' "
      + "group by i.discoId")
  List<Object[]> reservadosEmProcessamento(@Param("discoIds") Collection<Long> discoIds);
}
